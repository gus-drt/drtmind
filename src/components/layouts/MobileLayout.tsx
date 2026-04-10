import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NoteList } from '@/components/notes/NoteList';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { NoteGraph } from '@/components/notes/NoteGraph';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Menu, Network, FileText, Plus, Settings, CloudOff, RefreshCw, Cloud } from 'lucide-react';
import { Note, NoteLink } from '@/types/note';
import { Tag } from '@/hooks/useTags';

interface MobileLayoutProps {
  notes: Note[];
  filteredNotes: Note[];
  selectedNote: Note | undefined;
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  createNote: () => void;
  updateNote: (id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;
  pinnedCount: number;
  links: NoteLink[];
  navigateToNote: (title: string) => void;
  cloudNoteCount: number;
  cloudNoteLimit: number;
  isAdmin: boolean;
  useCloud: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  tags: Tag[];
  createTag: (name: string, color: string) => Promise<Tag | null>;
  addTagToNote: (noteId: string, tagId: string) => void;
  removeTagFromNote: (noteId: string, tagId: string) => void;
  getTagsForNote: (noteId: string) => Tag[];
}

export const MobileLayout = ({
  notes,
  filteredNotes,
  selectedNote,
  selectedNoteId,
  setSelectedNoteId,
  searchQuery,
  setSearchQuery,
  createNote,
  updateNote,
  deleteNote,
  togglePinNote,
  pinnedCount,
  links,
  navigateToNote,
  cloudNoteCount,
  cloudNoteLimit,
  isAdmin,
  useCloud,
  isOnline,
  isSyncing,
  tags,
  createTag,
  addTagToNote,
  removeTagFromNote,
  getTagsForNote,
}: MobileLayoutProps) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<'editor' | 'graph'>('editor');
  const [cameFromGraph, setCameFromGraph] = useState(false);
  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  const bottomBarRef = useRef<HTMLElement>(null);

  // Measure bottom bar height dynamically
  useEffect(() => {
    const el = bottomBarRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        setBottomBarHeight(Math.ceil(h));
      }
    });
    observer.observe(el);
    setBottomBarHeight(Math.ceil(el.getBoundingClientRect().height));
    return () => observer.disconnect();
  }, []);

  // Handle note selection
  const handleSelectNote = (id: string) => {
    setSelectedNoteId(id);
    if (activeView === 'graph') {
      setCameFromGraph(true);
      setActiveView('editor');
    }
    setSidebarOpen(false);
  };

  const handleBackToGraph = useCallback(() => {
    setCameFromGraph(false);
    setActiveView('graph');
  }, []);

  const cloudLabel = isAdmin ? '☁️ ∞' : `☁️ ${cloudNoteCount}/${cloudNoteLimit}`;

  const sidebarContent = (
    <NoteList
      notes={filteredNotes}
      selectedNoteId={selectedNoteId}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSelectNote={handleSelectNote}
      onCreateNote={() => {
        createNote();
        setSidebarOpen(false);
      }}
      onTogglePin={togglePinNote}
      pinnedCount={pinnedCount}
      getTagsForNote={getTagsForNote}
    />
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden relative">
      {/* Main content area with padding for bottom bar */}
      <main className="flex-1 overflow-hidden relative">
        {/* Editor view */}
        <div
          className={`absolute inset-x-0 top-0 transition-all duration-300 ease-out ${activeView === 'editor'
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 -translate-x-8 pointer-events-none'
            }`}
          style={{ bottom: bottomBarHeight > 0 ? `${bottomBarHeight + 32}px` : 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {selectedNote ? (
            <NoteEditor
              note={selectedNote}
              onUpdate={updateNote}
              onDelete={deleteNote}
              onLinkClick={navigateToNote}
              onBackToGraph={cameFromGraph ? handleBackToGraph : undefined}
              allTags={tags}
              noteTags={getTagsForNote(selectedNote.id)}
              onAddTag={(tagId) => addTagToNote(selectedNote.id, tagId)}
              onRemoveTag={(tagId) => removeTagFromNote(selectedNote.id, tagId)}
              onCreateTag={createTag}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Nenhuma nota selecionada</h2>
              <p className="text-muted-foreground mb-4 max-w-xs">
                Selecione uma nota ou crie uma nova para começar
              </p>
              <Button onClick={() => createNote()} className="rounded-full px-6 shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Nova Nota
              </Button>
            </div>
          )}
        </div>

        {/* Graph view */}
        <div
          className={`absolute inset-x-0 top-0 transition-all duration-300 ease-out ${activeView === 'graph'
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-8 pointer-events-none'
            }`}
          style={{ bottom: bottomBarHeight > 0 ? `${bottomBarHeight + 32}px` : 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <NoteGraph
            notes={notes}
            links={links}
            selectedNoteId={selectedNoteId}
            onSelectNote={handleSelectNote}
            isActive={activeView === 'graph'}
            getTagsForNote={getTagsForNote}
          />
        </div>
      </main>

      {/* Mobile Sheet for notes list */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="bottom" className="p-0 h-[85vh] rounded-t-2xl">
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Floating Bottom Bar */}
      <nav ref={bottomBarRef} className="fixed bottom-4 left-4 right-4 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="glass-heavy rounded-2xl px-2 py-2 flex flex-col items-center max-w-md mx-auto gap-1">
          <div className="flex items-center justify-between w-full">
            {/* Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="h-12 w-12 rounded-xl hover:bg-accent"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Editor Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveView('editor')}
              className={`h-12 w-12 rounded-xl transition-all ${activeView === 'editor'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'hover:bg-accent'
                }`}
            >
              <FileText className="w-5 h-5" />
            </Button>

            {/* Central FAB - Create Note */}
            <Button
              onClick={() => createNote()}
              className="h-12 w-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-6 h-6" />
            </Button>

            {/* Graph Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveView('graph')}
              className={`h-12 w-12 rounded-xl transition-all ${activeView === 'graph'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'hover:bg-accent'
                }`}
            >
              <Network className="w-5 h-5" />
            </Button>

            {/* Settings Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/settings')}
              className="h-12 w-12 rounded-xl hover:bg-accent"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>

          {/* Stats indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
            <span>
              {notes.length} notas • {links.length} conexões • {cloudLabel}
            </span>

            {/* Sync Status Badge */}
            {useCloud && (
              <div className="flex items-center border-l border-border pl-2 border-opacity-50">
                {!isOnline ? (
                  <span className="flex items-center gap-1 text-destructive" title="Offline - Alterações salvas localmente">
                    <CloudOff className="w-3 h-3" />
                    <span className="max-sm:hidden">Offline</span>
                  </span>
                ) : isSyncing ? (
                  <span className="flex items-center gap-1 text-primary" title="Sincronizando...">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span className="max-sm:hidden">Syncing</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground opacity-70" title="Sincronizado">
                    <Cloud className="w-3 h-3" />
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default MobileLayout;

