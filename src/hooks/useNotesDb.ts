import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Note, NoteLink } from '@/types/note';
import { toast } from 'sonner';

const extractLinks = (content: string): string[] => {
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  const matches: string[] = [];
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  return matches;
};

export const useNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Debounce timers for saving
  const saveTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingUpdatesRef = useRef<Map<string, Partial<Pick<Note, 'title' | 'content'>>>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      saveTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Fetch notes from database
  const fetchNotes = useCallback(async () => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const notesWithLinks: Note[] = (data || []).map(note => ({
        ...note,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
        linkedNotes: extractLinks(note.content),
      }));

      setNotes(notesWithLinks);

      // Create welcome note if no notes exist
      if (notesWithLinks.length === 0) {
        await createWelcomeNote();
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Erro ao carregar notas');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createWelcomeNote = async () => {
    if (!user) return;

    const welcomeContent = `# Bem-vindo ao MindFlow! 🧠

Este é o seu espaço de notas conectadas.

## Como usar

- **Criar notas**: Clique em "Nova Nota" no painel lateral
- **Conectar notas**: Use \`[[nome da nota]]\` para criar links
- **Navegar**: Clique nos links ou use o grafo visual
- **Markdown**: Use formatação como **negrito**, *itálico*, listas e mais

## Dicas para TDAH

1. Mantenha notas curtas e focadas
2. Use o grafo para visualizar conexões
3. Não se preocupe com organização perfeita
4. Links são melhores que pastas

Experimente criar uma nova nota e linkar ela aqui usando [[sua nova nota]]!`;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: 'Bem-vindo ao MindFlow',
          content: welcomeContent,
        })
        .select()
        .single();

      if (error) throw error;

      const newNote: Note = {
        ...data,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        linkedNotes: extractLinks(data.content),
      };

      setNotes([newNote]);
      setSelectedNoteId(newNote.id);
    } catch (error) {
      console.error('Error creating welcome note:', error);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = useCallback(async (title: string = 'Nova Nota') => {
    if (!user) return null;

    const content = `# ${title}\n\n`;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      const newNote: Note = {
        ...data,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        linkedNotes: [],
      };

      setNotes(prev => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);
      
      return newNote;
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Erro ao criar nota');
      return null;
    }
  }, [user]);

  // Save to database with debounce
  const saveToDatabase = useCallback(async (id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Erro ao salvar nota');
    }
  }, [user]);

  // Update note with debounced save (immediate local update, debounced DB save)
  const updateNote = useCallback((id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => {
    // Immediately update local state
    setNotes(prev => prev.map(note => {
      if (note.id !== id) return note;
      
      const newContent = updates.content ?? note.content;
      const linkedNotes = extractLinks(newContent);
      
      return {
        ...note,
        ...updates,
        linkedNotes,
        updatedAt: new Date(),
      };
    }));

    // Merge with pending updates
    const currentPending = pendingUpdatesRef.current.get(id) || {};
    pendingUpdatesRef.current.set(id, { ...currentPending, ...updates });

    // Clear existing timer for this note
    const existingTimer = saveTimersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced save timer (500ms)
    const timer = setTimeout(() => {
      const pendingUpdate = pendingUpdatesRef.current.get(id);
      if (pendingUpdate) {
        saveToDatabase(id, pendingUpdate);
        pendingUpdatesRef.current.delete(id);
      }
      saveTimersRef.current.delete(id);
    }, 500);

    saveTimersRef.current.set(id, timer);
  }, [saveToDatabase]);

  // Force save any pending updates (e.g., before navigation)
  const flushPendingUpdates = useCallback(async () => {
    const promises: Promise<void>[] = [];
    
    saveTimersRef.current.forEach((timer, id) => {
      clearTimeout(timer);
      const pendingUpdate = pendingUpdatesRef.current.get(id);
      if (pendingUpdate) {
        promises.push(saveToDatabase(id, pendingUpdate));
      }
    });
    
    saveTimersRef.current.clear();
    pendingUpdatesRef.current.clear();
    
    await Promise.all(promises);
  }, [saveToDatabase]);

  const deleteNote = useCallback(async (id: string) => {
    if (!user) return;

    // Clear any pending updates for this note
    const timer = saveTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      saveTimersRef.current.delete(id);
    }
    pendingUpdatesRef.current.delete(id);

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotes(prev => prev.filter(note => note.id !== id));
      
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
      }
      
      toast.success('Nota excluída');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Erro ao excluir nota');
    }
  }, [user, selectedNoteId]);

  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate links between notes based on [[title]] references
  const getLinks = useCallback((): NoteLink[] => {
    const links: NoteLink[] = [];
    const addedLinks = new Set<string>();
    
    notes.forEach(note => {
      const linkedTitles = extractLinks(note.content);
      
      linkedTitles.forEach(linkedTitle => {
        const targetNote = notes.find(n => 
          n.title.toLowerCase().trim() === linkedTitle.toLowerCase().trim()
        );
        
        if (targetNote && targetNote.id !== note.id) {
          // Create a unique key to avoid duplicate links
          const linkKey = [note.id, targetNote.id].sort().join('-');
          
          if (!addedLinks.has(linkKey)) {
            links.push({
              source: note.id,
              target: targetNote.id,
            });
            addedLinks.add(linkKey);
          }
        }
      });
    });
    
    return links;
  }, [notes]);

  const getNoteByTitle = useCallback((title: string): Note | undefined => {
    return notes.find(n => n.title.toLowerCase().trim() === title.toLowerCase().trim());
  }, [notes]);

  const navigateToNote = useCallback(async (title: string) => {
    // Flush pending updates before navigation
    await flushPendingUpdates();
    
    const note = getNoteByTitle(title);
    if (note) {
      setSelectedNoteId(note.id);
    } else {
      // Create new note with this title
      const newNote = await createNote(title);
      if (newNote) {
        setSelectedNoteId(newNote.id);
      }
    }
  }, [getNoteByTitle, createNote, flushPendingUpdates]);

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
    getLinks,
    getNoteByTitle,
    navigateToNote,
    flushPendingUpdates,
    loading,
  };
};
