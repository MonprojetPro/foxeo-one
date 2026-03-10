'use client'

import { useState } from 'react'
import { DocumentationAccordion, type ModuleDoc } from './documentation-accordion'

interface DocumentationSearchProps {
  modules: ModuleDoc[]
}

export function DocumentationSearch({ modules }: DocumentationSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Rechercher dans la documentation..."
        className="w-full px-4 py-2 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-label="Rechercher dans la documentation"
        data-testid="documentation-search-input"
      />
      <DocumentationAccordion modules={modules} searchTerm={searchTerm} />
    </div>
  )
}
