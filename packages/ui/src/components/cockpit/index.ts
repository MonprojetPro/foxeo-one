/**
 * Cockpit UI — signature visuelle « Minimal Futuriste » du Hub MonprojetPro.
 * Briques partagées extraites de l'onglet MenuFacile et généralisées à tout le Hub.
 */

export { COCKPIT_TONES, type CockpitTone, type ToneClasses } from './tones'
export { CockpitHeader, type CockpitHeaderProps } from './cockpit-header'
export { StatusPill, type StatusPillProps, type StatusDotState } from './status-dot'
export {
  PillTabs,
  pillClasses,
  CountBadge,
  type PillTab,
  type PillTabsProps,
  type CountBadgeProps,
} from './pill-tabs'
export { HeroStat, HeroStatGrid, type HeroStatProps } from './hero-stat'
export { StatCard, type StatCardProps } from './stat-card'
export { SectionTitle, type SectionTitleProps } from './section-title'
export { CockpitPanel, type CockpitPanelProps } from './cockpit-panel'
export { CockpitCallout, type CockpitCalloutProps } from './cockpit-callout'
export {
  HeroStatSkeleton,
  StatCardSkeleton,
  RowSkeleton,
  BlockSkeleton,
} from './cockpit-skeletons'
