import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getParcours, SubmissionDetailView } from '@monprojetpro/module-parcours'
import { getSubmissions } from '@monprojetpro/module-parcours'

interface SubmissionPageProps {
  params: Promise<{ stepNumber: string }>
}

export default async function SubmissionPage({ params }: SubmissionPageProps) {
  const { stepNumber } = await params
  const stepNum = parseInt(stepNumber, 10)

  if (isNaN(stepNum) || stepNum < 1) notFound()

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!client) notFound()

  const { data: parcours } = await getParcours({ clientId: client.id })
  if (!parcours) notFound()

  const step = parcours.steps.find((s) => s.stepNumber === stepNum)
  if (!step) notFound()

  // Récupérer la soumission la plus récente pour cette étape
  const { data: submissions } = await getSubmissions({ stepId: step.id, clientId: client.id })
  const submission = submissions?.[0]

  if (!submission) notFound()

  return (
    <div className="container mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">Étape {stepNum} — Votre soumission</p>
        <h1 className="text-2xl font-semibold">{step.title}</h1>
      </div>

      <SubmissionDetailView
        submissionId={submission.id}
        clientId={client.id}
        showValidationForm={false}
      />
    </div>
  )
}
