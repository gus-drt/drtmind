import { useMemo } from 'react';

interface MarkdownPreviewProps {
  content: string;
  onLinkClick?: (title: string) => void;
}

export const MarkdownPreview = ({ content, onLinkClick }: MarkdownPreviewProps) => {
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
        .replace(/\[\[([^\]]+)\]\]/g, '<span class="note-link" data-link="$1">$1</span>')
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
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
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
  }, [content]);

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
