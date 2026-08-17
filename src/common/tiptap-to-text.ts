type TiptapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
};

// Chuyen Tiptap/ProseMirror JSON (Document.content) sang plain text - dung
// lam ngu canh cho AI doc, khong can giu format thi giac (chi can noi dung).
// Generic theo cau truc node chuan (repo dung StarterKit + Image, xem
// post-extensions.ts ben frontend) - khong biet truoc het cac node type nen
// node la thu deu duyet content con, chi vai type pho bien moi can format
// rieng (xuong dong, "- ", "> "...).
function nodeToText(node: TiptapNode | null | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  const inner = (node.content ?? []).map(nodeToText).join('');
  switch (node.type) {
    case 'heading': {
      const level =
        typeof node.attrs?.level === 'number' ? node.attrs.level : 2;
      return `\n\n${'#'.repeat(level)} ${inner}\n`;
    }
    case 'paragraph':
      return `${inner}\n\n`;
    case 'listItem':
      return `- ${inner}\n`;
    case 'codeBlock':
      return `\n\`\`\`\n${inner}\n\`\`\`\n\n`;
    case 'blockquote':
      return `\n> ${inner}\n\n`;
    case 'hardBreak':
      return '\n';
    default:
      return inner;
  }
}

export function tiptapToPlainText(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return '';
  return nodeToText(doc)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
