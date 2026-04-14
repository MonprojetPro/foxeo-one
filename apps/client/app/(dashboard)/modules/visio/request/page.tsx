import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { CalcomBookingWidget, MeetingRequestForm } from '@monprojetpro/module-visio'

const CALCOM_URL = process.env.NEXT_PUBLIC_CALCOM_URL ?? 'https://cal.monprojet-pro.com/mikl/consultation'

export default async function ClientRequestVisioPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select('id, operator_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!client) notFound()

  return (
    <div className="flex flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">Prendre rendez-vous</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Option 1: Cal.com widget */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Réserver un créneau</h2>
          <p className="text-sm text-muted-foreground">
            Choisissez un créneau disponible dans le calendrier de MiKL.
          </p>
          <CalcomBookingWidget
            calcomUrl={CALCOM_URL}
            clientId={client.id}
            operatorId={client.operator_id}
          />
        </div>

        {/* Option 2: Manual request form */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Proposer des créneaux</h2>
          <p className="text-sm text-muted-foreground">
            Si vous ne trouvez pas de créneau disponible, proposez vos propres horaires.
          </p>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <MeetingRequestForm operatorId={client.operator_id} />
          </div>
        </div>
      </div>
    </div>
  )
}
