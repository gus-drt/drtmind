import { useMemo } from 'react';

interface MarkdownPreviewProps {
  content: string;
  onLinkClick?: (title: string) => void;
  isPublicView?: boolean;
  publicLinkedNotes?: { title: string; id: string }[];
}

export const MarkdownPreview = ({ content, onLinkClick, isPublicView, publicLinkedNotes }: MarkdownPreviewProps) => {
  const html = useMemo(() => {
    // Split content into lines for better block-level handling
    const lines = content.split('\n');
    const processedLines: string[] = [];
    let inList = false;
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        processedLines.push(`<ul>${listItems.join('')}</ul>`);
        listItems = [];
      }
      inList = false;
    };

    const processInline = (text: string) => {
      return text
        // Escape HTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Note links [[title]]
        .replace(/\[\[([^\]]+)\]\]/g, (match, title) => {
          if (isPublicView) {
            const linkedNote = publicLinkedNotes?.find(n => n.title === title);
            if (linkedNote) {
              return `<a href="/s/${linkedNote.id}" class="text-primary hover:underline font-medium inline-flex items-center hover:bg-primary/5 px-1 rounded transition-colors">${title}</a>`;
            }
            return `<span class="text-muted-foreground cursor-not-allowed opacity-70 border border-border/50 bg-muted/20 px-1.5 py-0.5 rounded inline-flex items-center gap-1 text-[0.9em]" title="Nota privada"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-60"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>${title}</span>`;
          }
          return `<span class="note-link cursor-pointer text-primary bg-primary/5 hover:bg-primary/10 px-1 rounded transition-colors" data-link="${title}">${title}</span>`;
        })
        // Bold and italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // Strikethrough
        .replace(/~~(.+?)~~/g, '<del>$1</del>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
          const isInternal = url.startsWith('/') || url.startsWith(window.location.origin);
          if (isInternal) {
            return `<a href="${url}">${text}</a>`;
          }
          return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        });
    };

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Empty line - flush list and add break
      if (trimmedLine === '') {
        flushList();
        continue;
      }

      // Headers
      if (trimmedLine.startsWith('### ')) {
        flushList();
        processedLines.push(`<h3>${processInline(trimmedLine.slice(4))}</h3>`);
        continue;
      }
      if (trimmedLine.startsWith('## ')) {
        flushList();
        processedLines.push(`<h2>${processInline(trimmedLine.slice(3))}</h2>`);
        continue;
      }
      if (trimmedLine.startsWith('# ')) {
        flushList();
        processedLines.push(`<h1>${processInline(trimmedLine.slice(2))}</h1>`);
        continue;
      }

      // Horizontal rule
      if (trimmedLine === '---') {
        flushList();
        processedLines.push('<hr />');
        continue;
      }

      // Blockquote
      if (trimmedLine.startsWith('> ')) {
        flushList();
        processedLines.push(`<blockquote>${processInline(trimmedLine.slice(2))}</blockquote>`);
        continue;
      }

      // Unordered list items
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        inList = true;
        listItems.push(`<li>${processInline(trimmedLine.slice(2))}</li>`);
        continue;
      }

      // Ordered list items
      const orderedMatch = trimmedLine.match(/^\d+\.\s(.+)$/);
      if (orderedMatch) {
        inList = true;
        listItems.push(`<li>${processInline(orderedMatch[1])}</li>`);
        continue;
      }

      // Regular paragraph
      flushList();
      processedLines.push(`<p>${processInline(trimmedLine)}</p>`);
    }

    flushList();

    return processedLines.join('');
  }, [content, isPublicView, publicLinkedNotes]);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('note-link')) {
      const linkTitle = target.getAttribute('data-link');
      if (linkTitle && onLinkClick) {
        onLinkClick(linkTitle);
      }
    }
  };

  return (
    <div 
      className="markdown-preview prose prose-sm max-w-none"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
