import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useLayoutPreferences } from '@/hooks/useLayoutPreferences';
import { useKeyboardShortcuts, formatShortcut } from '@/hooks/useKeyboardShortcuts';
import { Note, NoteLink } from '@/types/note';
import { Tag } from '@/hooks/useTags';
import { toast } from 'sonner';

// Desktop components
import { NavigationSidebar } from '@/components/desktop/NavigationSidebar';
import { NoteListPanel } from '@/components/desktop/NoteListPanel';
import { EditorPanel } from '@/components/desktop/EditorPanel';
import { GraphPanel, GraphPosition } from '@/components/desktop/GraphPanel';
import { CommandPalette } from '@/components/desktop/CommandPalette';
import { StatusBar } from '@/components/desktop/StatusBar';
import { KeyboardShortcutsDialog } from '@/components/desktop/KeyboardShortcutsDialog';

import { FileText, Plus, PanelLeft, Network } from 'lucide-react';

interface DesktopLayoutProps {
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

export const DesktopLayout = ({
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
}: DesktopLayoutProps) => {
  const navigate = useNavigate();
  const { preferences, toggleSidebar, updatePreferences } = useLayoutPreferences();
  const [showGraph, setShowGraph] = useState(preferences.graphPosition !== 'hidden');
  const [graphPosition, setGraphPosition] = useState<GraphPosition>(
    preferences.graphPosition === 'hidden' ? 'floating' : preferences.graphPosition as GraphPosition
  );
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  // Persist graph position changes
  const handleGraphPositionChange = useCallback((position: GraphPosition) => {
    setGraphPosition(position);
    if (position !== 'fullscreen') {
      updatePreferences({ graphPosition: position });
    }
  }, [updatePreferences]);

  const handleToggleGraph = useCallback(() => {
    setShowGraph((prev) => {
      const newValue = !prev;
      const posToSave = graphPosition === 'fullscreen' ? 'floating' : graphPosition;
      updatePreferences({ graphPosition: newValue ? posToSave : 'hidden' });
      return newValue;
    });
  }, [graphPosition, updatePreferences]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'n', ctrl: true, action: () => createNote(), description: 'Nova nota' },
    { key: 'g', ctrl: true, action: handleToggleGraph, description: 'Toggle grafo' },
    { key: 'b', ctrl: true, action: () => toggleSidebar(), description: 'Toggle sidebar' },
    { key: ',', ctrl: true, action: () => navigate('/settings'), description: 'Configurações' },
    { key: 'k', ctrl: true, action: () => setCommandPaletteOpen(true), description: 'Paleta de comandos' },
    { key: '/', ctrl: true, action: () => setShortcutsDialogOpen(true), description: 'Atalhos de teclado' },
    { key: '?', action: () => setShortcutsDialogOpen(true), description: 'Atalhos de teclado' },
    { key: 'Escape', action: () => setSelectedTagId(null), description: 'Limpar filtro' },
  ]);

  const handleSelectNote = useCallback((id: string) => {
    setSelectedNoteId(id);
  }, [setSelectedNoteId]);

  const handleCreateNote = useCallback(() => {
    createNote();
    toast.success('Nova nota criada!', {
      description: 'Uma nova nota foi adicionada à sua coleção',
      duration: 2000,
    });
  }, [createNote]);

  const handleDeleteNote = useCallback((id: string) => {
    const noteTitle = notes.find(n => n.id === id)?.title || 'Nota';
    deleteNote(id);
    toast.success('Nota excluída', {
      description: `"${noteTitle}" foi removida`,
      duration: 2000,
    });
  }, [deleteNote, notes]);

  // Filter notes by selected tag
  const displayedNotes = useMemo(() => {
    if (!selectedTagId) return filteredNotes;
    return filteredNotes.filter((note) =>
      getTagsForNote(note.id).some((tag) => tag.id === selectedTagId)
    );
  }, [filteredNotes, selectedTagId, getTagsForNote]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <div className="flex-1 flex min-h-0">
          {/* Collapsed Sidebar Toggle - Outside ResizablePanelGroup to avoid layout calculation bugs */}
          {preferences.sidebarCollapsed && (
            <div className="w-12 border-r flex flex-col items-center py-4 bg-sidebar gap-2 flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                <PanelLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCreateNote}>
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleGraph}
                className={showGraph ? 'bg-accent' : ''}
              >
                <Network className="w-4 h-4" />
              </Button>
            </div>
          )}

          <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Column 1: Navigation Sidebar */}
          {!preferences.sidebarCollapsed && (
            <>
              <ResizablePanel
                id="sidebar-panel"
                order={1}
                defaultSize={preferences.navigationWidth}
                onResize={(size) => updatePreferences({ navigationWidth: size })}
                minSize={12}
                maxSize={20}
                className="bg-sidebar"
              >
                <NavigationSidebar
                  notes={notes}
                  tags={tags}
                  pinnedCount={pinnedCount}
                  selectedNoteId={selectedNoteId}
                  onSelectNote={handleSelectNote}
                  onCreateNote={handleCreateNote}
                  onToggleGraph={handleToggleGraph}
                  onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                  onToggleSidebar={toggleSidebar}
                  showGraph={showGraph}
                  useCloud={useCloud}
                  isOnline={isOnline}
                  isSyncing={isSyncing}
                  cloudNoteCount={cloudNoteCount}
                  cloudNoteLimit={cloudNoteLimit}
                  isAdmin={isAdmin}
                  linksCount={links.length}
                  selectedTagId={selectedTagId}
                  onSelectTag={setSelectedTagId}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          {/* Column 2: Note List */}
          <ResizablePanel 
            id="list-panel"
            order={2}
            defaultSize={preferences.listPanelWidth} 
            onResize={(size) => updatePreferences({ listPanelWidth: size })}
            minSize={15} 
            maxSize={30}
          >
            <NoteListPanel
              notes={displayedNotes}
              selectedNoteId={selectedNoteId}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectNote={handleSelectNote}
              onCreateNote={handleCreateNote}
              onDeleteNote={handleDeleteNote}
              onTogglePin={togglePinNote}
              pinnedCount={pinnedCount}
              getTagsForNote={getTagsForNote}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Column 3: Editor + Graph */}
          <ResizablePanel 
            id="editor-panel"
            order={3}
            defaultSize={65 - (preferences.sidebarCollapsed ? 0 : preferences.navigationWidth)}
          >
            <div className="h-full flex flex-col relative">
              {selectedNote ? (
                <>
                  <EditorPanel
                    note={selectedNote}
                    notes={notes}
                    onUpdate={updateNote}
                    onDelete={handleDeleteNote}
                    onLinkClick={navigateToNote}
                    allTags={tags}
                    noteTags={getTagsForNote(selectedNote.id)}
                    onAddTag={(tagId) => addTagToNote(selectedNote.id, tagId)}
                    onRemoveTag={(tagId) => removeTagFromNote(selectedNote.id, tagId)}
                    onCreateTag={createTag}
                    defaultMode={preferences.defaultEditorMode}
                  />

                  {/* Graph Panel */}
                  <GraphPanel
                    notes={notes}
                    links={links}
                    selectedNoteId={selectedNoteId}
                    onSelectNote={handleSelectNote}
                    getTagsForNote={getTagsForNote}
                    position={graphPosition}
                    onPositionChange={handleGraphPositionChange}
                    onClose={() => setShowGraph(false)}
                    isVisible={showGraph}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
                    <FileText className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-3">Nenhuma nota selecionada</h2>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Selecione uma nota da lista ou crie uma nova para começar a escrever
                  </p>
                  <Button onClick={createNote} size="lg" className="rounded-full px-8">
                    <Plus className="w-5 h-5 mr-2" />
                    Nova Nota
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4">
                    ou pressione <kbd className="px-1.5 py-0.5 bg-muted rounded">{formatShortcut({ key: 'N', ctrl: true })}</kbd>
                  </p>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
        </div>

        {/* Status Bar */}
        <StatusBar
          noteCount={notes.length}
          linkCount={links.length}
          tagCount={tags.length}
          cloudNoteCount={cloudNoteCount}
          cloudNoteLimit={cloudNoteLimit}
          isAdmin={isAdmin}
          useCloud={useCloud}
          isOnline={isOnline}
          isSyncing={isSyncing}
          selectedNoteTitle={selectedNote?.title}
          showGraph={showGraph}
          sidebarCollapsed={preferences.sidebarCollapsed}
        />

        {/* Command Palette */}
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          notes={notes}
          tags={tags}
          onSelectNote={handleSelectNote}
          onCreateNote={handleCreateNote}
          onToggleGraph={() => setShowGraph((prev) => !prev)}
          onDeleteNote={handleDeleteNote}
          getTagsForNote={getTagsForNote}
        />

        {/* Keyboard Shortcuts Dialog */}
        <KeyboardShortcutsDialog
          open={shortcutsDialogOpen}
          onOpenChange={setShortcutsDialogOpen}
        />
      </div>
    </TooltipProvider>
  );
};

export default DesktopLayout;

