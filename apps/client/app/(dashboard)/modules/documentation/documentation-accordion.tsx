'use client'

import { useState } from 'react'

export interface ModuleDoc {
  moduleId: string
  moduleName: string
  guide: string
  faq: string
  flows: string
}

interface DocumentationAccordionProps {
  modules: ModuleDoc[]
  searchTerm: string
}

/** Minimal markdown → HTML sans dépendance externe */
function renderMarkdown(markdown: string): string {
  return markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-foreground/80 mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold text-foreground mt-6 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-foreground mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>')
    .replace(/^```[\w]*\n([\s\S]*?)```$/gm, (_, code) =>
      `<pre class="bg-muted/50 rounded p-3 text-xs overflow-auto my-2"><code>${code.trim()}</code></pre>`
    )
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    .replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g, '<ul class="my-2">$1</ul>')
    .replace(/\n{2,}/g, '</p><p class="text-sm text-foreground/70 my-2">')
    .replace(/^(?!<[huplo])(.+)$/gm, '<p class="text-sm text-foreground/70 my-1">$1</p>')
}

function containsTerm(doc: ModuleDoc, term: string): boolean {
  if (!term) return true
  const lower = term.toLowerCase()
  return (
    doc.moduleName.toLowerCase().includes(lower) ||
    doc.guide.toLowerCase().includes(lower) ||
    doc.faq.toLowerCase().includes(lower) ||
    doc.flows.toLowerCase().includes(lower)
  )
}

type Tab = 'guide' | 'faq' | 'flows'

function ModuleAccordionItem({ doc }: { doc: ModuleDoc }) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('guide')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'guide', label: 'Guide' },
    { id: 'faq', label: 'FAQ' },
    { id: 'flows', label: 'Flows' },
  ]

  const content: Record<Tab, string> = {
    guide: doc.guide,
    faq: doc.faq,
    flows: doc.flows,
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        data-testid={`accordion-trigger-${doc.moduleId}`}
      >
        <span className="font-medium text-sm">{doc.moduleName}</span>
        <span className="text-muted-foreground text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-border" data-testid={`accordion-content-${doc.moduleId}`}>
          {/* Tabs */}
          <div className="flex border-b border-border bg-muted/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id}-${doc.moduleId}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div
            className="px-4 py-4 prose-sm max-w-none"
            // Safe: content is from internal filesystem files, not user-generated
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content[activeTab]) }}
            data-testid={`tab-content-${doc.moduleId}`}
          />
        </div>
      )}
    </div>
  )
}

export function DocumentationAccordion({ modules, searchTerm }: DocumentationAccordionProps) {
  const filtered = modules.filter((doc) => containsTerm(doc, searchTerm))

  if (filtered.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8" data-testid="no-results">
        Aucun résultat pour « {searchTerm} »
      </p>
    )
  }

  return (
    <div className="space-y-3" data-testid="documentation-accordion">
      {filtered.map((doc) => (
        <ModuleAccordionItem key={doc.moduleId} doc={doc} />
      ))}
    </div>
  )
}
