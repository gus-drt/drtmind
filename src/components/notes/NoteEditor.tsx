import { useState, useEffect, useRef, useCallback } from 'react';
import { Note } from '@/types/note';
import { Tag } from '@/hooks/useTags';
import { MarkdownPreview } from './MarkdownPreview';
import { TagSelector } from './TagSelector';
import { SharePopover } from './SharePopover';
import { Button } from '@/components/ui/button';
import { Eye, Edit3, Trash2, ArrowLeft, Download } from 'lucide-react';

interface NoteEditorProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => void;
  onDelete: (id: string) => void;
  onLinkClick: (title: string) => void;
  onBackToGraph?: () => void;
  allTags: Tag[];
  noteTags: Tag[];
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateTag: (name: string, color: string) => Promise<Tag | null>;
  isPublic?: boolean;
  onTogglePublic?: (id?: string) => void;
  linkedNotesData?: Note[];
}

export const NoteEditor = ({ note, onUpdate, onDelete, onLinkClick, onBackToGraph, allTags, noteTags, onAddTag, onRemoveTag, onCreateTag, isPublic = false, onTogglePublic, linkedNotesData = [] }: NoteEditorProps) => {
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

  const handleExport = useCallback(() => {
    const blob = new Blob([localContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${localTitle || 'nota'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [localTitle, localContent]);


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
      <div className="flex items-center justify-between p-3 sm:p-4 gap-3 border-b border-border/50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {onBackToGraph && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToGraph}
              className="h-9 w-9 p-0 rounded-xl flex-shrink-0"
              title="Voltar ao grafo"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <input
            ref={titleInputRef}
            type="text"
            value={localTitle}
            onChange={handleTitleChange}
            className="text-lg sm:text-xl font-semibold bg-transparent border-none outline-none focus:ring-0 flex-1 min-w-0"
            placeholder="Título da nota"
          />
        </div>
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="h-9 w-9 p-0 rounded-xl"
            title={isEditing ? "Visualizar" : "Editar"}
          >
            {isEditing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="h-9 w-9 p-0 rounded-xl"
            title="Exportar Markdown"
          >
            <Download className="w-4 h-4" />
          </Button>

          {onTogglePublic && (
            <SharePopover
              noteId={note.id}
              isPublic={isPublic}
              onTogglePublic={onTogglePublic}
              linkedNotesData={linkedNotesData}
            />
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(note.id)}
            className="h-9 w-9 p-0 rounded-xl hover:bg-destructive hover:text-destructive-foreground"
            title="Excluir nota"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      


      {/* Tags */}
      <div className="px-3 sm:px-4 py-2 border-b border-border/30">
        <TagSelector
          allTags={allTags}
          noteTags={noteTags}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onCreateTag={onCreateTag}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={localContent}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            className="w-full h-full min-h-[300px] sm:min-h-[400px] bg-muted/30 rounded-xl p-4 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
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
      <div className="p-3 pb-6 text-xs text-muted-foreground text-center border-t border-border/30">
        Atualizado: {note.updatedAt.toLocaleString('pt-BR')}
      </div>
    </div>
  );
};
