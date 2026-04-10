import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { NoteList } from '@/components/notes/NoteList';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { NoteGraph } from '@/components/notes/NoteGraph';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLayoutPreferences } from '@/hooks/useLayoutPreferences';
import { useKeyboardShortcuts, formatShortcut } from '@/hooks/useKeyboardShortcuts';
import { Note, NoteLink } from '@/types/note';
import { Tag } from '@/hooks/useTags';
import {
  Network,
  FileText,
  Plus,
  Settings,
  Search,
  ChevronDown,
  Tag as TagIcon,
  Pin,
  CloudOff,
  RefreshCw,
  Cloud,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
} from 'lucide-react';

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
  const { preferences, toggleSidebar, cycleGraphPosition, cycleEditorMode } = useLayoutPreferences();
  const [showGraph, setShowGraph] = useState(true);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'n', ctrl: true, action: () => createNote(), description: 'Nova nota' },
    { key: 'g', ctrl: true, action: () => setShowGraph((prev) => !prev), description: 'Toggle grafo' },
    { key: 'b', ctrl: true, action: () => toggleSidebar(), description: 'Toggle sidebar' },
    { key: ',', ctrl: true, action: () => navigate('/settings'), description: 'Configurações' },
  ]);

  const handleSelectNote = useCallback((id: string) => {
    setSelectedNoteId(id);
  }, [setSelectedNoteId]);

  const cloudLabel = isAdmin ? '∞' : `${cloudNoteCount}/${cloudNoteLimit}`;
  const pinnedNotes = notes.filter((n) => n.pinned);

  return (
    <div className="h-screen flex flex-col bg-background">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Column 1: Navigation Sidebar */}
        {!preferences.sidebarCollapsed && (
          <>
            <ResizablePanel
              defaultSize={preferences.navigationWidth}
              minSize={12}
              maxSize={20}
              className="bg-sidebar"
            >
              <div className="h-full flex flex-col border-r">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <h1 className="font-bold text-lg flex items-center gap-2">
                    <Network className="w-5 h-5 text-primary" />
                    <span>GraphNotes</span>
                  </h1>
                  <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
                    <PanelLeftClose className="w-4 h-4" />
                  </Button>
                </div>

                {/* Search */}
                <div className="p-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-muted-foreground h-9"
                    onClick={() => {/* TODO: Open command palette */ }}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    <span>Buscar...</span>
                    <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                      {formatShortcut({ key: 'K', ctrl: true })}
                    </kbd>
                  </Button>
                </div>

                <ScrollArea className="flex-1 px-2">
                  {/* Quick Actions */}
                  <Collapsible defaultOpen className="mb-2">
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 text-sm font-medium hover:bg-accent rounded-lg">
                      <Sparkles className="w-4 h-4" />
                      <span>Ações Rápidas</span>
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-2 space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8"
                        onClick={() => createNote()}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Nota
                        <kbd className="ml-auto text-xs opacity-50">{formatShortcut({ key: 'N', ctrl: true })}</kbd>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8"
                        onClick={() => setShowGraph((prev) => !prev)}
                      >
                        <Network className="w-4 h-4 mr-2" />
                        {showGraph ? 'Ocultar' : 'Mostrar'} Grafo
                        <kbd className="ml-auto text-xs opacity-50">{formatShortcut({ key: 'G', ctrl: true })}</kbd>
                      </Button>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Tags */}
                  <Collapsible defaultOpen className="mb-2">
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 text-sm font-medium hover:bg-accent rounded-lg">
                      <TagIcon className="w-4 h-4" />
                      <span>Tags</span>
                      <span className="ml-auto text-xs text-muted-foreground">{tags.length}</span>
                      <ChevronDown className="w-4 h-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-2 space-y-1">
                      {tags.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-2">Nenhuma tag criada</p>
                      ) : (
                        tags.map((tag) => (
                          <Button
                            key={tag.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8"
                            onClick={() => {/* TODO: Filter by tag */ }}
                          >
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                          </Button>
                        ))
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Pinned Notes */}
                  <Collapsible defaultOpen className="mb-2">
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 text-sm font-medium hover:bg-accent rounded-lg">
                      <Pin className="w-4 h-4" />
                      <span>Fixadas</span>
                      <span className="ml-auto text-xs text-muted-foreground">{pinnedCount}/3</span>
                      <ChevronDown className="w-4 h-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-2 space-y-1">
                      {pinnedNotes.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-2">Nenhuma nota fixada</p>
                      ) : (
                        pinnedNotes.map((note) => (
                          <Button
                            key={note.id}
                            variant="ghost"
                            size="sm"
                            className={`w-full justify-start h-8 ${selectedNoteId === note.id ? 'bg-accent' : ''
                              }`}
                            onClick={() => handleSelectNote(note.id)}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            <span className="truncate">{note.title}</span>
                          </Button>
                        ))
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </ScrollArea>

                {/* Footer */}
                <div className="p-3 border-t space-y-2">
                  {/* Sync Status */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{notes.length} notas • {links.length} conexões</span>
                    {useCloud && (
                      <div className="flex items-center gap-1">
                        {!isOnline ? (
                          <CloudOff className="w-3 h-3 text-destructive" />
                        ) : isSyncing ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                        ) : (
                          <Cloud className="w-3 h-3" />
                        )}
                        <span>☁️ {cloudLabel}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => navigate('/settings')}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações
                  </Button>
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        {/* Collapsed Sidebar Toggle */}
        {preferences.sidebarCollapsed && (
          <div className="w-12 border-r flex flex-col items-center py-4 bg-sidebar">
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mb-4">
              <PanelLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => createNote()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Column 2: Note List */}
        <ResizablePanel defaultSize={preferences.listPanelWidth} minSize={15} maxSize={30}>
          <NoteList
            notes={filteredNotes}
            selectedNoteId={selectedNoteId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectNote={handleSelectNote}
            onCreateNote={createNote}
            onTogglePin={togglePinNote}
            pinnedCount={pinnedCount}
            getTagsForNote={getTagsForNote}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Column 3: Editor + Graph */}
        <ResizablePanel defaultSize={65 - (preferences.sidebarCollapsed ? 0 : preferences.navigationWidth)}>
          <div className="h-full flex flex-col relative">
            {selectedNote ? (
              <>
                <NoteEditor
                  note={selectedNote}
                  onUpdate={updateNote}
                  onDelete={deleteNote}
                  onLinkClick={navigateToNote}
                  allTags={tags}
                  noteTags={getTagsForNote(selectedNote.id)}
                  onAddTag={(tagId) => addTagToNote(selectedNote.id, tagId)}
                  onRemoveTag={(tagId) => removeTagFromNote(selectedNote.id, tagId)}
                  onCreateTag={createTag}
                />

                {/* Floating Graph */}
                {showGraph && (
                  <div className="absolute bottom-4 right-4 w-80 h-60 rounded-xl border shadow-xl bg-background/95 backdrop-blur overflow-hidden z-10">
                    <div className="absolute top-2 left-3 text-xs font-medium text-muted-foreground z-20">
                      Grafo Local
                    </div>
                    <NoteGraph
                      notes={notes}
                      links={links}
                      selectedNoteId={selectedNoteId}
                      onSelectNote={handleSelectNote}
                      isActive={true}
                      getTagsForNote={getTagsForNote}
                    />
                  </div>
                )}
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
                <Button onClick={() => createNote()} size="lg" className="rounded-full px-8">
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
  );
};

export default DesktopLayout;

