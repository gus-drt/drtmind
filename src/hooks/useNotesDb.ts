import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Note, NoteLink } from '@/types/note';
import { WELCOME_NOTES_DATA } from '@/data/welcomeNotes';
import { toast } from 'sonner';

import {
  getAllNotes as idbGetAll,
  putNote as idbPut,
  deleteNoteFromIDB,
  noteToIDB,
  idbToNote,
  migrateFromLocalStorage,
} from '@/lib/indexedDb';
import { enqueue, processQueue } from '@/lib/syncQueue';

// ─── Constants ──────────────────────────────────────────────────
const ADMIN_EMAIL = 'duartegustavoh@gmail.com';
const FREE_CLOUD_LIMIT = 50;

// ─── Helpers ────────────────────────────────────────────────────

const extractLinks = (content: string): string[] => {
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  const matches: string[] = [];
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  return matches;
};

// Map Supabase row → Note
const mapDbNote = (row: any): Note => ({
  id: row.id,
  title: row.title,
  content: row.content,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
  linkedNotes: extractLinks(row.content),
  pinned: row.pinned,
  pinnedAt: row.pinned_at ? new Date(row.pinned_at) : null,
  isPublic: row.is_public ?? false,
});

// Convert IDBNote → Note (with linked notes)
const idbNoteToNote = (idb: ReturnType<typeof idbToNote>): Note => ({
  ...idb,
  linkedNotes: extractLinks(idb.content),
});

// ─── Hook ───────────────────────────────────────────────────────

