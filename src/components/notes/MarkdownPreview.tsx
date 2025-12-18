import { useMemo } from 'react';

interface MarkdownPreviewProps {
  content: string;
  onLinkClick?: (title: string) => void;
}

export const MarkdownPreview = ({ content, onLinkClick }: MarkdownPreviewProps) => {
  const html = useMemo(() => {
    let result = content
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Note links [[title]]
      .replace(/\[\[([^\]]+)\]\]/g, '<span class="note-link" data-link="$1">$1</span>')
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
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
      // Code blocks
      .replace(/```([^`]+)```/gs, '<pre><code>$1</code></pre>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Unordered lists
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Blockquotes
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      // Horizontal rule
      .replace(/^---$/gm, '<hr />')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      // Line breaks
      .replace(/\n/g, '<br />');

    // Wrap consecutive li elements in ul
    result = result.replace(/(<li>.*?<\/li>)+/gs, '<ul>$&</ul>');
    
    return `<p>${result}</p>`;
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
