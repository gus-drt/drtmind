import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command';
import { Note } from '@/types/note';
import { Tag } from '@/hooks/useTags';
import { formatShortcut } from '@/hooks/useKeyboardShortcuts';
import {
  FileText,
  Plus,
  Settings,
  Network,
  Search,
  Tag as TagIcon,
  Pin,
  Download,
  Trash2,
  Clock,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  tags: Tag[];
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onToggleGraph: () => void;
  onDeleteNote?: (id: string) => void;
  getTagsForNote: (noteId: string) => Tag[];
}

export const CommandPalette = ({
  open,
  onOpenChange,
  notes,
  tags,
  onSelectNote,
  onCreateNote,
  onToggleGraph,
  onDeleteNote,
  getTagsForNote,
}: CommandPaletteProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Reset search when dialog opens
  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = useCallback((action: () => void) => {
    onOpenChange(false);
    action();
  }, [onOpenChange]);

  // Filter and sort notes
  const filteredNotes = notes
    .filter(note =>
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      note.content.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 8);

  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const pinnedNotes = notes.filter(n => n.pinned);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar notas, comandos..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center py-4">
            <Search className="w-10 h-10 text-muted-foreground mb-2" />
            <p>Nenhum resultado encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tente buscar por título ou conteúdo
            </p>
          </div>
        </CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Ações Rápidas">
          <CommandItem onSelect={() => handleSelect(onCreateNote)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Nota
            <CommandShortcut>{formatShortcut({ key: 'N', ctrl: true })}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(onToggleGraph)}>
            <Network className="w-4 h-4 mr-2" />
            Toggle Grafo
            <CommandShortcut>{formatShortcut({ key: 'G', ctrl: true })}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/settings'))}>
            <Settings className="w-4 h-4 mr-2" />
            Configurações
            <CommandShortcut>{formatShortcut({ key: ',', ctrl: true })}</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Search Results */}
        {search && filteredNotes.length > 0 && (
          <CommandGroup heading="Resultados da Busca">
            {filteredNotes.map((note) => (
              <CommandItem
                key={note.id}
                onSelect={() => handleSelect(() => onSelectNote(note.id))}
                className="flex items-start gap-2"
              >
                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {note.pinned && <Pin className="w-3 h-3" />}
                    <span className="font-medium truncate">{note.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {note.content.replace(/[#*_\[\]`]/g, '').slice(0, 60)}...
                  </p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Pinned Notes */}
        {!search && pinnedNotes.length > 0 && (
          <CommandGroup heading="Notas Fixadas">
            {pinnedNotes.map((note) => (
              <CommandItem
                key={note.id}
                onSelect={() => handleSelect(() => onSelectNote(note.id))}
              >
                <Pin className="w-4 h-4 mr-2" />
                <span className="truncate">{note.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Recent Notes */}
        {!search && (
          <CommandGroup heading="Recentes">
            {recentNotes.map((note) => (
              <CommandItem
                key={note.id}
                onSelect={() => handleSelect(() => onSelectNote(note.id))}
              >
                <Clock className="w-4 h-4 mr-2" />
                <span className="truncate flex-1">{note.title}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(note.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Tags */}
        {!search && tags.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tags">
              {tags.slice(0, 5).map((tag) => (
                <CommandItem
                  key={tag.id}
                  onSelect={() => handleSelect(() => {
                    // TODO: Filter by tag
                  })}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span>{tag.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
