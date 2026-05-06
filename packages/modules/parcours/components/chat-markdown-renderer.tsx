'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMarkdownRendererProps {
  content: string
}

export function ChatMarkdownRenderer({ content }: ChatMarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ node: _node, ...props }) => (
          <p className="mb-2 last:mb-0 leading-relaxed" {...props} />
        ),
        ul: ({ node: _node, ...props }) => (
          <ul className="mb-2 last:mb-0 space-y-1 pl-4" {...props} />
        ),
        ol: ({ node: _node, ...props }) => (
          <ol className="mb-2 last:mb-0 space-y-1 pl-4 list-decimal" {...props} />
        ),
        li: ({ node: _node, ...props }) => (
          <li className="leading-relaxed list-disc" {...props} />
        ),
        strong: ({ node: _node, ...props }) => (
          <strong className="font-semibold" {...props} />
        ),
        em: ({ node: _node, ...props }) => (
          <em className="italic opacity-80" {...props} />
        ),
        hr: () => (
          <hr className="my-2 border-current opacity-20" />
        ),
        blockquote: ({ node: _node, ...props }) => (
          <blockquote className="border-l-2 border-current opacity-70 pl-3 my-1 italic" {...props} />
        ),
        code: ({ node: _node, ...props }) => (
          <code className="bg-black/20 rounded px-1 py-0.5 text-xs font-mono" {...props} />
        ),
        h1: ({ node: _node, ...props }) => <p className="font-bold text-base mb-1" {...props} />,
        h2: ({ node: _node, ...props }) => <p className="font-bold mb-1" {...props} />,
        h3: ({ node: _node, ...props }) => <p className="font-semibold mb-1" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
