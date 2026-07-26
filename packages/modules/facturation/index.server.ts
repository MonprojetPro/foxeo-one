// Server-only entry point for @monprojetpro/modules-facturation
//
// Story 13.4 — ces helpers utilisent node:crypto et/ou Supabase admin API.
// Ne JAMAIS importer ce fichier depuis un composant client : il pollue le bundle
// webpack avec le scheme `node:` que webpack ne sait pas resoudre cote browser.
//
// Usage : `import { verifyPennylaneHmac, dispatchPaidQuote } from '@monprojetpro/modules-facturation/server'`

export { verifyPennylaneHmac } from './utils/verify-pennylane-hmac'

// Note : createClientAuthUser / generateSecureTemporaryPassword ne vivent plus ici.
// Ce n'est pas de la facturation mais de l'authentification Supabase — et les garder ici
// obligeait les autres modules à importer le module facturation, ce que l'architecture
// interdit. Ils sont désormais dans `@monprojetpro/supabase/admin`.
export { matchQuoteFromInvoice } from './actions/match-quote-from-invoice'
export type { MatchQuoteInput } from './actions/match-quote-from-invoice'
export {
  dispatchPaidQuote,
  handleLabOnboardingPaid,
  handleOneDepositPaid,
  handleFinalPaymentPaid,
} from './actions/pennylane-paid-handlers'
export type { HandlerDeps, HandlerResult } from './actions/pennylane-paid-handlers'
