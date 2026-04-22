'use client'

export type MobileTab = 'step' | 'history'

interface StepMobileTabsProps {
  activeTab: MobileTab
  onTabChange: (tab: MobileTab) => void
}

export function StepMobileTabs({ activeTab, onTabChange }: StepMobileTabsProps) {
  return (
    <div role="tablist" className="lg:hidden flex border-b border-[#2d2d2d]" data-testid="step-mobile-tabs">
      <button
        role="tab"
        aria-selected={activeTab === 'step'}
        data-testid="tab-step"
        onClick={() => onTabChange('step')}
        className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
          activeTab === 'step'
            ? 'text-[#a78bfa] border-b-2 border-[#7c3aed]'
            : 'text-[#6b7280] hover:text-[#9ca3af]'
        }`}
      >
        Étape
      </button>
      <button
        role="tab"
        aria-selected={activeTab === 'history'}
        data-testid="tab-history"
        onClick={() => onTabChange('history')}
        className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
          activeTab === 'history'
            ? 'text-[#a78bfa] border-b-2 border-[#7c3aed]'
            : 'text-[#6b7280] hover:text-[#9ca3af]'
        }`}
      >
        Historique
      </button>
    </div>
  )
}
