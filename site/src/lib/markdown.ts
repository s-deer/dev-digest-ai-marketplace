import DOMPurify from 'dompurify';
import { marked } from 'marked';

export interface MarkdownContext {
  /** "https://github.com/<owner>/<repo>" */
  repositoryUrl: string | null;
  /** "<owner>/<repo>" */
  repository: string | null;
  branch: string;
  /** Repository-relative path of the source file, used to resolve relative links. */
  sourcePath: string;
}

const EXTERNAL = /^[a-z][a-z0-9+.-]*:/i;

/** Resolves a link from the source file to a repository-relative path ("plugins/x/a.md"). */
function resolvePath(href: string, sourcePath: string): string {
  const dir = sourcePath.split('/').slice(0, -1).join('/');
  const base = href.startsWith('/') ? 'https://repo.invalid/' : `https://repo.invalid/${dir ? `${dir}/` : ''}`;
  const url = new URL(href, base);
  return `${url.pathname.replace(/^\//, '')}${url.search}${url.hash}`;
}

function rewriteLinks(node: Element, ctx: MarkdownContext) {
  if (node.tagName === 'A') {
    const href = node.getAttribute('href');
    if (!href) return;
    if (EXTERNAL.test(href) || href.startsWith('//')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
      return;
    }
    // Hash links would collide with the hash router, so in-page anchors point at GitHub as well.
    const target = href.startsWith('#') ? `${ctx.sourcePath}${href}` : resolvePath(href, ctx.sourcePath);
    if (ctx.repositoryUrl) {
      node.setAttribute('href', `${ctx.repositoryUrl}/blob/${ctx.branch}/${target}`);
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    } else {
      node.removeAttribute('href');
    }
  }
  if (node.tagName === 'IMG') {
    const src = node.getAttribute('src');
    if (src && !EXTERNAL.test(src) && !src.startsWith('//') && ctx.repository) {
      node.setAttribute('src', `https://raw.githubusercontent.com/${ctx.repository}/${ctx.branch}/${resolvePath(src, ctx.sourcePath)}`);
    }
    node.setAttribute('loading', 'lazy');
  }
}

/**
 * Markdown from the repository is untrusted: the HTML from marked always goes through DOMPurify
 * (no scripts, event handlers, javascript: URLs or inline styles) before it reaches the DOM.
 */
export function renderMarkdown(markdown: string, ctx: MarkdownContext): string {
  const html = marked.parse(markdown, { async: false, gfm: true });
  DOMPurify.addHook('afterSanitizeAttributes', (node) => rewriteLinks(node, ctx));
  try {
    return DOMPurify.sanitize(html, {
      FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'],
      FORBID_ATTR: ['style'],
    });
  } finally {
    DOMPurify.removeHook('afterSanitizeAttributes');
  }
}

/** Inline markdown (changelog items, notes): `code`, emphasis and links, sanitized the same way. */
export function renderInline(markdown: string): string {
  const html = marked.parseInline(markdown, { async: false, gfm: true });
  // Only absolute http(s) links survive: relative ones would be taken over by the hash router.
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['code', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href'],
    ALLOWED_URI_REGEXP: /^https?:\/\//i,
  });
}
