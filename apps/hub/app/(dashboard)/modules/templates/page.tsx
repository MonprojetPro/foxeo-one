'use client'

import { useState } from 'react'
import { LayoutTemplate, Mail } from 'lucide-react'
import {
  CockpitHeader,
  PillTabs,
  type PillTab,
} from '@monprojetpro/ui'
import { ParcourTemplateEditor, EmailTemplateEditor } from '@monprojetpro/module-templates'

/* Onglets du module templates */
type TemplatesTab = 'parcours' | 'emails'

const TABS: PillTab<TemplatesTab>[] = [
  { key: 'parcours', label: 'Parcours Lab', icon: LayoutTemplate },
  { key: 'emails', label: 'Emails', icon: Mail },
]

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<TemplatesTab>('parcours')

  return (
    <div className="space-y-6">

      {/* En-tête cockpit avec navigation par pills */}
      <CockpitHeader
        icon={LayoutTemplate}
        title="Templates"
        subtitle="Parcours Lab réutilisables et emails automatiques"
        tone="cyan"
        actions={
          <PillTabs
            tabs={TABS}
            active={activeTab}
            onChange={setActiveTab}
            tone="cyan"
          />
        }
      />

      {/* Contenu de l'onglet actif */}
      {activeTab === 'parcours' && <ParcourTemplateEditor />}
      {activeTab === 'emails' && <EmailTemplateEditor />}

    </div>
  )
}
