// Server-only entry point for @monprojetpro/modules-facturation
//
// Story 13.4 — ces helpers utilisent node:crypto et/ou Supabase admin API.
// Ne JAMAIS importer ce fichier depuis un composant client : il pollue le bundle
// webpack avec le scheme `node:` que webpack ne sait pas resoudre cote browser.
//
// Usage : `import { verifyPennylaneHmac, dispatchPaidQuote } from '@monprojetpro/modules-facturation/server'`

export { verifyPennylaneHmac } from './utils/verify-pennylane-hmac'
export {
  generateSecureTemporaryPassword,
  TEMP_PASSWORD_LENGTH,
} from './utils/generate-temp-password'
export { createClientAuthUser } from './utils/create-client-auth-user'
export type {
  CreateClientAuthUserResult,
  CreateClientAuthUserOptions,
} from './utils/create-client-auth-user'
export { matchQuoteFromInvoice } from './actions/match-quote-from-invoice'
export type { MatchQuoteInput } from './actions/match-quote-from-invoice'
export {
  dispatchPaidQuote,
  handleLabOnboardingPaid,
  handleOneDepositPaid,
  handleFinalPaymentPaid,
} from './actions/pennylane-paid-handlers'
export type { HandlerDeps, HandlerResult } from './actions/pennylane-paid-handlers'
