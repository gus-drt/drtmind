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
        pinned: note.pinned,
        pinnedAt: note.pinned_at ? new Date(note.pinned_at) : null,
      }));

      setNotes(notesWithLinks);

      // Auto-select Index/Índice note if no note is currently selected
      if (!selectedNoteId) {
        const indexNote = notesWithLinks.find(n =>
          /^[ií]ndice$/i.test(n.title.trim()) || /^index$/i.test(n.title.trim())
        );
        if (indexNote) {
          setSelectedNoteId(indexNote.id);
        }
      }

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

    const welcomeNotes = [
      {
        title: 'Índice',
        content: `# Índice 🧠

Bem-vindo ao **Graph Notes** — seu segundo cérebro em forma de grafo!

Aqui suas ideias se conectam visualmente. Comece explorando as notas abaixo:

---

## 📚 Guias

- [[Como Usar o Graph Notes]]
- [[Formatação Markdown]]
- [[Tags e Organização]]

---

## 💡 Dicas

- Crie notas curtas e focadas em um único assunto
- Use \`[[nome da nota]]\` para conectar ideias
- Abra o **Grafo** no menu superior para ver todas as conexões
- Esta nota "Índice" sempre aparece no **centro do grafo**!

---

> Dica: fixe esta nota para acessá-la rapidamente! (Você pode fixar até **3 notas**)`,
        pinned: true,
      },
      {
        title: 'Como Usar o Graph Notes',
        content: `# Como Usar o Graph Notes 🚀

Voltar para o [[Índice]]

---

## Criando notas

- Clique em **"Nova Nota"** no painel lateral ou no botão **+**
- Cada nota tem um título e conteúdo em Markdown

## Conectando notas

O grande diferencial do Graph Notes é conectar ideias entre si!

Use a sintaxe \`[[nome da nota]]\` no conteúdo para criar um link. Por exemplo:

> Veja também: [[Tags e Organização]]

Se a nota ainda não existir, ela será criada automaticamente ao clicar no link.

## Navegação

- **Editor**: escreva e visualize suas notas com Markdown
- **Grafo**: veja todas as notas e conexões visualmente
- Clique em um nó no grafo para abrir a nota

## Fixar notas 📌

Você pode **fixar até 3 notas** no topo da lista para acesso rápido. Basta clicar no ícone de pin ao lado da nota.

## Planos 👑

O Graph Notes oferece diferentes planos:

- **Free**: funcionalidades básicas para começar
- **Pro**: recursos avançados por R$19,90/mês
- **AI Plus**: inteligência artificial integrada por R$39,90/mês

Toque no ícone 👑 no menu superior para ver os detalhes!

---

Veja também: [[Formatação Markdown]]`,
      },
      {
        title: 'Formatação Markdown',
        content: `# Formatação Markdown ✍️

Voltar para o [[Índice]]

---

O Graph Notes suporta Markdown para formatar suas notas. Aqui está tudo que você pode usar:

## Títulos

- \`# Título grande\`
- \`## Título médio\`
- \`### Título pequeno\`

## Texto

- \`**negrito**\` → **negrito**
- \`*itálico*\` → *itálico*
- \`***negrito e itálico***\` → ***negrito e itálico***
- \`~~riscado~~\` → ~~riscado~~
- \`\\\`código inline\\\`\` → \`código inline\`

## Listas

Lista com marcadores:
- \`- item 1\`
- \`- item 2\`

Lista numerada:
1. \`1. primeiro\`
2. \`2. segundo\`

## Outros

- \`---\` → Linha horizontal
- \`> texto\` → Citação (blockquote)
- \`[texto](url)\` → Link externo
- \`[[nome da nota]]\` → Link para outra nota

---

> Dica: alterne entre **Editar** e **Visualizar** para ver o resultado!

Veja também: [[Tags e Organização]]`,
      },
      {
        title: 'Tags e Organização',
        content: `# Tags e Organização 🏷️

Voltar para o [[Índice]]

---

## O que são Tags?

Tags são etiquetas coloridas que você adiciona às suas notas para categorizá-las. Diferente de pastas, uma nota pode ter **várias tags** ao mesmo tempo!

## Como usar

1. Abra uma nota no editor
2. Clique no seletor de tags abaixo do título
3. Escolha uma tag existente ou crie uma nova
4. Cada tag tem um **nome** e uma **cor** personalizável

## Boas práticas

- Use tags amplas como \`projeto\`, \`estudo\`, \`ideia\`, \`referência\`
- Evite criar tags muito específicas — links entre notas servem melhor para isso
- Use **cores diferentes** para distinguir categorias visualmente
- Tags aparecem na lista de notas, facilitando a identificação rápida

## Combinando Tags + Links

A combinação perfeita é:

- **Tags** para categorizar (ex: \`estudo\`, \`trabalho\`)
- **Links** \`[[nota]]\` para conectar ideias relacionadas
- **Fixar** as notas mais importantes (até 3!)

---

> Experimente: crie uma tag chamada "guia" e adicione a todas estas notas de boas-vindas!

Veja também: [[Como Usar o Graph Notes]] • [[Formatação Markdown]]`,
      },
    ];

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert(
          welcomeNotes.map(n => ({
            user_id: user.id,
            title: n.title,
            content: n.content,
            pinned: n.pinned || false,
            pinned_at: n.pinned ? new Date().toISOString() : null,
          }))
        )
        .select();

      if (error) throw error;

      const createdNotes: Note[] = (data || []).map(note => ({
        ...note,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
        linkedNotes: extractLinks(note.content),
        pinned: note.pinned,
        pinnedAt: note.pinned_at ? new Date(note.pinned_at) : null,
      }));

      setNotes(createdNotes);
      // Select the Índice note
      const indexNote = createdNotes.find(n => n.title === 'Índice');
      if (indexNote) {
        setSelectedNoteId(indexNote.id);
      }
    } catch (error) {
      console.error('Error creating welcome notes:', error);
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
        pinned: data.pinned,
        pinnedAt: data.pinned_at ? new Date(data.pinned_at) : null,
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

  // Sort notes: pinned first (by pinnedAt desc), then by updatedAt desc
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.pinned && b.pinned) {
      return (b.pinnedAt?.getTime() || 0) - (a.pinnedAt?.getTime() || 0);
    }
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  const filteredNotes = sortedNotes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedCount = notes.filter(n => n.pinned).length;

  const togglePinNote = useCallback(async (id: string) => {
    if (!user) return;

    const note = notes.find(n => n.id === id);
    if (!note) return;

    const newPinned = !note.pinned;
    
    // Check if we're trying to pin and already at max
    if (newPinned && pinnedCount >= 3) {
      toast.error('Você pode fixar no máximo 3 notas');
      return;
    }

    const pinnedAt = newPinned ? new Date().toISOString() : null;

    // Optimistic update
    setNotes(prev => prev.map(n => {
      if (n.id !== id) return n;
      return {
        ...n,
        pinned: newPinned,
        pinnedAt: pinnedAt ? new Date(pinnedAt) : null,
      };
    }));

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          pinned: newPinned,
          pinned_at: pinnedAt,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success(newPinned ? 'Nota fixada' : 'Nota desafixada');
    } catch (error) {
      console.error('Error toggling pin:', error);
      // Revert optimistic update
      setNotes(prev => prev.map(n => {
        if (n.id !== id) return n;
        return {
          ...n,
          pinned: note.pinned,
          pinnedAt: note.pinnedAt,
        };
      }));
      toast.error('Erro ao fixar nota');
    }
  }, [user, notes, pinnedCount]);

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
    togglePinNote,
    pinnedCount,
    getLinks,
    getNoteByTitle,
    navigateToNote,
    flushPendingUpdates,
    loading,
  };
};
