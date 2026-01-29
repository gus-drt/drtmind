import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotesDb';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSwipe } from '@/hooks/useSwipe';
import { NoteList } from '@/components/notes/NoteList';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { NoteGraph } from '@/components/notes/NoteGraph';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Menu, Network, FileText, LogOut, Loader2, Plus, X } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
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

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [activeView, setActiveView] = useState<'editor' | 'graph'>('editor');

  // Swipe gestures for opening/closing sidebar
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  
  useSwipe({
    onSwipeRight: openSidebar,
    onSwipeLeft: sidebarOpen ? closeSidebar : undefined,
    threshold: 50,
    edgeWidth: 30,
    edgeOnly: !sidebarOpen, // Only require edge for opening, allow anywhere for closing
  });

  // Close sidebar on mobile when note is selected
  const handleSelectNote = (id: string) => {
    setSelectedNoteId(id);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Update sidebar state when screen size changes
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

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
        if (isMobile) setSidebarOpen(false);
      }}
      onTogglePin={togglePinNote}
      pinnedCount={pinnedCount}
      loading={notesLoading}
    />
  );

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden relative">
      {/* Desktop Sidebar - Overlay mode with animation */}
      {!isMobile && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
              sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar */}
          <aside
            className={`fixed left-0 top-0 h-full w-72 z-50 border-r-2 border-border bg-sidebar shadow-lg transition-transform duration-300 ease-out ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 h-8 w-8 p-0 z-10"
            >
              <X className="w-4 h-4" />
            </Button>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Mobile Sidebar Sheet */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <header className="flex items-center justify-between p-2 sm:p-3 border-b-2 border-border bg-card gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="border-2 h-9 w-9 p-0 sm:h-auto sm:w-auto sm:px-3"
            >
              <Menu className="w-4 h-4" />
            </Button>
            
            {/* Quick create on mobile */}
            {isMobile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => createNote()}
                className="border-2 h-9 w-9 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>

          <Tabs
            value={activeView}
            onValueChange={(v) => setActiveView(v as 'editor' | 'graph')}
            className="flex-shrink-0"
          >
            <TabsList className="border-2 border-border h-9">
              <TabsTrigger value="editor" className="gap-1 sm:gap-2 px-2 sm:px-3 h-7">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Editor</span>
              </TabsTrigger>
              <TabsTrigger value="graph" className="gap-1 sm:gap-2 px-2 sm:px-3 h-7">
                <Network className="w-4 h-4" />
                <span className="hidden sm:inline">Grafo</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm text-muted-foreground hidden md:block">
              {notes.length} notas • {links.length} conexões
            </span>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="border-2 h-9 w-9 p-0 sm:h-auto sm:w-auto sm:px-3"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Sair</span>
            </Button>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {notesLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : activeView === 'editor' ? (
            selectedNote ? (
              <NoteEditor
                note={selectedNote}
                onUpdate={updateNote}
                onDelete={deleteNote}
                onLinkClick={navigateToNote}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-border flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold mb-2">Nenhuma nota selecionada</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  {isMobile ? 'Toque no menu para ver suas notas' : 'Selecione uma nota na barra lateral ou crie uma nova'}
                </p>
                <Button onClick={() => createNote()} className="border-2" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Nota
                </Button>
              </div>
            )
          ) : (
            <div className="h-full p-2 sm:p-4">
              <NoteGraph
                notes={notes}
                links={links}
                selectedNoteId={selectedNoteId}
                onSelectNote={handleSelectNote}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
