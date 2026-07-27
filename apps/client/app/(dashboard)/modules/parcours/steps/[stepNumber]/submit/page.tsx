import { notFound } from 'next/navigation'
import { createServerSupabaseClient, isReadOnlyClientStatus } from '@monprojetpro/supabase'
import { getParcours, SubmitStepForm } from '@monprojetpro/module-parcours'
import { ElioGenerateBriefSection } from '@monprojetpro/module-elio'

interface SubmitStepPageProps {
  params: Promise<{ stepNumber: string }>
}

export default async function SubmitStepPage({ params }: SubmitStepPageProps) {
  const { stepNumber } = await params
  const stepNum = parseInt(stepNumber, 10)

  if (isNaN(stepNum) || stepNum < 1) notFound()

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select('id, status')
    .eq('auth_user_id', user.id)
    .single()

  if (!client) notFound()

  const { data: parcours } = await getParcours({ clientId: client.id })
  if (!parcours) notFound()

  const step = parcours.steps.find((s) => s.stepNumber === stepNum)
  if (!step) notFound()

  // Seule une étape 'current' peut être soumise
  if (step.status !== 'current') notFound()

  // Espace figé — abonnement terminé : la page reste atteignable par URL, mais elle ne doit
  // plus annoncer une soumission impossible (le formulaire, lui, se remplace tout seul).
  const readOnly = isReadOnlyClientStatus(client.status)

  return (
    <div className="container mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">Étape {stepNum}</p>
        <h1 className="text-2xl font-semibold">{step.title}</h1>
        <p className="text-muted-foreground mt-2">
          {readOnly
            ? 'Votre parcours est arrêté : cette étape reste consultable.'
            : 'Soumettez votre travail pour validation par MiKL.'}
        </p>
      </div>

      {step.validationRequired && !readOnly && (
        <div className="mb-6">
          <ElioGenerateBriefSection stepId={step.id} />
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou saisissez manuellement</span>
            </div>
          </div>
        </div>
      )}

      <SubmitStepForm stepId={step.id} />
    </div>
  )
}
