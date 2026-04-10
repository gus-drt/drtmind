import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { MarkdownPreview } from '@/components/notes/MarkdownPreview';
import { Note } from '@/types/note';
import { FileText, ArrowUpRight, Link2 } from 'lucide-react';

interface NoteLinkPreviewProps {
  notes: Note[];
  onNavigate: (title: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * NoteLinkPreview - Provides hover previews for [[note]] links
 * 
 * This component observes a container for .note-link elements and attaches
 * hover card functionality to show note previews on hover.
 */
export const NoteLinkPreview = ({
  notes,
  onNavigate,
  containerRef,
}: NoteLinkPreviewProps) => {
  const [activeLink, setActiveLink] = useState<{
    title: string;
    rect: DOMRect;
    note: Note | undefined;
  } | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('note-link')) {
        const title = target.getAttribute('data-link');
        if (!title) return;

        // Clear any pending timeout
        if (hoverTimeoutRef.current) {
          window.clearTimeout(hoverTimeoutRef.current);
        }

        // Delay to prevent accidental triggers
        hoverTimeoutRef.current = window.setTimeout(() => {
          if (!document.body.contains(target)) return;

          const note = notes.find(n => 
            n.title.toLowerCase() === title.toLowerCase()
          );
          const rect = target.getBoundingClientRect();
          setActiveLink({ title, rect, note });
        }, 300);
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('note-link')) {
        if (hoverTimeoutRef.current) {
          window.clearTimeout(hoverTimeoutRef.current);
        }
        // Small delay before hiding to allow moving to hover card
        hoverTimeoutRef.current = window.setTimeout(() => {
          setActiveLink(null);
        }, 200);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('note-link') || target.closest('.note-link')) {
        setActiveLink(null);
      }
    };

    container.addEventListener('mouseenter', handleMouseEnter, true);
    container.addEventListener('mouseleave', handleMouseLeave, true);
    container.addEventListener('click', handleClick, true);

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter, true);
      container.removeEventListener('mouseleave', handleMouseLeave, true);
      container.removeEventListener('click', handleClick, true);
      if (hoverTimeoutRef.current) {
        window.clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [notes, containerRef]);

  if (!activeLink) return null;

  const { title, rect, note } = activeLink;

  return createPortal(
    <div
      className="fixed z-50 pointer-events-auto"
      style={{
        left: rect.left,
        top: rect.bottom + 4,
      }}
      onMouseEnter={() => {
        if (hoverTimeoutRef.current) {
          window.clearTimeout(hoverTimeoutRef.current);
        }
      }}
      onMouseLeave={() => {
        setActiveLink(null);
      }}
    >
      <div className="bg-popover border rounded-lg shadow-lg w-80 overflow-hidden">
        {note ? (
          <>
            <div className="p-3 border-b flex items-start gap-2">
              <FileText className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">{note.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {note.linkedNotes.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Link2 className="w-3 h-3" />
                      {note.linkedNotes.length} conexão(ões)
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => onNavigate(note.title)}
                className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                title="Abrir nota"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 max-h-48 overflow-auto text-sm">
              <MarkdownPreview content={note.content.slice(0, 400)} />
            </div>
          </>
        ) : (
          <div className="p-4 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Nota não encontrada
            </p>
            <button
              onClick={() => onNavigate(title)}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Criar nota "{title}"
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default NoteLinkPreview;

