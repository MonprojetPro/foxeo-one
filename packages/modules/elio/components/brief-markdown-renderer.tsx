'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@monprojetpro/utils'

interface BriefMarkdownRendererProps {
  content: string
  className?: string
}

export function BriefMarkdownRenderer({ content, className }: BriefMarkdownRendererProps) {
  return (
    <div className={cn('prose prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml={true}
        components={{
          h1: ({ node: _node, ...props }) => <h1 className="text-3xl font-bold mb-4 text-foreground" {...props} />,
          h2: ({ node: _node, ...props }) => <h2 className="text-2xl font-semibold mb-3 mt-6 text-foreground" {...props} />,
          h3: ({ node: _node, ...props }) => <h3 className="text-xl font-semibold mb-2 mt-4 text-foreground" {...props} />,
          p: ({ node: _node, ...props }) => <p className="mb-4 leading-relaxed text-muted-foreground" {...props} />,
          ul: ({ node: _node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-2 text-muted-foreground" {...props} />,
          ol: ({ node: _node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2 text-muted-foreground" {...props} />,
          li: ({ node: _node, ...props }) => <li className="leading-relaxed" {...props} />,
          strong: ({ node: _node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
          em: ({ node: _node, ...props }) => <em className="italic text-muted-foreground" {...props} />,
          a: ({ node: _node, ...props }) => (
            <a className="text-purple-400 hover:text-purple-300 underline transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
          ),
          blockquote: ({ node: _node, ...props }) => (
            <blockquote className="border-l-4 border-purple-600 pl-4 italic my-4 text-muted-foreground" {...props} />
          ),
          code: ({ node: _node, ...props }) => (
            <code className="bg-muted/50 text-purple-300 rounded px-1.5 py-0.5 text-sm font-mono" {...props} />
          ),
          pre: ({ node: _node, ...props }) => (
            <pre className="bg-muted/30 border border-border rounded-lg p-4 overflow-x-auto my-4 text-sm" {...props} />
          ),
          hr: ({ node: _node, ...props }) => <hr className="border-border my-8" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
