/**
 * Initialize i18n messages for @monprojetpro/ui package
 * Must be called once at app startup (in layout.tsx)
 */

import { loadMessages } from '@monprojetpro/utils'
import frMessages from './fr.json'

// Load French messages into translation cache
loadMessages('fr', frMessages)

export function initializeMessages() {
  // Already loaded via top-level import
  // This function exists for explicit initialization if needed
}
