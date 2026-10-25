import type { Components } from 'react-markdown';
import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

const components: Components = {
  a({ href, children, title }) {
    return (
      <a href={href} title={title} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  img() {
    return null;
  },
};

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  if (!content.trim()) {
    return <p className="preview-empty">Nothing to preview yet.</p>;
  }

  return (
    <div className="markdown-body" role="region" aria-label="Markdown preview" tabIndex={0}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </Markdown>
    </div>
  );
}
