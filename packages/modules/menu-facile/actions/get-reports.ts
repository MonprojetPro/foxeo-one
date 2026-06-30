'use server'

import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { callMenuFacileAdmin, MenuFacileAdminError } from './admin-client'
import type { MenuFacileReport, ReportStatus } from '../types'

/**
 * GET /reports?status= — liste des signalements (status optionnel).
 */
export async function getMenuFacileReports(
  status?: ReportStatus,
): Promise<ActionResponse<MenuFacileReport[]>> {
  try {
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    const data = await callMenuFacileAdmin<MenuFacileReport[]>(`/reports${qs}`)
    return successResponse(data ?? [])
  } catch (err) {
    if (err instanceof MenuFacileAdminError) {
      return errorResponse(err.message, `MENUFACILE_HTTP_${err.status}`)
    }
    return errorResponse(
      err instanceof Error ? err.message : 'Erreur inconnue lors du chargement des signalements',
      'MENUFACILE_UNKNOWN',
    )
  }
}
