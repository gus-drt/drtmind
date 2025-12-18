import { useState, useEffect, useRef } from 'react';
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
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
  }, [note.id, note.title, note.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    onUpdate(note.id, { title: newTitle });
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onUpdate(note.id, { content: newContent });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = content.substring(0, start) + '  ' + content.substring(end);
        setContent(newContent);
        onUpdate(note.id, { content: newContent });
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-border">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
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
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-full min-h-[400px] bg-transparent border-2 border-border p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Escreva sua nota aqui...

Dicas de formatação:
# Título
## Subtítulo
**negrito**
*itálico*
- lista
[[link para nota]]"
          />
        ) : (
          <MarkdownPreview content={content} onLinkClick={onLinkClick} />
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border text-xs text-muted-foreground">
        Atualizado: {note.updatedAt.toLocaleString('pt-BR')}
      </div>
    </div>
  );
};
