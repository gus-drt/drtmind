import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Share2, Copy, Check, Lock, Globe, Settings2, FileText, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Note } from '@/types/note';

interface SharePopoverProps {
  noteId: string;
  isPublic: boolean;
  onTogglePublic: (id?: string) => void;
  linkedNotesData?: Note[];
  /** Optional: render as icon-only button (desktop toolbar) */
  compact?: boolean;
}

export const SharePopover = ({
  noteId,
  isPublic,
  onTogglePublic,
  linkedNotesData = [],
  compact = false,
}: SharePopoverProps) => {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const publicUrl = `${window.location.origin}/s/${noteId}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = publicUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [publicUrl]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {compact ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 transition-colors ${isPublic ? 'text-primary' : ''}`}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Compartilhar</TooltipContent>
        </Tooltip>
      ) : (
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-9 w-9 p-0 rounded-xl transition-colors ${isPublic ? 'text-primary' : ''}`}
            title="Compartilhar"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
      )}
      <PopoverContent
        className="w-80 p-0 rounded-xl border border-border/50 shadow-xl"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Share2 className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Compartilhar Nota</h4>
        </div>

        {/* Toggle */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPublic ? (
                <Globe className="w-4 h-4 text-primary" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {isPublic ? 'Pública' : 'Privada'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPublic
                    ? 'Qualquer pessoa com o link pode ver'
                    : 'Apenas você tem acesso'}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={() => onTogglePublic(noteId)}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>

        {/* Link field — visible only when public */}
        {isPublic && (
          <div className="px-4 pb-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-border/30">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 text-xs bg-transparent border-none outline-none text-muted-foreground select-all truncate"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 w-7 p-0 flex-shrink-0 rounded-md"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>

            {/* Preview link */}
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
            >
              <Globe className="w-3 h-3" />
              Preview como visitante →
            </a>
          </div>
        )}

        {/* Advanced Config / Linked Notes Config */}
        {linkedNotesData.length > 0 && (
          <div className="px-4 pb-3">
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full flex items-center justify-between h-8 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted/50 px-2 group">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-3.5 h-3.5" />
                    Configurações avançadas
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                <p className="text-[11px] text-muted-foreground mb-2 px-1">
                  Visibilidade das notas linkadas neste documento:
                </p>
                <div className="max-h-32 overflow-y-auto pr-1 space-y-1">
                  {linkedNotesData.map(lNote => (
                    <div key={lNote.id} className="flex items-center justify-between bg-muted/30 hover:bg-muted/50 rounded border border-border/30 p-2 transition-colors">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <FileText className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
                        <span className="text-xs truncate font-medium">{lNote.title}</span>
                      </div>
                      <Switch
                        checked={lNote.isPublic}
                        onCheckedChange={() => onTogglePublic(lNote.id)}
                        className="data-[state=checked]:bg-primary scale-[0.7] transform origin-right flex-shrink-0"
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Info footer */}
        <div className="px-4 py-3 border-t border-border/30 bg-muted/20 rounded-b-xl">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {isPublic ? (
              <>
                <span className="font-medium">Nota:</span> Links internos{' '}
                <code className="px-1 py-0.5 bg-muted rounded text-[10px]">[[nota]]</code>{' '}
                que forem mantidos como privados não serão navegáveis publicamente.
              </>
            ) : (
              'Ative o compartilhamento para gerar um link público de leitura.'
            )}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
