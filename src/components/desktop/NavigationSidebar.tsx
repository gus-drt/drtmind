import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatShortcut } from '@/hooks/useKeyboardShortcuts';
import { useLayoutPreferences } from '@/hooks/useLayoutPreferences';
import { Note } from '@/types/note';
import { Tag } from '@/hooks/useTags';
import {
  Network,
  FileText,
  Plus,
  Settings,
  Search,
  ChevronDown,
  Tag as TagIcon,
  Pin,
  CloudOff,
  RefreshCw,
  Cloud,
  PanelLeftClose,
  Sparkles,
  Clock,
  Filter,
} from 'lucide-react';

interface NavigationSidebarProps {
  notes: Note[];
  tags: Tag[];
  pinnedCount: number;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onToggleGraph: () => void;
  onOpenCommandPalette: () => void;
  onToggleSidebar: () => void;
  showGraph: boolean;
  // Sync status
  useCloud: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  cloudNoteCount: number;
  cloudNoteLimit: number;
  isAdmin: boolean;
  linksCount: number;
  // Tag filtering
  selectedTagId?: string | null;
  onSelectTag?: (tagId: string | null) => void;
}

export const NavigationSidebar = ({
  notes,
  tags,
  pinnedCount,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onToggleGraph,
  onOpenCommandPalette,
  onToggleSidebar,
  showGraph,
  useCloud,
  isOnline,
  isSyncing,
  cloudNoteCount,
  cloudNoteLimit,
  isAdmin,
  linksCount,
  selectedTagId,
  onSelectTag,
}: NavigationSidebarProps) => {
  const navigate = useNavigate();
  const { preferences: { sidebarSections }, toggleSidebarSection } = useLayoutPreferences();

  const pinnedNotes = notes.filter((n) => n.pinned);
  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const cloudLabel = isAdmin ? '∞' : `${cloudNoteCount}/${cloudNoteLimit}`;

  return (
    <div className="h-full flex flex-col border-r bg-sidebar">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h1 className="font-bold text-lg flex items-center gap-2">
          <Network className="w-5 h-5 text-primary" />
          <span>GraphNotes</span>
        </h1>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="h-8 w-8">
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Recolher sidebar ({formatShortcut({ key: 'B', ctrl: true })})
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Search */}
      <div className="p-3">
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground h-9"
          onClick={onOpenCommandPalette}
        >
          <Search className="w-4 h-4 mr-2" />
          <span>Buscar...</span>
          <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
            {formatShortcut({ key: 'K', ctrl: true })}
          </kbd>
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        {/* Quick Actions */}
        <Collapsible 
          open={sidebarSections.quickActions} 
          onOpenChange={(open) => toggleSidebarSection('quickActions', open)} 
          className="mb-2"
        >
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 text-sm font-medium hover:bg-accent rounded-lg transition-colors">
            <Sparkles className="w-4 h-4" />
            <span>Ações Rápidas</span>
            <ChevronDown className="w-4 h-4 ml-auto transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-2 space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8"
              onClick={onCreateNote}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Nota
              <kbd className="ml-auto text-xs opacity-50">{formatShortcut({ key: 'N', ctrl: true })}</kbd>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8"
              onClick={onToggleGraph}
            >
              <Network className="w-4 h-4 mr-2" />
              {showGraph ? 'Ocultar' : 'Mostrar'} Grafo
              <kbd className="ml-auto text-xs opacity-50">{formatShortcut({ key: 'G', ctrl: true })}</kbd>
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {/* Recent Notes */}
        <Collapsible 
          open={sidebarSections.recent} 
          onOpenChange={(open) => toggleSidebarSection('recent', open)} 
          className="mb-2"
        >
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 text-sm font-medium hover:bg-accent rounded-lg transition-colors">
            <Clock className="w-4 h-4" />
            <span>Recentes</span>
            <ChevronDown className="w-4 h-4 ml-auto" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-2 space-y-1">
            {recentNotes.map((note) => (
              <Button
                key={note.id}
                variant="ghost"
                size="sm"
                className={`w-full justify-start h-8 ${selectedNoteId === note.id ? 'bg-accent' : ''}`}
                onClick={() => onSelectNote(note.id)}
              >
                <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{note.title}</span>
              </Button>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Tags */}
        <Collapsible 
          open={sidebarSections.tags} 
          onOpenChange={(open) => toggleSidebarSection('tags', open)} 
          className="mb-2"
        >
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 text-sm font-medium hover:bg-accent rounded-lg transition-colors">
            <TagIcon className="w-4 h-4" />
            <span>Tags</span>
            <span className="ml-auto text-xs text-muted-foreground">{tags.length}</span>
            <ChevronDown className="w-4 h-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-2 space-y-1">
            {selectedTagId && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-muted-foreground"
                onClick={() => onSelectTag?.(null)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Limpar filtro
              </Button>
            )}
            {tags.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">Nenhuma tag criada</p>
            ) : (
              tags.map((tag) => (
                <Button
                  key={tag.id}
                  variant="ghost"
                  size="sm"
                  className={`w-full justify-start h-8 ${selectedTagId === tag.id ? 'bg-accent' : ''}`}
                  onClick={() => onSelectTag?.(tag.id)}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="truncate">{tag.name}</span>
                </Button>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Pinned Notes */}
        <Collapsible 
          open={sidebarSections.pinned} 
          onOpenChange={(open) => toggleSidebarSection('pinned', open)} 
          className="mb-2"
        >
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 text-sm font-medium hover:bg-accent rounded-lg transition-colors">
            <Pin className="w-4 h-4" />
            <span>Fixadas</span>
            <span className="ml-auto text-xs text-muted-foreground">{pinnedCount}/3</span>
            <ChevronDown className="w-4 h-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-2 space-y-1">
            {pinnedNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">Nenhuma nota fixada</p>
            ) : (
              pinnedNotes.map((note) => (
                <Button
                  key={note.id}
                  variant="ghost"
                  size="sm"
                  className={`w-full justify-start h-8 ${selectedNoteId === note.id ? 'bg-accent' : ''}`}
                  onClick={() => onSelectNote(note.id)}
                >
                  <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{note.title}</span>
                </Button>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t space-y-2">
        {/* Sync Status */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{notes.length} notas • {linksCount} conexões</span>
          {useCloud && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-default">
                  {!isOnline ? (
                    <CloudOff className="w-3 h-3 text-destructive" />
                  ) : isSyncing ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                  ) : (
                    <Cloud className="w-3 h-3" />
                  )}
                  <span>☁️ {cloudLabel}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {!isOnline ? 'Offline - alterações salvas localmente' : isSyncing ? 'Sincronizando...' : 'Sincronizado'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => navigate('/settings')}
        >
          <Settings className="w-4 h-4 mr-2" />
          Configurações
        </Button>
      </div>
    </div>
  );
};

export default NavigationSidebar;
