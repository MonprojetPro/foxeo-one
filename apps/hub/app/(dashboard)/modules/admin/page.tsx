'use client'

import { useState } from 'react'
import { Users, BookOpen, BarChart3 } from 'lucide-react'
import { ClientsOneList, CatalogList, CatalogAnalyticsWidgets } from '@monprojetpro/module-admin'
import { CockpitHeader, PillTabs } from '@monprojetpro/ui'

// Vision One v2 (2026-06-24) : le Hub ne provisionne plus d'« instances » (abandonné).
// Il pilote des CLIENTS One (offre, cycle chantier → livré, modules) et le catalogue
// FORGE des briques réutilisables.
type AdminTab = 'clients-one' | 'catalog' | 'catalog-analytics'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('clients-one')

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* En-tête cockpit */}
      <CockpitHeader
        icon={Users}
        title="One — Clients & Catalogue"
        subtitle="Pilotage des clients One (offre, chantier → livré, modules) et catalogue FORGE des briques"
        tone="cyan"
      />

      {/* Navigation à pills */}
      <PillTabs
        tabs={[
          { key: 'clients-one', label: 'Clients One', icon: Users },
          { key: 'catalog', label: 'Catalogue modules', icon: BookOpen },
          { key: 'catalog-analytics', label: 'Analytics catalogue', icon: BarChart3 },
        ]}
        active={activeTab}
        onChange={(key) => setActiveTab(key as AdminTab)}
        tone="cyan"
      />

      {/* Contenu de l'onglet actif */}
      <div>
        {activeTab === 'clients-one' && <ClientsOneList />}
        {activeTab === 'catalog' && <CatalogList />}
        {activeTab === 'catalog-analytics' && <CatalogAnalyticsWidgets />}
      </div>
    </div>
  )
}
