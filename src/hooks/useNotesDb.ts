import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Note, NoteLink } from '@/types/note';
import { toast } from 'sonner';

const extractLinks = (content: string): string[] => {
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  const matches = content.match(linkRegex) || [];
  return matches.map(match => match.slice(2, -2));
};

export const useNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

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

  const updateNote = useCallback(async (id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => {
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

      setNotes(prev => prev.map(note => {
        if (note.id !== id) return note;
        
        const linkedNotes = updates.content ? extractLinks(updates.content) : note.linkedNotes;
        
        return {
          ...note,
          ...updates,
          linkedNotes,
          updatedAt: new Date(),
        };
      }));
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Erro ao atualizar nota');
    }
  }, [user]);

  const deleteNote = useCallback(async (id: string) => {
    if (!user) return;

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

  const getLinks = useCallback((): NoteLink[] => {
    const links: NoteLink[] = [];
    
    notes.forEach(note => {
      note.linkedNotes.forEach(linkedTitle => {
        const targetNote = notes.find(n => 
          n.title.toLowerCase() === linkedTitle.toLowerCase()
        );
        if (targetNote && targetNote.id !== note.id) {
          links.push({
            source: note.id,
            target: targetNote.id,
          });
        }
      });
    });
    
    return links;
  }, [notes]);

  const getNoteByTitle = useCallback((title: string): Note | undefined => {
    return notes.find(n => n.title.toLowerCase() === title.toLowerCase());
  }, [notes]);

  const navigateToNote = useCallback(async (title: string) => {
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
  }, [getNoteByTitle, createNote]);

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
    loading,
  };
};
