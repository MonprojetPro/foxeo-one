// Module GuardVeto — cockpit d'administration d'un produit externe (T-082)
export { manifest } from './manifest'

// Components
export { GuardVetoDashboard } from './components/guard-veto-dashboard'
export type { GuardVetoDashboardProps } from './components/guard-veto-dashboard'

// Actions (Server Actions — chacune se défend par `assertOperator`)
export { getGuardVetoCabinets } from './actions/get-cabinets'
export { getGuardVetoComptes } from './actions/get-comptes'
export { actionCompteGuardVeto } from './actions/compte-action'
export type { CompteActionInput } from './actions/compte-action'

// Hooks
export { useGuardVetoCabinets, useGuardVetoComptes, useActionCompteGuardVeto } from './hooks/use-guard-veto'

// Types
export type {
  CabinetGuardVeto,
  CabinetsReponse,
  CompteGuardVeto,
  ComptesReponse,
  EquipeCabinet,
  EtatCompte,
  PeriodeGarde,
  PeriodesCabinet,
  ActionCompte,
  RappelAbonnement,
} from './types'
