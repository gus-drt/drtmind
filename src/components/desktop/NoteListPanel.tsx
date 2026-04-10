import { useState, useEffect } from 'react';
import { Note } from '@/types/note';
import { Tag } from '@/hooks/useTags';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from '@/components/ui/context-menu';
import { ContextMenuTrigger } from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { MarkdownPreview } from '@/components/notes/MarkdownPreview';
import {
  Plus,
  Search,
  FileText,
  Pin,
  SlidersHorizontal,
  Copy,
  Trash2,
  ExternalLink,
  Download,
  GripVertical,
} from 'lucide-react';

interface NoteListPanelProps {
  notes: Note[];
  selectedNoteId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDuplicateNote?: (note: Note) => void;
  onExportNote?: (note: Note) => void;
  onReorderNotes?: (notes: Note[]) => void;
  pinnedCount: number;
  getTagsForNote: (noteId: string) => Tag[];
}

export const NoteListPanel = ({
  notes,
  selectedNoteId,
  searchQuery,
  onSearchChange,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onTogglePin,
  onDuplicateNote,
  onExportNote,
  onReorderNotes,
  pinnedCount,
  getTagsForNote,
}: NoteListPanelProps) => {
  const [prefs, setPrefs] = useState(() => {
    const saved = localStorage.getItem('noteListPrefs');
    return saved ? JSON.parse(saved) : { preview: true, links: true, tags: true, dragEnabled: true };
  });
  const [tagStyle, setTagStyle] = useState(() => localStorage.getItem('tagDisplayStyle') || 'name');

  // Drag and drop
  const { getDragItemProps, isDragging, dropTarget } = useDragAndDrop<Note>({
    items: notes,
    getItemId: (note) => note.id,
    onReorder: onReorderNotes,
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setTagStyle(localStorage.getItem('tagDisplayStyle') || 'name');
    };
    window.addEventListener('tag-style-changed', handleStorageChange);
    return () => window.removeEventListener('tag-style-changed', handleStorageChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('noteListPrefs', JSON.stringify(prefs));
  }, [prefs]);

  const togglePref = (key: keyof typeof prefs) => {
    setPrefs((prev: typeof prefs) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyToClipboard = (note: Note) => {
    navigator.clipboard.writeText(note.content);
  };

  const handleExport = (note: Note) => {
    const blob = new Blob([`# ${note.title}\n\n${note.content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-background border-r">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground">NOTAS</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Preferências">
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Visualização</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={prefs.preview} onCheckedChange={() => togglePref('preview')}>
                Prévia do conteúdo
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={prefs.links} onCheckedChange={() => togglePref('links')}>
                Contador de conexões
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={prefs.tags} onCheckedChange={() => togglePref('tags')}>
                Tags
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={prefs.dragEnabled} onCheckedChange={() => togglePref('dragEnabled')}>
                Arrastar e soltar
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm rounded-lg bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>

        {/* Create button */}
        <Button
          onClick={onCreateNote}
          className="w-full h-8 text-sm rounded-lg"
          variant="outline"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Nova Nota
        </Button>
      </div>

      {/* Notes list */}
      <ScrollArea className="flex-1">
        <div className={`p-2 space-y-1 ${isDragging ? 'select-none' : ''}`}>
          {notes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {searchQuery ? 'Nenhuma nota encontrada' : 'Nenhuma nota ainda'}
            </p>
          ) : (
            notes.map((note, index) => (
              <NoteListItem
                key={note.id}
                note={note}
                index={index}
                isSelected={selectedNoteId === note.id}
                onSelect={() => onSelectNote(note.id)}
                onTogglePin={() => onTogglePin(note.id)}
                onDelete={() => onDeleteNote(note.id)}
                onCopy={() => handleCopyToClipboard(note)}
                onExport={() => handleExport(note)}
                pinnedCount={pinnedCount}
                prefs={prefs}
                tagStyle={tagStyle}
                tags={getTagsForNote(note.id)}
                dragEnabled={prefs.dragEnabled && !!onReorderNotes}
                dragProps={prefs.dragEnabled ? getDragItemProps(note, index) : undefined}
                isDropTarget={dropTarget?.id === note.id}
                dropPosition={dropTarget?.id === note.id ? dropTarget.position : undefined}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 text-xs text-muted-foreground text-center border-t">
        {notes.length} nota(s)
      </div>
    </div>
  );
};

// Individual note item with context menu and hover preview
interface NoteListItemProps {
  note: Note;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onExport: () => void;
  pinnedCount: number;
  prefs: { preview: boolean; links: boolean; tags: boolean; dragEnabled: boolean };
  tagStyle: string;
  tags: Tag[];
  dragEnabled: boolean;
  dragProps?: ReturnType<typeof useDragAndDrop<Note>>['getDragItemProps'] extends (item: Note, index: number) => infer R ? R : never;
  isDropTarget: boolean;
  dropPosition?: 'before' | 'after';
}

const NoteListItem = ({
  note,
  index,
  isSelected,
  onSelect,
  onTogglePin,
  onDelete,
  onCopy,
  onExport,
  pinnedCount,
  prefs,
  tagStyle,
  tags,
  dragEnabled,
  dragProps,
  isDropTarget,
  dropPosition,
}: NoteListItemProps) => {
  const dropIndicatorClasses = isDropTarget
    ? dropPosition === 'before'
      ? 'ring-2 ring-primary ring-offset-1 -translate-y-0.5'
      : 'ring-2 ring-primary ring-offset-1 translate-y-0.5'
    : '';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <HoverCard openDelay={500} closeDelay={100}>
          <HoverCardTrigger asChild>
            <div
              className={`w-full text-left p-2.5 rounded-lg cursor-pointer transition-all group ${isSelected
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-muted/80'
                } ${dropIndicatorClasses}`}
              onClick={onSelect}
              {...(dragEnabled ? dragProps : {})}
            >
              <div className="flex items-start gap-2 min-w-0">
                {dragEnabled ? (
                  <GripVertical className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-40 cursor-grab active:cursor-grabbing" />
                ) : (
                  <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-60" />
                )}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center gap-1">
                    {note.pinned && <Pin className="w-3 h-3 flex-shrink-0" />}
                    <h3 className="font-medium truncate text-sm">{note.title}</h3>
                  </div>
                  {prefs.preview && (
                    <p className={`text-xs truncate mt-0.5 ${isSelected ? 'opacity-70' : 'text-muted-foreground'
                      }`}>
                      {note.content.replace(/[#*_\[\]`]/g, '').slice(0, 60)}...
                    </p>
                  )}
                  {prefs.links && note.linkedNotes.length > 0 && (
                    <p className={`text-xs mt-0.5 ${isSelected ? 'opacity-60' : 'text-muted-foreground'
                      }`}>
                      🔗 {note.linkedNotes.length}
                    </p>
                  )}
                  {prefs.tags && tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {tags.map(tag => (
                        <span
                          key={tag.id}
                          className={tagStyle === 'dot'
                            ? "w-2 h-2 rounded-full inline-block"
                            : "text-[10px] px-1 py-0.5 rounded-full text-white font-medium"
                          }
                          style={{ backgroundColor: tag.color }}
                          title={tag.name}
                        >
                          {tagStyle === 'dot' ? null : tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="right" align="start" className="w-80 p-0">
            <div className="p-3 border-b">
              <h4 className="font-semibold text-sm">{note.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Editado: {new Date(note.updatedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div className="p-3 max-h-48 overflow-auto text-sm">
              <MarkdownPreview content={note.content.slice(0, 500)} />
            </div>
          </HoverCardContent>
        </HoverCard>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onSelect}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Abrir
        </ContextMenuItem>
        <ContextMenuItem onClick={onTogglePin} disabled={!note.pinned && pinnedCount >= 3}>
          <Pin className="w-4 h-4 mr-2" />
          {note.pinned ? 'Desafixar' : 'Fixar'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onCopy}>
          <Copy className="w-4 h-4 mr-2" />
          Copiar conteúdo
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onExport}>
          <Download className="w-4 h-4 mr-2" />
          Exportar .md
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Excluir
          <ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default NoteListPanel;
