import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotesDb';
import { useTags } from '@/hooks/useTags';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileLayout } from '@/components/layouts/MobileLayout';
import { DesktopLayout } from '@/components/layouts/DesktopLayout';
import { Loader2 } from 'lucide-react';

/**
 * Index page - Layout Switcher
 *
 * This component acts as the main entry point and switches between
 * MobileLayout and DesktopLayout based on screen size.
 * All business logic (hooks) is shared between both layouts.
 */
const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();

  // Shared business logic hooks
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
    cloudNoteCount,
    cloudNoteLimit,
    isAdmin,
    useCloud,
    isOnline,
    isSyncing,
  } = useNotes();

  const { tags, createTag, addTagToNote, removeTagFromNote, getTagsForNote } = useTags();

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

  // Show loading while fetching notes
  if (notesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Shared props for both layouts
  const layoutProps = {
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
  };

  // Render appropriate layout based on screen size
  return isMobile ? (
    <MobileLayout {...layoutProps} />
  ) : (
    <DesktopLayout {...layoutProps} />
  );
};

export default Index;
