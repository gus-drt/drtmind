import { useState } from 'react';
import { NoteGraph } from '@/components/notes/NoteGraph';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Note, NoteLink } from '@/types/note';
import {
  X,
  Maximize2,
  Minimize2,
  Move,
  PanelBottomOpen,
  PanelRightOpen,
} from 'lucide-react';

type GraphPosition = 'floating' | 'docked-right' | 'docked-bottom' | 'fullscreen';

interface GraphPanelProps {
  notes: Note[];
  links: NoteLink[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  getTagsForNote: (id: string) => { color: string }[];
  position: GraphPosition;
  onPositionChange: (position: GraphPosition) => void;
  onClose: () => void;
  isVisible: boolean;
}

export const GraphPanel = ({
  notes,
  links,
  selectedNoteId,
  onSelectNote,
  getTagsForNote,
  position,
  onPositionChange,
  onClose,
  isVisible,
}: GraphPanelProps) => {
  if (!isVisible) return null;

  // Fullscreen mode using Dialog
  if (position === 'fullscreen') {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onPositionChange('floating')}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 overflow-hidden">
          <DialogTitle className="sr-only">Visualização do Grafo</DialogTitle>
          <div className="absolute top-2 right-2 z-20 flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onPositionChange('floating')}
                  className="h-8 w-8 p-0"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Minimizar</TooltipContent>
            </Tooltip>
          </div>
          <div className="absolute top-3 left-4 text-sm font-medium text-muted-foreground z-20">
            {notes.length} notas • {links.length} conexões
          </div>
          <NoteGraph
            notes={notes}
            links={links}
            selectedNoteId={selectedNoteId}
            onSelectNote={onSelectNote}
            isActive={true}
            getTagsForNote={getTagsForNote}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Floating panel
  if (position === 'floating') {
    return (
      <div className="absolute bottom-4 right-4 w-80 h-64 rounded-xl border shadow-xl bg-background/95 backdrop-blur overflow-hidden z-10 group animate-scale-in">
        <div className="absolute top-2 left-3 text-xs font-medium text-muted-foreground z-20">
          Grafo Local
        </div>
        <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPositionChange('docked-right')}
                className="h-6 w-6 p-0"
              >
                <PanelRightOpen className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ancorar à direita</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPositionChange('docked-bottom')}
                className="h-6 w-6 p-0"
              >
                <PanelBottomOpen className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ancorar abaixo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPositionChange('fullscreen')}
                className="h-6 w-6 p-0"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tela cheia</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fechar</TooltipContent>
          </Tooltip>
        </div>
        <NoteGraph
          notes={notes}
          links={links}
          selectedNoteId={selectedNoteId}
          onSelectNote={onSelectNote}
          isActive={true}
          getTagsForNote={getTagsForNote}
        />
      </div>
    );
  }

  // Docked panels (right or bottom)
  const isDocked = position === 'docked-right' || position === 'docked-bottom';
  const isVertical = position === 'docked-bottom';

  const animationClass = isVertical ? 'animate-slide-in-bottom' : 'animate-slide-in-right';

  return (
    <div className={`bg-background border-t ${isVertical ? 'h-48' : 'h-full border-l'} relative ${animationClass}`}>
      <div className="absolute top-2 left-3 text-xs font-medium text-muted-foreground z-20">
        Grafo • {notes.length} notas
      </div>
      <div className="absolute top-2 right-2 z-20 flex gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPositionChange('floating')}
              className="h-6 w-6 p-0"
            >
              <Move className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Flutuante</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPositionChange('fullscreen')}
              className="h-6 w-6 p-0"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Tela cheia</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fechar</TooltipContent>
        </Tooltip>
      </div>
      <NoteGraph
        notes={notes}
        links={links}
        selectedNoteId={selectedNoteId}
        onSelectNote={onSelectNote}
        isActive={true}
        getTagsForNote={getTagsForNote}
      />
    </div>
  );
};

export type { GraphPosition };
export default GraphPanel;

