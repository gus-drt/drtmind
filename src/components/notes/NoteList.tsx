import { Note } from '@/types/note';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, FileText, Loader2, Pin } from 'lucide-react';

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onTogglePin: (id: string) => void;
  pinnedCount: number;
  loading?: boolean;
}

export const NoteList = ({
  notes,
  selectedNoteId,
  searchQuery,
  onSearchChange,
  onSelectNote,
  onCreateNote,
  onTogglePin,
  pinnedCount,
  loading = false,
}: NoteListProps) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b-2 border-border">
        <h2 className="text-lg font-bold mb-3 sm:mb-4">MindFlow</h2>
        
        {/* Search */}
        <div className="relative mb-2 sm:mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar notas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 border-2 h-10"
          />
        </div>

        {/* Create button */}
        <Button
          onClick={onCreateNote}
          className="w-full border-2 h-10"
          variant="outline"
          disabled={loading}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Nota
        </Button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center p-4">
            {searchQuery ? 'Nenhuma nota encontrada' : 'Nenhuma nota ainda'}
          </p>
        ) : (
          <div className="space-y-1">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`w-full text-left p-3 sm:p-3 border-2 transition-all ${
                  selectedNoteId === note.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card border-border hover:border-primary hover:shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => onSelectNote(note.id)}
                    className="flex-1 text-left active:scale-[0.98]"
                  >
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate text-sm sm:text-base">{note.title}</h3>
                        <p className={`text-xs truncate mt-1 ${
                          selectedNoteId === note.id ? 'opacity-80' : 'text-muted-foreground'
                        }`}>
                          {note.content.replace(/[#*_\[\]`]/g, '').slice(0, 50)}...
                        </p>
                        {note.linkedNotes.length > 0 && (
                          <p className={`text-xs mt-1 ${
                            selectedNoteId === note.id ? 'opacity-70' : 'text-muted-foreground'
                          }`}>
                            🔗 {note.linkedNotes.length} conexão(ões)
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(note.id);
                    }}
                    className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                      note.pinned
                        ? selectedNoteId === note.id
                          ? 'text-primary-foreground'
                          : 'text-primary'
                        : selectedNoteId === note.id
                          ? 'text-primary-foreground/50 hover:text-primary-foreground'
                          : 'text-muted-foreground/50 hover:text-muted-foreground'
                    }`}
                    title={note.pinned ? 'Desafixar nota' : pinnedCount >= 3 ? 'Limite de 3 notas fixadas' : 'Fixar nota'}
                  >
                    <Pin className={`w-4 h-4 ${note.pinned ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t-2 border-border text-xs text-muted-foreground text-center">
        {loading ? 'Carregando...' : `${notes.length} nota(s)`}
      </div>
    </div>
  );
};
