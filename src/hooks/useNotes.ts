import { useState, useEffect, useCallback } from 'react';
import { Note, NoteLink } from '@/types/note';

const STORAGE_KEY = 'mindflow-notes';

const generateId = () => Math.random().toString(36).substring(2, 15);

const extractLinks = (content: string): string[] => {
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  const matches = content.match(linkRegex) || [];
  return matches.map(match => match.slice(2, -2));
};

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load notes from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setNotes(parsed.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        updatedAt: new Date(n.updatedAt),
      })));
    } else {
      // Create welcome note
      const welcomeNote: Note = {
        id: generateId(),
        title: 'Bem-vindo ao MindFlow',
        content: `# Bem-vindo ao MindFlow! 🧠

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

Experimente criar uma nova nota e linkar ela aqui usando [[sua nova nota]]!`,
        createdAt: new Date(),
        updatedAt: new Date(),
        linkedNotes: [],
      };
      setNotes([welcomeNote]);
      setSelectedNoteId(welcomeNote.id);
    }
  }, []);

  // Save notes to localStorage
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }
  }, [notes]);

  const createNote = useCallback((title: string = 'Nova Nota') => {
    const newNote: Note = {
      id: generateId(),
      title,
      content: `# ${title}\n\n`,
      createdAt: new Date(),
      updatedAt: new Date(),
      linkedNotes: [],
    };
    setNotes(prev => [...prev, newNote]);
    setSelectedNoteId(newNote.id);
    return newNote;
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => {
    setNotes(prev => prev.map(note => {
      if (note.id !== id) return note;
      
      const linkedTitles = updates.content ? extractLinks(updates.content) : note.linkedNotes;
      
      return {
        ...note,
        ...updates,
        linkedNotes: linkedTitles,
        updatedAt: new Date(),
      };
    }));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
    }
  }, [selectedNoteId]);

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

  const navigateToNote = useCallback((title: string) => {
    const note = getNoteByTitle(title);
    if (note) {
      setSelectedNoteId(note.id);
    } else {
      // Create new note with this title
      const newNote = createNote(title);
      setSelectedNoteId(newNote.id);
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
  };
};
