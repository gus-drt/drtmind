import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NavigationSidebar } from '@/components/desktop/NavigationSidebar';
import { NoteListPanel } from '@/components/desktop/NoteListPanel';
import { Note } from '@/types/note';
import { Tag } from '@/hooks/useTags';
import { List, Menu } from 'lucide-react';

interface UnifiedSidebarProps {
  // Shared props
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string, mode?: 'edit' | 'preview') => void;
  onCreateNote: () => void;
  pinnedCount: number;
  
  // NavigationSidebar specific
  tags: Tag[];
  onToggleGraph: () => void;
  onOpenCommandPalette: () => void;
  onToggleSidebar: () => void;
  showGraph: boolean;
  useCloud: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  cloudNoteCount: number;
  cloudNoteLimit: number;
  isAdmin: boolean;
  linksCount: number;
  selectedTagId: string | null;
  onSelectTag: (id: string | null) => void;
  
  // NoteListPanel specific
  displayedNotes: Note[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  getTagsForNote: (noteId: string) => Tag[];
}

export const UnifiedSidebar = (props: UnifiedSidebarProps) => {
  const [activeTab, setActiveTab] = useState<string>('menu');

  return (
    <div className="h-full flex flex-col bg-background/50 border-r backdrop-blur-sm relative overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col pt-2 w-full">
        <div className="px-4 pb-2 border-b">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="menu" className="text-xs">
              <Menu className="w-4 h-4 mr-2" />
              Menu
            </TabsTrigger>
            <TabsTrigger value="list" className="text-xs">
              <List className="w-4 h-4 mr-2" />
              Notas
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="menu" className="flex-1 min-h-0 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col">
          <div className="flex-1 flex flex-col w-full relative min-h-0">
            <NavigationSidebar
              notes={props.notes}
              tags={props.tags}
              pinnedCount={props.pinnedCount}
              selectedNoteId={props.selectedNoteId}
              onSelectNote={props.onSelectNote}
              onCreateNote={props.onCreateNote}
              onToggleGraph={props.onToggleGraph}
              onOpenCommandPalette={props.onOpenCommandPalette}
              onToggleSidebar={props.onToggleSidebar}
              showGraph={props.showGraph}
              useCloud={props.useCloud}
              isOnline={props.isOnline}
              isSyncing={props.isSyncing}
              cloudNoteCount={props.cloudNoteCount}
              cloudNoteLimit={props.cloudNoteLimit}
              isAdmin={props.isAdmin}
              linksCount={props.linksCount}
              selectedTagId={props.selectedTagId}
              onSelectTag={props.onSelectTag}
            />
          </div>
        </TabsContent>

        <TabsContent value="list" className="flex-1 min-h-0 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col">
          <div className="flex-1 flex flex-col w-full relative min-h-0">
            <NoteListPanel
              notes={props.displayedNotes}
              selectedNoteId={props.selectedNoteId}
              searchQuery={props.searchQuery}
              onSearchChange={props.onSearchChange}
              onSelectNote={props.onSelectNote}
              onCreateNote={props.onCreateNote}
              onDeleteNote={props.onDeleteNote}
              onTogglePin={props.onTogglePin}
              pinnedCount={props.pinnedCount}
              getTagsForNote={props.getTagsForNote}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