export const useNotes = () => {
  const { user } = useAuth();
  const { isOnline, isSyncing, triggerSync } = useOnlineStatus(user?.id);

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [cloudNoteCount, setCloudNoteCount] = useState(0);

  // ─── Derived storage values ──────────────────────────────────
  const isAdmin = user?.email === ADMIN_EMAIL;
  const cloudNoteLimit = isAdmin ? Infinity : FREE_CLOUD_LIMIT;
  const canStoreInCloud = isAdmin || cloudNoteCount < FREE_CLOUD_LIMIT;
  // "useCloud" means the user has cloud access at all (authenticated + supabase available)
  const useCloud = !!user && !!supabase;

  // Debounce timers for cloud saves
  const saveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingUpdatesRef = useRef<Map<string, Partial<Pick<Note, 'title' | 'content'>>>>(new Map());

  useEffect(() => {
    return () => {
      saveTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // ─── Auto-select Índice/Index note ─────────────────────────
  const autoSelectIndex = useCallback(
    (notesList: Note[]) => {
      if (!selectedNoteId) {
        const idx = notesList.find(
          n => /^[ií]ndice$/i.test(n.title.trim()) || /^index$/i.test(n.title.trim())
        );
        if (idx) setSelectedNoteId(idx.id);
      }
    },
    [selectedNoteId]
  );

  // ─── Welcome Notes (Cloud) ────────────────────────────────
  const createWelcomeNotesCloud = useCallback(async () => {
    if (!user || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert(
          WELCOME_NOTES_DATA.map(n => ({
            user_id: user.id,
            title: n.title,
            content: n.content,
            pinned: n.pinned || false,
            pinned_at: n.pinned ? new Date().toISOString() : null,
          }))
        )
        .select();
      if (error) throw error;
      const created = (data || []).map(mapDbNote);

      // Also save to IndexedDB as cache
      for (const note of created) {
        await idbPut(noteToIDB(note, user.id));
      }

      setNotes(created);
      setCloudNoteCount(created.length);
      const idx = created.find(n => n.title === 'Índice');
      if (idx) setSelectedNoteId(idx.id);
    } catch (error) {
      console.error('Error creating welcome notes:', error);
    }
  }, [user]);

  // ─── Welcome Notes (Local/IndexedDB) ──────────────────────
  const createWelcomeNotesLocal = useCallback(
    async (): Promise<Note[]> => {
      if (!user) return [];
      const now = new Date();
      const welcomeNotes: Note[] = WELCOME_NOTES_DATA.map(n => ({
        id: crypto.randomUUID(),
        title: n.title,
        content: n.content,
        createdAt: now,
        updatedAt: now,
        linkedNotes: extractLinks(n.content),
        pinned: n.pinned || false,
        pinnedAt: n.pinned ? now : null,
        isPublic: false,
      }));

      // Persist to IndexedDB
      for (const note of welcomeNotes) {
        await idbPut(noteToIDB(note, user.id));
      }

      return welcomeNotes;
    },
    [user]
  );

  // ─── fetchNotes ────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    try {
      // STEP 1: Migrate from localStorage if needed (one-time, safe)
      await migrateFromLocalStorage(user.id);

      // STEP 2: Load from IndexedDB instantly (offline-first)
      const localIdbNotes = await idbGetAll(user.id);
      const localNotes = localIdbNotes.map(n => idbNoteToNote(idbToNote(n)));

      if (useCloud && isOnline) {
        // ── CLOUD FETCH ──
        try {
          const { data, error } = await supabase!
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

          if (error) throw error;

          const cloudNotes = (data || []).map(mapDbNote);

          if (cloudNotes.length === 0 && localNotes.length === 0) {
            // Brand new user — create welcome notes
            if (canStoreInCloud) {
              await createWelcomeNotesCloud();
            } else {
              const welcome = await createWelcomeNotesLocal();
              setNotes(welcome);
              autoSelectIndex(welcome);
            }
            setLoading(false);
            return;
          }

          // Merge: cloud notes are truth for synced ones, locals for the rest
          // Build a map of all notes (cloud takes precedence for same id)
          const noteMap = new Map<string, Note>();

          // First add all local notes
          for (const note of localNotes) {
            noteMap.set(note.id, note);
          }

          // Then overlay cloud notes (they are the source of truth)
          for (const note of cloudNotes) {
            noteMap.set(note.id, note);
          }

          const mergedNotes = Array.from(noteMap.values());

          // Sync cloud → IndexedDB cache
          for (const note of cloudNotes) {
            await idbPut(noteToIDB(note, user.id));
          }

          setNotes(mergedNotes);
          setCloudNoteCount(cloudNotes.length);
          autoSelectIndex(mergedNotes);
        } catch {
          // Offline fallback: use IndexedDB data
          if (localNotes.length > 0) {
            setNotes(localNotes);
            autoSelectIndex(localNotes);
          }
        }
      } else {
        // ── OFFLINE / LOCAL-ONLY ──
        if (localNotes.length > 0) {
          setNotes(localNotes);
          autoSelectIndex(localNotes);
        } else {
          const welcome = await createWelcomeNotesLocal();
          setNotes(welcome);
          autoSelectIndex(welcome);
        }
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Erro ao carregar notas');
    } finally {
      setLoading(false);
    }
  }, [user, useCloud, isOnline, canStoreInCloud, autoSelectIndex, createWelcomeNotesCloud, createWelcomeNotesLocal]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // ─── saveToDatabase (cloud debounce target) ────────────────
  const saveToDatabase = useCallback(
    async (id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => {
      if (!user) return;

      if (isOnline && supabase) {
        try {
          const { error } = await supabase
            .from('notes')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', user.id);
          if (error) throw error;
        } catch (error) {
          console.error('Error updating note (queueing for retry):', error);
          // Failed to save online → enqueue for later
          await enqueue(id, user.id, 'update', updates);
        }
      } else {
        // Offline → enqueue
        await enqueue(id, user.id, 'update', updates);
      }
    },
    [user, isOnline]
  );

  // ─── createNote ────────────────────────────────────────────
  const createNote = useCallback(
    async (title: string = 'Nova Nota', initialContent?: string) => {
      if (!user) return null;
      const content = initialContent ?? `# ${title}\n\n`;
      const now = new Date();

      const newNote: Note = {
        id: crypto.randomUUID(),
        title,
        content,
        createdAt: now,
        updatedAt: now,
        linkedNotes: extractLinks(content),
        pinned: false,
        pinnedAt: null,
        isPublic: false,
      };

      // 1. Save to IndexedDB immediately (offline-first)
      await idbPut(noteToIDB(newNote, user.id));

      // 2. Update React state
      setNotes(prev => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);

      // 3. Sync to cloud (only if under limit or admin)
      const shouldSyncToCloud = canStoreInCloud && useCloud;

      if (shouldSyncToCloud) {
        if (isOnline && supabase) {
          try {
            const { error } = await supabase
              .from('notes')
              .insert({
                id: newNote.id,
                user_id: user.id,
                title,
                content,
              })
              .select()
              .single();

            if (error) throw error;
            setCloudNoteCount(prev => prev + 1);
          } catch {
            // Failed — enqueue for later
            await enqueue(newNote.id, user.id, 'create', {
              title,
              content,
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
            });
          }
        } else {
          // Offline — enqueue
          await enqueue(newNote.id, user.id, 'create', {
            title,
            content,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          });
        }
      } else if (useCloud && !canStoreInCloud) {
        toast.info(
          `Limite de ${FREE_CLOUD_LIMIT} notas na nuvem atingido. Esta nota foi salva localmente.`,
          { duration: 4000 }
        );
      }

      return newNote;
    },
    [user, useCloud, canStoreInCloud, isOnline]
  );

  // ─── updateNote ────────────────────────────────────────────
  const updateNote = useCallback(
    (id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => {
      // 1. Immediate React state update
      setNotes(prev => {
        const updated = prev.map(note => {
          if (note.id !== id) return note;
          const newContent = updates.content ?? note.content;
          return {
            ...note,
            ...updates,
            linkedNotes: extractLinks(newContent),
            updatedAt: new Date(),
          };
        });
        return updated;
      });

      // 2. Persist to IndexedDB immediately
      if (user) {
        const noteInState = notes.find(n => n.id === id);
        if (noteInState) {
          const updatedNote = {
            ...noteInState,
            ...updates,
            content: updates.content ?? noteInState.content,
            updatedAt: new Date(),
          };
          idbPut(noteToIDB(updatedNote, user.id));
        }
      }

      // 3. Debounced cloud save (only for notes that are already in cloud)
      if (user) {
        const currentPending = pendingUpdatesRef.current.get(id) || {};
        pendingUpdatesRef.current.set(id, { ...currentPending, ...updates });

        const existingTimer = saveTimersRef.current.get(id);
        if (existingTimer) clearTimeout(existingTimer);

        const timer = setTimeout(() => {
          const pendingUpdate = pendingUpdatesRef.current.get(id);
          if (pendingUpdate) {
            saveToDatabase(id, pendingUpdate);
            pendingUpdatesRef.current.delete(id);
          }
          saveTimersRef.current.delete(id);
        }, 500);

        saveTimersRef.current.set(id, timer);
      }
    },
    [user, notes, saveToDatabase]
  );

  // ─── flushPendingUpdates ───────────────────────────────────
  const flushPendingUpdates = useCallback(async () => {
    const promises: Promise<void>[] = [];
    saveTimersRef.current.forEach((timer, id) => {
      clearTimeout(timer);
      const pendingUpdate = pendingUpdatesRef.current.get(id);
      if (pendingUpdate) promises.push(saveToDatabase(id, pendingUpdate));
    });
    saveTimersRef.current.clear();
    pendingUpdatesRef.current.clear();
    await Promise.all(promises);
  }, [saveToDatabase]);

  // ─── deleteNote ────────────────────────────────────────────
  const deleteNote = useCallback(
    async (id: string) => {
      if (!user) return;

      // Clear pending updates
      const timer = saveTimersRef.current.get(id);
      if (timer) {
        clearTimeout(timer);
        saveTimersRef.current.delete(id);
      }
      pendingUpdatesRef.current.delete(id);

      // 1. Delete from IndexedDB immediately
      await deleteNoteFromIDB(id);

      // 2. Update React state
      setNotes(prev => prev.filter(n => n.id !== id));

      // 3. Sync deletion to cloud
      if (isOnline && supabase) {
        try {
          const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);
          if (error) throw error;
          setCloudNoteCount(prev => Math.max(0, prev - 1));
        } catch {
          await enqueue(id, user.id, 'delete', {});
        }
      } else {
        await enqueue(id, user.id, 'delete', {});
      }

      if (selectedNoteId === id) setSelectedNoteId(null);
      toast.success('Nota excluída');
    },
    [user, isOnline, selectedNoteId]
  );

  // ─── togglePinNote ─────────────────────────────────────────
  const togglePinNote = useCallback(
    async (id: string) => {
      if (!user) return;
      const note = notes.find(n => n.id === id);
      if (!note) return;

      const currentPinnedCount = notes.filter(n => n.pinned).length;
      const newPinned = !note.pinned;

      if (newPinned && currentPinnedCount >= 3) {
        toast.error('Você pode fixar no máximo 3 notas');
        return;
      }

      const pinnedAt = newPinned ? new Date() : null;

      // 1. Update React state optimistically
      setNotes(prev => {
        const updated = prev.map(n =>
          n.id === id ? { ...n, pinned: newPinned, pinnedAt } : n
        );
        return updated;
      });

      // 2. Update IndexedDB
      const updatedNote = { ...note, pinned: newPinned, pinnedAt };
      await idbPut(noteToIDB(updatedNote, user.id));

      // 3. Sync to cloud
      if (isOnline && supabase) {
        try {
          const { error } = await supabase
            .from('notes')
            .update({
              pinned: newPinned,
              pinned_at: pinnedAt?.toISOString() ?? null,
            })
            .eq('id', id)
            .eq('user_id', user.id);
          if (error) throw error;
        } catch {
          await enqueue(id, user.id, 'pin', {
            pinned: newPinned,
            pinnedAt: pinnedAt?.toISOString() ?? null,
          });
        }
      } else {
        await enqueue(id, user.id, 'pin', {
          pinned: newPinned,
          pinnedAt: pinnedAt?.toISOString() ?? null,
        });
      }

      toast.success(newPinned ? 'Nota fixada' : 'Nota desafixada');
    },
    [user, isOnline, notes]
  );

  // ─── toggleNotePublic ──────────────────────────────────────
  const toggleNotePublic = useCallback(
    async (id: string) => {
      if (!user) return;
      const note = notes.find(n => n.id === id);
      if (!note) return;

      const newIsPublic = !note.isPublic;

      // 1. Update React state optimistically
      setNotes(prev =>
        prev.map(n => (n.id === id ? { ...n, isPublic: newIsPublic } : n))
      );

      // 2. Update IndexedDB
      const updatedNote = { ...note, isPublic: newIsPublic };
      await idbPut(noteToIDB(updatedNote, user.id));

      // 3. Sync to cloud (direct — not debounced, this is an intentional user action)
      if (isOnline && supabase) {
        try {
          const { error } = await supabase
            .from('notes')
            .update({ is_public: newIsPublic })
            .eq('id', id)
            .eq('user_id', user.id);
          if (error) throw error;
        } catch {
          await enqueue(id, user.id, 'update', { is_public: newIsPublic });
        }
      } else {
        await enqueue(id, user.id, 'update', { is_public: newIsPublic });
      }

      toast.success(
        newIsPublic ? 'Nota pública — link ativo' : 'Nota privada — link revogado'
      );
    },
    [user, isOnline, notes]
  );

  // ─── Computed values ───────────────────────────────────────

  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;
  const pinnedCount = notes.filter(n => n.pinned).length;

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.pinned && b.pinned) {
      return (b.pinnedAt?.getTime() || 0) - (a.pinnedAt?.getTime() || 0);
    }
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  const filteredNotes = sortedNotes.filter(
    note =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── getLinks ──────────────────────────────────────────────

  const getLinks = useCallback((): NoteLink[] => {
    const links: NoteLink[] = [];
    const addedLinks = new Set<string>();

    notes.forEach(note => {
      const linkedTitles = extractLinks(note.content);
      linkedTitles.forEach(linkedTitle => {
        const targetNote = notes.find(
          n => n.title.toLowerCase().trim() === linkedTitle.toLowerCase().trim()
        );
        if (targetNote && targetNote.id !== note.id) {
          const linkKey = [note.id, targetNote.id].sort().join('-');
          if (!addedLinks.has(linkKey)) {
            links.push({ source: note.id, target: targetNote.id });
            addedLinks.add(linkKey);
          }
        }
      });
    });

    return links;
  }, [notes]);

  const getNoteByTitle = useCallback(
    (title: string): Note | undefined => {
      return notes.find(n => n.title.toLowerCase().trim() === title.toLowerCase().trim());
    },
    [notes]
  );

  const navigateToNote = useCallback(
    async (title: string) => {
      await flushPendingUpdates();
      const note = getNoteByTitle(title);
      if (note) {
        setSelectedNoteId(note.id);
      } else {
        const newNote = await createNote(title);
        if (newNote) setSelectedNoteId(newNote.id);
      }
    },
    [getNoteByTitle, createNote, flushPendingUpdates]
  );

  return {
    notes,
    filteredNotes,
    selectedNote,
    selectedNoteId,
    setSelectedNoteId,
    searchQuery,
    setSearchQuery,
    createNote,
    updateNote,
    deleteNote,
    togglePinNote,
    toggleNotePublic,
    pinnedCount,
    getLinks,
    getNoteByTitle,
    navigateToNote,
    flushPendingUpdates,
    loading,
    cloudNoteCount,
    cloudNoteLimit,
    canStoreInCloud,
    useCloud,
    isAdmin,
    isOnline,
    isSyncing,
    triggerSync,
  };
};
