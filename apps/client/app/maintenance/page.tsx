import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@foxeo/supabase'

async function getMaintenanceInfo(): Promise<{ active: boolean; message: string; estimatedDuration: string | null }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', ['maintenance_mode', 'maintenance_message', 'maintenance_estimated_duration'])

    const map: Record<string, unknown> = {}
    for (const row of data ?? []) {
      map[row.key] = row.value
    }

    return {
      active: map['maintenance_mode'] === true,
      message:
        typeof map['maintenance_message'] === 'string'
          ? map['maintenance_message']
          : 'La plateforme est en maintenance. Nous serons de retour très bientôt !',
      estimatedDuration:
        map['maintenance_estimated_duration'] != null &&
        map['maintenance_estimated_duration'] !== 'null'
          ? String(map['maintenance_estimated_duration'])
          : null,
    }
  } catch {
    return {
      active: false,
      message: 'La plateforme est en maintenance. Nous serons de retour très bientôt !',
      estimatedDuration: null,
    }
  }
}

export default async function MaintenancePage() {
  const { active, message, estimatedDuration } = await getMaintenanceInfo()

  // If maintenance is not active, redirect to home
  if (!active) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-[#020402] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo placeholder */}
        <div className="text-5xl" aria-hidden="true">🔧</div>

        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-white">Maintenance en cours</h1>
          <p className="text-gray-400 text-sm leading-relaxed">{message}</p>

          {estimatedDuration && (
            <p className="text-gray-500 text-xs">
              Durée estimée : <span className="text-gray-300">{estimatedDuration}</span>
            </p>
          )}
        </div>

        <div className="border-t border-white/10 pt-4">
          <p className="text-xs text-gray-600">
            Merci de votre patience. Si vous avez une urgence, contactez votre conseiller.
          </p>
        </div>
      </div>
    </div>
  )
}
