import { useState, useEffect, useRef, useCallback } from 'react';
import { Note } from '@/types/note';
import { Tag } from '@/hooks/useTags';
import { MarkdownPreview } from '@/components/notes/MarkdownPreview';
import { TagSelector } from '@/components/notes/TagSelector';
import { SharePopover } from '@/components/notes/SharePopover';
import { NoteLinkPreview } from '@/components/desktop/NoteLinkPreview';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { formatShortcut } from '@/hooks/useKeyboardShortcuts';
import {
  Eye,
  Edit3,
  Trash2,
  Download,
  Columns,
  Maximize2,
  Minimize2,
  Clock,
} from 'lucide-react';

type EditorMode = 'edit' | 'preview' | 'split';

interface EditorPanelProps {
  note: Note;
  notes?: Note[]; // All notes for link preview
  onUpdate: (id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => void;
  onDelete: (id: string) => void;
  onLinkClick: (title: string) => void;
  allTags: Tag[];
  noteTags: Tag[];
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateTag: (name: string, color: string) => Promise<Tag | null>;
  isPublic?: boolean;
  onTogglePublic?: (id?: string) => void;
  linkedNotesData?: Note[];
  defaultMode?: EditorMode;
  onModeChange?: (mode: EditorMode) => void;
}

export const EditorPanel = ({
  note,
  notes = [],
  onUpdate,
  onDelete,
  onLinkClick,
  allTags,
  noteTags,
  onAddTag,
  onRemoveTag,
  onCreateTag,
  isPublic = false,
  onTogglePublic,
  linkedNotesData = [],
  defaultMode = 'edit',
  onModeChange,
}: EditorPanelProps) => {
  const [mode, setMode] = useState<EditorMode>(defaultMode);
  const [localTitle, setLocalTitle] = useState(note.title);
  const [localContent, setLocalContent] = useState(note.content);
  const [isZenMode, setIsZenMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Sync local state when note changes
  useEffect(() => {
    setLocalTitle(note.title);
    setLocalContent(note.content);
  }, [note.id]);

  const handleModeChange = (newMode: EditorMode) => {
    setMode(newMode);
    onModeChange?.(newMode);
  };

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
    const blob = new Blob([`# ${localTitle}\n\n${localContent}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${localTitle.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
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
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }, [localContent, note.id, onUpdate]);

  const wordCount = localContent.split(/\s+/).filter(Boolean).length;
  const charCount = localContent.length;

  const editorTextarea = (
    <textarea
      ref={textareaRef}
      value={localContent}
      onChange={handleContentChange}
      onKeyDown={handleKeyDown}
      className="w-full h-full bg-transparent font-mono text-sm resize-none focus:outline-none p-4 leading-relaxed"
      placeholder="Escreva sua nota aqui..."
    />
  );

  const previewContent = (
    <div ref={previewContainerRef} className="p-4 h-full overflow-auto">
      <MarkdownPreview content={localContent} onLinkClick={onLinkClick} />
      {notes.length > 0 && (
        <NoteLinkPreview
          notes={notes}
          onNavigate={onLinkClick}
          containerRef={previewContainerRef}
        />
      )}
    </div>
  );

  return (
    <div className={`flex flex-col h-full bg-background ${isZenMode ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b gap-3">
        <input
          type="text"
          value={localTitle}
          onChange={handleTitleChange}
          className="text-xl font-semibold bg-transparent border-none outline-none flex-1 min-w-0"
          placeholder="Título da nota"
        />
        <div className="flex items-center gap-2">
          {/* Mode Tabs */}
          <Tabs value={mode} onValueChange={(v) => handleModeChange(v as EditorMode)} className="h-8">
            <TabsList className="h-8 bg-muted/50">
              <TabsTrigger value="edit" className="h-7 px-2 text-xs">
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                Editar
              </TabsTrigger>
              <TabsTrigger value="preview" className="h-7 px-2 text-xs">
                <Eye className="w-3.5 h-3.5 mr-1" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="split" className="h-7 px-2 text-xs">
                <Columns className="w-3.5 h-3.5 mr-1" />
                Split
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Actions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => setIsZenMode(!isZenMode)} className="h-8 w-8 p-0">
                {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isZenMode ? 'Sair do modo Zen' : 'Modo Zen'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleExport} className="h-8 w-8 p-0">
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Exportar Markdown</TooltipContent>
          </Tooltip>

          {onTogglePublic && (
            <SharePopover
              noteId={note.id}
              isPublic={isPublic}
              onTogglePublic={onTogglePublic}
              linkedNotesData={linkedNotesData}
              compact
            />
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(note.id)}
                className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Excluir nota</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Tags */}
      {!isZenMode && (
        <div className="px-4 py-2 border-b">
          <TagSelector
            allTags={allTags}
            noteTags={noteTags}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            onCreateTag={onCreateTag}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'edit' && (
          <div className="h-full bg-muted/20">{editorTextarea}</div>
        )}
        {mode === 'preview' && previewContent}
        {mode === 'split' && (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full bg-muted/20 border-r">{editorTextarea}</div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              {previewContent}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{wordCount} palavras</span>
          <span>{charCount} caracteres</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Editado {note.updatedAt.toLocaleString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;
