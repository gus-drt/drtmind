import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface NoteTag {
  note_id: string;
  tag_id: string;
}

const TAG_COLORS = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#ef4444', // red
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
];

export const getTagColors = () => TAG_COLORS;

export const useTags = () => {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [noteTags, setNoteTags] = useState<NoteTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    if (!user) {
      setTags([]);
      setNoteTags([]);
      setLoading(false);
      return;
    }

    try {
      const [tagsRes, noteTagsRes] = await Promise.all([
        supabase.from('tags').select('*').eq('user_id', user.id).order('name'),
        supabase.from('note_tags').select('*'),
      ]);

      if (tagsRes.error) throw tagsRes.error;
      if (noteTagsRes.error) throw noteTagsRes.error;

      setTags((tagsRes.data || []).map(t => ({ id: t.id, name: t.name, color: t.color })));
      setNoteTags((noteTagsRes.data || []).map(nt => ({ note_id: nt.note_id, tag_id: nt.tag_id })));
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const createTag = useCallback(async (name: string, color: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({ user_id: user.id, name: name.trim(), color })
        .select()
        .single();

      if (error) throw error;

      const newTag: Tag = { id: data.id, name: data.name, color: data.color };
      setTags(prev => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
      return newTag;
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Tag já existe');
      } else {
        toast.error('Erro ao criar tag');
      }
      return null;
    }
  }, [user]);

  const deleteTag = useCallback(async (tagId: string) => {
    try {
      const { error } = await supabase.from('tags').delete().eq('id', tagId);
      if (error) throw error;

      setTags(prev => prev.filter(t => t.id !== tagId));
      setNoteTags(prev => prev.filter(nt => nt.tag_id !== tagId));
      toast.success('Tag removida');
    } catch (error) {
      toast.error('Erro ao remover tag');
    }
  }, []);

  const addTagToNote = useCallback(async (noteId: string, tagId: string) => {
    try {
      const { error } = await supabase
        .from('note_tags')
        .insert({ note_id: noteId, tag_id: tagId });

      if (error) {
        if (error.code === '23505') return; // already exists
        throw error;
      }

      setNoteTags(prev => [...prev, { note_id: noteId, tag_id: tagId }]);
    } catch (error) {
      toast.error('Erro ao adicionar tag');
    }
  }, []);

  const removeTagFromNote = useCallback(async (noteId: string, tagId: string) => {
    try {
      const { error } = await supabase
        .from('note_tags')
        .delete()
        .eq('note_id', noteId)
        .eq('tag_id', tagId);

      if (error) throw error;

      setNoteTags(prev => prev.filter(nt => !(nt.note_id === noteId && nt.tag_id === tagId)));
    } catch (error) {
      toast.error('Erro ao remover tag');
    }
  }, []);

  const getTagsForNote = useCallback((noteId: string): Tag[] => {
    const tagIds = noteTags.filter(nt => nt.note_id === noteId).map(nt => nt.tag_id);
    return tags.filter(t => tagIds.includes(t.id));
  }, [tags, noteTags]);

  return {
    tags,
    noteTags,
    loading,
    createTag,
    deleteTag,
    addTagToNote,
    removeTagFromNote,
    getTagsForNote,
    getTagColors,
  };
};
