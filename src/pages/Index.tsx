import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotesDb';
import { useTags } from '@/hooks/useTags';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSwipe } from '@/hooks/useSwipe';
import { NoteList } from '@/components/notes/NoteList';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { NoteGraph } from '@/components/notes/NoteGraph';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Menu, Network, FileText, Loader2, Plus, Settings } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  
  const {
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
    getLinks,
    navigateToNote,
    loading: notesLoading,
  } = useNotes();

  const { tags, createTag, addTagToNote, removeTagFromNote, getTagsForNote } = useTags();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<'editor' | 'graph'>('editor');
  const [cameFromGraph, setCameFromGraph] = useState(false);

  // Swipe gestures for switching views
  const handleSwipeLeft = useCallback(() => {
    if (!sidebarOpen) {
      setActiveView('graph');
    }
  }, [sidebarOpen]);

  const handleSwipeRight = useCallback(() => {
    if (!sidebarOpen) {
      setActiveView('editor');
    } else {
      setSidebarOpen(false);
    }
  }, [sidebarOpen]);

  useSwipe({
    onSwipeRight: handleSwipeRight,
    onSwipeLeft: handleSwipeLeft,
    threshold: 50,
    edgeWidth: 30,
    edgeOnly: false,
  });

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

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const links = getLinks();

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

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
      loading={notesLoading}
      getTagsForNote={getTagsForNote}
    />
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden relative">
      {/* Main content area with padding for bottom bar */}
      <main className="flex-1 overflow-hidden pb-20">
        {notesLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Editor view */}
            <div
              className={`absolute inset-0 pb-20 transition-all duration-300 ease-out ${
                activeView === 'editor'
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 -translate-x-8 pointer-events-none'
              }`}
            >
              {selectedNote ? (
                <NoteEditor
                  note={selectedNote}
                  onUpdate={updateNote}
                  onDelete={deleteNote}
                  onLinkClick={navigateToNote}
                  onBackToGraph={cameFromGraph ? handleBackToGraph : undefined}
                  allTags={tags}
                  noteTags={selectedNote ? getTagsForNote(selectedNote.id) : []}
                  onAddTag={(tagId) => selectedNote && addTagToNote(selectedNote.id, tagId)}
                  onRemoveTag={(tagId) => selectedNote && removeTagFromNote(selectedNote.id, tagId)}
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
                  <Button 
                    onClick={() => createNote()} 
                    className="rounded-full px-6 shadow-md"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Nota
                  </Button>
                </div>
              )}
            </div>

            {/* Graph view */}
            <div
              className={`absolute inset-0 pb-20 transition-all duration-300 ease-out ${
                activeView === 'graph'
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 translate-x-8 pointer-events-none'
              }`}
            >
              <div className="h-full">
                <NoteGraph
                  notes={notes}
                  links={links}
                  selectedNoteId={selectedNoteId}
                  onSelectNote={handleSelectNote}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Mobile/Desktop Sheet for notes list */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent 
          side={isMobile ? "bottom" : "left"} 
          className={`p-0 ${isMobile ? 'h-[85vh] rounded-t-2xl' : 'w-80'}`}
        >
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Floating Bottom Bar */}
      <nav className="fixed bottom-4 left-4 right-4 z-50">
        <div className="glass-heavy rounded-2xl px-2 py-2 flex items-center justify-between max-w-md mx-auto">
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
            className={`h-12 w-12 rounded-xl transition-all ${
              activeView === 'editor' 
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
            className={`h-12 w-12 rounded-xl transition-all ${
              activeView === 'graph' 
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
        <div className="text-center mt-2">
          <span className="text-xs text-muted-foreground">
            {notes.length} notas • {links.length} conexões
          </span>
        </div>
      </nav>
    </div>
  );
};

export default Index;
