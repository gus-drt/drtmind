import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MarkdownPreview } from '@/components/notes/MarkdownPreview';
import { Loader2, FileText, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PublicNoteData {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  tags?: { name: string; color: string }[];
}

type LoadingState = 'loading' | 'found' | 'not-found' | 'error';

const PublicNote = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const [note, setNote] = useState<PublicNoteData | null>(null);
  const [state, setState] = useState<LoadingState>('loading');
  const [publicLinkedNotes, setPublicLinkedNotes] = useState<{title: string, id: string}[]>([]);

  useEffect(() => {
    const fetchPublicNote = async () => {
      if (!noteId || !supabase) {
        setState('error');
        return;
      }

      try {
        // Fetch note — RLS enforces is_public = true for anon/other users
        const { data, error } = await supabase
          .from('notes')
          .select('id, title, content, updated_at')
          .eq('id', noteId)
          .eq('is_public', true)
          .single();

        if (error || !data) {
          setState('not-found');
          return;
        }

        // Fetch public linked notes (Extract links first)
        const linkRegex = /\[\[([^\]]+)\]\]/g;
        const links: string[] = [];
        let match;
        while ((match = linkRegex.exec(data.content)) !== null) {
          links.push(match[1]);
        }

        if (links.length > 0) {
          const { data: linkedData } = await supabase
            .from('notes')
            .select('id, title')
            .in('title', links)
            .eq('is_public', true);
            
          if (linkedData) {
            setPublicLinkedNotes(linkedData);
          }
        }

        // Fetch tags for this note (read-only badges)
        let tags: { name: string; color: string }[] = [];
        try {
          const { data: tagData } = await supabase
            .from('note_tags')
            .select('tag_id')
            .eq('note_id', noteId);

          if (tagData && tagData.length > 0) {
            const tagIds = tagData.map(t => t.tag_id);
            const { data: tagDetails } = await supabase
              .from('tags')
              .select('name, color')
              .in('id', tagIds);
            tags = tagDetails || [];
          }
        } catch {
          // Tags are optional — fail silently
        }

        setNote({ ...data, tags });
        setState('found');

        // Set page title
        document.title = `${data.title} — Graph Notes`;
      } catch {
        setState('error');
      }
    };

    fetchPublicNote();

    return () => {
      document.title = 'Graph Notes';
    };
  }, [noteId]);

  // Process [[links]] — render as styled text with lock icon (no navigation in public view)
  const processedContent = useMemo(() => {
    if (!note) return '';
    // We don't modify the content here — the MarkdownPreview handles [[links]]
    // But we disable link clicks by not passing onLinkClick
    return note.content;
  }, [note]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando nota...</p>
        </div>
      </div>
    );
  }

  if (state === 'not-found' || state === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center space-y-4 border border-border/50 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
            {state === 'not-found' ? (
              <Lock className="w-8 h-8 text-muted-foreground" />
            ) : (
              <FileText className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <h1 className="text-2xl font-semibold">
            {state === 'not-found' ? 'Nota não encontrada' : 'Erro ao carregar'}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {state === 'not-found'
              ? 'Esta nota não existe, é privada ou o link está incorreto.'
              : 'Ocorreu um erro ao carregar a nota. Tente novamente mais tarde.'}
          </p>
          <Link to="/">
            <Button variant="outline" className="rounded-full mt-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ir para Graph Notes
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!note) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            <span>Graph Notes</span>
          </Link>
          <span className="text-xs text-muted-foreground">
            Visualização pública
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
          {note.title}
        </h1>

        {/* Meta: tags + date */}
        <div className="flex flex-wrap items-center gap-2 mb-8 pb-6 border-b border-border/30">
          {/* Tags as read-only badges */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mr-2">
              {note.tags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: `${tag.color}15`,
                    borderColor: `${tag.color}40`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          <span className="text-xs text-muted-foreground">
            Atualizado em {new Date(note.updated_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Markdown content — [[links]] render as styled spans but are not clickable */}
        <article className="prose prose-sm sm:prose max-w-none dark:prose-invert">
          <MarkdownPreview 
            content={processedContent} 
            isPublicView={true} 
            publicLinkedNotes={publicLinkedNotes} 
          />
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 mt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Compartilhado via{' '}
            <Link to="/" className="text-primary hover:underline">
              Graph Notes
            </Link>
          </span>
          <span className="text-xs text-muted-foreground">
            Ferramenta de pensamento em rede
          </span>
        </div>
      </footer>
    </div>
  );
};

export default PublicNote;
