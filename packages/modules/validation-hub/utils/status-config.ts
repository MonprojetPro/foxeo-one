import type {
  ValidationRequestType,
  ValidationRequestStatus,
} from '../types/validation.types'

export const STATUS_CONFIG: Record<
  ValidationRequestStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'En attente',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  approved: {
    label: 'Approuvé',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  rejected: {
    label: 'Refusé',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  needs_clarification: {
    label: 'Précisions demandées',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
}

export const TYPE_CONFIG: Record<
  ValidationRequestType,
  { label: string; className: string }
> = {
  brief_lab: {
    label: 'Brief Lab',
    className: 'bg-[#E07856]/20 text-[#E07856] border-[#E07856]/30',
  },
  evolution_one: {
    label: 'Évolution One',
    className: 'bg-[#F7931E]/20 text-[#F7931E] border-[#F7931E]/30',
  },
  step_submission: {
    label: 'Soumission étape',
    className: 'bg-[#7c3aed]/20 text-[#a78bfa] border-[#7c3aed]/30',
  },
}
