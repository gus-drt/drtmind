import { useState } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { NoteList } from '@/components/notes/NoteList';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { NoteGraph } from '@/components/notes/NoteGraph';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Menu, X, Network, FileText } from 'lucide-react';

const Index = () => {
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
    getLinks,
    navigateToNote,
  } = useNotes();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<'editor' | 'graph'>('editor');

  const links = getLinks();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } transition-all duration-300 border-r-2 border-border bg-sidebar flex-shrink-0 overflow-hidden`}
      >
        <div className="w-72 h-full">
          <NoteList
            notes={filteredNotes}
            selectedNoteId={selectedNoteId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectNote={setSelectedNoteId}
            onCreateNote={() => createNote()}
          />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <header className="flex items-center justify-between p-3 border-b-2 border-border bg-card">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="border-2"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>

          <Tabs
            value={activeView}
            onValueChange={(v) => setActiveView(v as 'editor' | 'graph')}
            className="flex-shrink-0"
          >
            <TabsList className="border-2 border-border">
              <TabsTrigger value="editor" className="gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Editor</span>
              </TabsTrigger>
              <TabsTrigger value="graph" className="gap-2">
                <Network className="w-4 h-4" />
                <span className="hidden sm:inline">Grafo</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="text-sm text-muted-foreground hidden sm:block">
            {notes.length} notas • {links.length} conexões
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {activeView === 'editor' ? (
            selectedNote ? (
              <NoteEditor
                note={selectedNote}
                onUpdate={updateNote}
                onDelete={deleteNote}
                onLinkClick={navigateToNote}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 border-2 border-border flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-bold mb-2">Nenhuma nota selecionada</h2>
                <p className="text-muted-foreground mb-4">
                  Selecione uma nota na barra lateral ou crie uma nova
                </p>
                <Button onClick={() => createNote()} className="border-2" variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Nova Nota
                </Button>
              </div>
            )
          ) : (
            <div className="h-full p-4">
              <NoteGraph
                notes={notes}
                links={links}
                selectedNoteId={selectedNoteId}
                onSelectNote={setSelectedNoteId}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
