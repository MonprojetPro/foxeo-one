'use server'

import type { ActionResponse } from '@foxeo/types'
import { successResponse } from '@foxeo/types'

export type MigrationSummary = {
  communicationProfileCopied: boolean
  conversationsCopied: number
  documentsCopied: number
  parcoursCopied: boolean
  labLearningsCompiled: boolean
}

/**
 * MVP Stub: Prepares and simulates migration of Lab data to the One instance.
 *
 * NOTE: Cross-database migration (Lab → One Supabase instance) requires
 * credentials for both instances. Real implementation is Story 12.6.
 * For MVP, this records migration intent and returns a summary.
 */
export async function migrateLabDataToOne(
  clientId: string,
  _oneInstanceUrl: string
): Promise<ActionResponse<MigrationSummary>> {
  // MVP: Log migration intent — no real cross-DB copy possible without
  // Story 12.6 credentials management
  console.info(
    `[CRM:MIGRATE_LAB_DATA] MVP stub — queuing migration for client ${clientId} → ${_oneInstanceUrl}`
  )

  // In the real implementation (Story 12.6), this would:
  // 1. Connect to the One instance DB using stored credentials
  // 2. Copy communication_profile
  // 3. Copy elio_conversations where dashboard_type='lab'
  // 4. Copy documents from Lab Storage to One Storage
  // 5. Copy parcours as read-only
  // 6. Compile Elio Lab observations into communication_profile.lab_learnings

  return successResponse({
    communicationProfileCopied: false, // MVP: pending real implementation
    conversationsCopied: 0,
    documentsCopied: 0,
    parcoursCopied: false,
    labLearningsCompiled: false,
  })
}
