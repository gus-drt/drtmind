import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatShortcut } from '@/hooks/useKeyboardShortcuts';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  FileText,
  Link2,
  Tag as TagIcon,
  Network,
  PanelLeft,
  Keyboard,
} from 'lucide-react';

interface StatusBarProps {
  noteCount: number;
  linkCount: number;
  tagCount: number;
  cloudNoteCount: number;
  cloudNoteLimit: number;
  isAdmin: boolean;
  useCloud: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  selectedNoteTitle?: string;
  showGraph: boolean;
  sidebarCollapsed: boolean;
}

export const StatusBar = ({
  noteCount,
  linkCount,
  tagCount,
  cloudNoteCount,
  cloudNoteLimit,
  isAdmin,
  useCloud,
  isOnline,
  isSyncing,
  selectedNoteTitle,
  showGraph,
  sidebarCollapsed,
}: StatusBarProps) => {
  const cloudLabel = isAdmin ? '∞' : `${cloudNoteCount}/${cloudNoteLimit}`;

  return (
    <div className="h-6 border-t bg-muted/30 px-3 flex items-center justify-between text-xs text-muted-foreground">
      {/* Left section - Stats */}
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-default">
              <FileText className="w-3 h-3" />
              <span>{noteCount}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">{noteCount} notas</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-default">
              <Link2 className="w-3 h-3" />
              <span>{linkCount}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">{linkCount} conexões</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-default">
              <TagIcon className="w-3 h-3" />
              <span>{tagCount}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">{tagCount} tags</TooltipContent>
        </Tooltip>

        {/* Separator */}
        <div className="h-3 w-px bg-border" />

        {/* Current note */}
        {selectedNoteTitle && (
          <span className="truncate max-w-[200px]" title={selectedNoteTitle}>
            {selectedNoteTitle}
          </span>
        )}
      </div>

      {/* Center section - View indicators */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 cursor-default ${showGraph ? '' : 'opacity-40'}`}>
              <Network className="w-3 h-3" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            Grafo {showGraph ? 'visível' : 'oculto'} ({formatShortcut({ key: 'G', ctrl: true })})
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 cursor-default ${sidebarCollapsed ? 'opacity-40' : ''}`}>
              <PanelLeft className="w-3 h-3" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            Sidebar {sidebarCollapsed ? 'recolhida' : 'visível'} ({formatShortcut({ key: 'B', ctrl: true })})
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Right section - Cloud status & Shortcuts */}
      <div className="flex items-center gap-3">
        {/* Cloud status */}
        {useCloud && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-default">
                {!isOnline ? (
                  <>
                    <CloudOff className="w-3 h-3 text-destructive" />
                    <span className="text-destructive">Offline</span>
                  </>
                ) : isSyncing ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                    <span>Sincronizando...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3 h-3" />
                    <span>☁️ {cloudLabel}</span>
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              {!isOnline
                ? 'Offline - Alterações salvas localmente'
                : isSyncing
                ? 'Sincronizando com a nuvem...'
                : isAdmin
                ? 'Armazenamento ilimitado'
                : `${cloudNoteCount} de ${cloudNoteLimit} notas na nuvem`
              }
            </TooltipContent>
          </Tooltip>
        )}

        {/* Separator */}
        <div className="h-3 w-px bg-border" />

        {/* Keyboard shortcut hint */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-default hover:text-foreground">
              <Keyboard className="w-3 h-3" />
              <kbd className="px-1 bg-muted rounded text-[10px]">{formatShortcut({ key: 'K', ctrl: true })}</kbd>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            Abrir paleta de comandos
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default StatusBar;

