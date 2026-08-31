import { useEffect, useRef } from 'react';
import './MarkdownPreview.css';

interface Props {
  content: string;
  compact?: boolean; // true → smaller font, less padding (dùng trong version panel)
}

/**
 * Render Markdown thành HTML một cách an toàn.
 * Dùng một parser đơn giản — với nội dung phức tạp hơn sẽ cài marked.js ở Phase 3.
 *
 * Hiện tại xử lý:
 * - Headings (# ## ###)
 * - Bold (**text**), Italic (*text*)
 * - Code blocks (```lang\n...\n```)
 * - Inline code (`code`)
 * - Blockquote (> text)
 * - Unordered list (- item)
 * - Ordered list (1. item)
 * - Horizontal rule (---)
 * - Paragraphs
 */
function parseMarkdown(md: string): string {
  let html = md
    // Escape HTML trước để tránh XSS
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (``` ... ```) — xử lý trước để tránh parse nội dung bên trong
  const codeBlocks: string[] = [];
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(
      `<pre><code class="language-${lang || 'plaintext'}">${code.trimEnd()}</code></pre>`,
    );
    return `%%CODEBLOCK_${idx}%%`;
  });

  // Process line by line
  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType = '';

  function closeList() {
    if (inList) {
      result.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
      listType = '';
    }
  }

  for (const rawLine of lines) {
    const line = rawLine;

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      closeList();
      result.push('<hr />');
      continue;
    }

    // Headings
    const h3 = line.match(/^### (.+)/);
    if (h3) { closeList(); result.push(`<h3>${inlineFormat(h3[1])}</h3>`); continue; }
    const h2 = line.match(/^## (.+)/);
    if (h2) { closeList(); result.push(`<h2>${inlineFormat(h2[1])}</h2>`); continue; }
    const h1 = line.match(/^# (.+)/);
    if (h1) { closeList(); result.push(`<h1>${inlineFormat(h1[1])}</h1>`); continue; }

    // Blockquote
    const bq = line.match(/^&gt; (.+)/);
    if (bq) { closeList(); result.push(`<blockquote>${inlineFormat(bq[1])}</blockquote>`); continue; }

    // Unordered list
    const ul = line.match(/^[-*] (.+)/);
    if (ul) {
      if (!inList || listType !== 'ul') { closeList(); result.push('<ul>'); inList = true; listType = 'ul'; }
      result.push(`<li>${inlineFormat(ul[1])}</li>`);
      continue;
    }

    // Ordered list
    const ol = line.match(/^\d+\. (.+)/);
    if (ol) {
      if (!inList || listType !== 'ol') { closeList(); result.push('<ol>'); inList = true; listType = 'ol'; }
      result.push(`<li>${inlineFormat(ol[1])}</li>`);
      continue;
    }

    // Empty line → close list or paragraph break
    if (line.trim() === '') {
      closeList();
      result.push('');
      continue;
    }

    // Code block placeholder
    if (/^%%CODEBLOCK_\d+%%$/.test(line.trim())) {
      closeList();
      result.push(line.trim());
      continue;
    }

    // Regular paragraph line
    closeList();
    result.push(`<p>${inlineFormat(line)}</p>`);
  }

  closeList();

  // Join and restore code blocks
  let final = result.join('\n');
  codeBlocks.forEach((block, i) => {
    final = final.replace(`%%CODEBLOCK_${i}%%`, block);
  });

  // Consolidate consecutive <p> tags
  final = final.replace(/<\/p>\n<p>/g, ' ');

  return final;
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

export default function MarkdownPreview({ content, compact = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const html = parseMarkdown(content || '');

  useEffect(() => {
    // Scroll to top when content changes
    ref.current?.scrollTo({ top: 0 });
  }, [content]);

  return (
    <div
      ref={ref}
      className={`md-preview ${compact ? 'md-preview--compact' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
