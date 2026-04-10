import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    category: 'Geral',
    items: [
      { keys: ['Cmd', 'K'], description: 'Abrir paleta de comandos' },
      { keys: ['Cmd', 'N'], description: 'Nova nota' },
      { keys: ['Cmd', 'G'], description: 'Alternar grafo' },
      { keys: ['Cmd', 'Shift', 'S'], description: 'Sincronizar notas' },
      { keys: ['Cmd', '/'], description: 'Mostrar atalhos' },
      { keys: ['Esc'], description: 'Limpar filtro / Fechar modal' },
    ],
  },
  {
    category: 'Navegação',
    items: [
      { keys: ['↑', '↓'], description: 'Navegar entre notas' },
      { keys: ['Enter'], description: 'Abrir nota selecionada' },
      { keys: ['Tab'], description: 'Mover entre painéis' },
    ],
  },
  {
    category: 'Editor',
    items: [
      { keys: ['[['], description: 'Inserir link para nota' },
      { keys: ['Cmd', 'B'], description: 'Negrito' },
      { keys: ['Cmd', 'I'], description: 'Itálico' },
      { keys: ['Cmd', 'S'], description: 'Salvar nota' },
    ],
  },
];

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  
  const formatKey = (key: string) => {
    if (key === 'Cmd') return isMac ? '⌘' : 'Ctrl';
    if (key === 'Shift') return isMac ? '⇧' : 'Shift';
    if (key === 'Alt') return isMac ? '⌥' : 'Alt';
    return key;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ⌨️ Atalhos de Teclado
          </DialogTitle>
          <DialogDescription>
            Use estes atalhos para navegar rapidamente pelo GraphNotes
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                {section.category}
              </h4>
              <div className="space-y-2">
                {section.items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-0.5">
                          <Kbd>{formatKey(key)}</Kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="pt-4 border-t text-xs text-muted-foreground text-center">
          Pressione <Kbd>?</Kbd> ou <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd><span className="mx-0.5">+</span><Kbd>/</Kbd> para mostrar este diálogo
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsDialog;

