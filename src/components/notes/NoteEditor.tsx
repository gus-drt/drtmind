import { useState, useEffect, useRef, useCallback } from 'react';
import { Note } from '@/types/note';
import { MarkdownPreview } from './MarkdownPreview';
import { Button } from '@/components/ui/button';
import { Eye, Edit3, Trash2 } from 'lucide-react';

interface NoteEditorProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => void;
  onDelete: (id: string) => void;
  onLinkClick: (title: string) => void;
}

export const NoteEditor = ({ note, onUpdate, onDelete, onLinkClick }: NoteEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(note.title);
  const [localContent, setLocalContent] = useState(note.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Sync local state when note changes (different note selected)
  useEffect(() => {
    setLocalTitle(note.title);
    setLocalContent(note.content);
  }, [note.id]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at end
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    onUpdate(note.id, { title: newTitle });
  }, [note.id, onUpdate]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    onUpdate(note.id, { content: newContent });
  }, [note.id, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = localContent.substring(0, start) + '  ' + localContent.substring(end);
      
      setLocalContent(newContent);
      onUpdate(note.id, { content: newContent });
      
      // Restore cursor position after React updates
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }, [localContent, note.id, onUpdate]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-border">
        <input
          ref={titleInputRef}
          type="text"
          value={localTitle}
          onChange={handleTitleChange}
          className="text-xl font-bold bg-transparent border-none outline-none focus:ring-0 flex-1"
          placeholder="Título da nota"
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="border-2"
          >
            {isEditing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(note.id)}
            className="border-2 hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={localContent}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            className="w-full h-full min-h-[400px] bg-transparent border-2 border-border p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={`Escreva sua nota aqui...

Dicas de formatação:
# Título
## Subtítulo
**negrito**
*itálico*
- lista
[[link para nota]]`}
          />
        ) : (
          <MarkdownPreview content={localContent} onLinkClick={onLinkClick} />
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border text-xs text-muted-foreground">
        Atualizado: {note.updatedAt.toLocaleString('pt-BR')}
      </div>
    </div>
  );
};
