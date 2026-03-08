import { useState } from 'react';
import { Tag, getTagColors } from '@/hooks/useTags';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tags, Plus, X } from 'lucide-react';

interface TagSelectorProps {
  allTags: Tag[];
  noteTags: Tag[];
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateTag: (name: string, color: string) => Promise<Tag | null>;
}

export const TagSelector = ({ allTags, noteTags, onAddTag, onRemoveTag, onCreateTag }: TagSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(getTagColors()[0]);
  const colors = getTagColors();

  const availableTags = allTags.filter(t => !noteTags.some(nt => nt.id === t.id));

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    const tag = await onCreateTag(newTagName.trim(), selectedColor);
    if (tag) {
      onAddTag(tag.id);
      setNewTagName('');
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {noteTags.map(tag => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white font-medium"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
          <button onClick={() => onRemoveTag(tag.id)} className="hover:opacity-70">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Tags className="w-3.5 h-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-3">
            {/* Existing tags to add */}
            {availableTags.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Adicionar tag</p>
                <div className="flex flex-wrap gap-1">
                  {availableTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        onAddTag(tag.id);
                      }}
                      className="inline-flex items-center text-xs px-2 py-0.5 rounded-full text-white font-medium hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: tag.color }}
                    >
                      <Plus className="w-3 h-3 mr-0.5" />
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Create new tag */}
            <div className="space-y-2 border-t border-border pt-2">
              <p className="text-xs font-medium text-muted-foreground">Criar nova tag</p>
              <Input
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                placeholder="Nome da tag"
                className="h-8 text-xs"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex gap-1 flex-wrap">
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={`w-5 h-5 rounded-full transition-all ${
                      selectedColor === c ? 'ring-2 ring-offset-2 ring-ring scale-110' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Button size="sm" className="w-full h-7 text-xs" onClick={handleCreate} disabled={!newTagName.trim()}>
                <Plus className="w-3 h-3 mr-1" />
                Criar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
