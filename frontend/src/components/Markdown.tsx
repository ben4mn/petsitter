// Minimal markdown renderer — handles **bold**, *italic*, `code`, inline links, paragraphs, bulleted lists.
// Deliberately small: no external lib, no HTML injection.

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function inline(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(
    /\[([^\]]+)\]\((https?:[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer" class="underline decoration-rule underline-offset-2 hover:text-accent">$1</a>',
  );
  return out;
}

function toHtml(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let listOpen = false;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join('<br/>')}</p>`);
      para = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      if (listOpen) {
        out.push('</ul>');
        listOpen = false;
      }
      continue;
    }
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (headingMatch) {
      flushPara();
      if (listOpen) {
        out.push('</ul>');
        listOpen = false;
      }
      const level = headingMatch[1].length;
      out.push(`<h${level}>${inline(headingMatch[2])}</h${level}>`);
    } else if (/^>\s?/.test(line)) {
      flushPara();
      if (listOpen) {
        out.push('</ul>');
        listOpen = false;
      }
      out.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`);
    } else if (/^[-*]\s+/.test(line)) {
      flushPara();
      if (!listOpen) {
        out.push('<ul>');
        listOpen = true;
      }
      out.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`);
    } else {
      if (listOpen) {
        out.push('</ul>');
        listOpen = false;
      }
      para.push(line);
    }
  }
  flushPara();
  if (listOpen) out.push('</ul>');
  return out.join('\n');
}

export function Markdown({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div
      className={`markdown text-[15px] leading-relaxed text-ink-2 ${className}`}
      dangerouslySetInnerHTML={{ __html: toHtml(children) }}
    />
  );
}
