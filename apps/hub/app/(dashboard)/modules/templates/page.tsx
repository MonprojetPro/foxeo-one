'use client'

import { useState } from 'react'
import { ParcourTemplateEditor, EmailTemplateEditor } from '@monprojetpro/module-templates'

type TemplatesTab = 'parcours' | 'emails'

const TABS: { id: TemplatesTab; label: string }[] = [
  { id: 'parcours', label: 'Parcours Lab' },
  { id: 'emails', label: 'Emails' },
]

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<TemplatesTab>('parcours')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Templates</h1>
        <p className="text-sm text-gray-400">Templates de parcours Lab réutilisables et emails automatiques</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'parcours' && <ParcourTemplateEditor />}
        {activeTab === 'emails' && <EmailTemplateEditor />}
      </div>
    </div>
  )
}
