import { renderInline } from '../lib/markdown';

/** Renders a one-line markdown fragment; renderInline sanitizes it with DOMPurify. */
export function InlineMarkdown({ text }: { text: string }) {
  return <span dangerouslySetInnerHTML={{ __html: renderInline(text) }} />;
}
