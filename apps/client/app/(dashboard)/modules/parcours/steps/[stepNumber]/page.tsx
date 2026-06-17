import { notFound } from 'next/navigation'
import { createServerSupabaseClient, hasIaConsent } from '@monprojetpro/supabase'
import { getParcours } from '@monprojetpro/module-parcours'
import { ParcoursStepDetail } from '@monprojetpro/module-parcours'
import { getEffectiveStepConfig } from '@monprojetpro/module-elio'

interface ParcoursStepDetailPageProps {
  params: Promise<{ stepNumber: string }>
}

export default async function ParcoursStepDetailPage({ params }: ParcoursStepDetailPageProps) {
  const { stepNumber } = await params
  const stepNum = parseInt(stepNumber, 10)

  if (isNaN(stepNum) || stepNum < 1) notFound()

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select('id, client_configs(elio_lab_enabled)')
    .eq('auth_user_id', user.id)
    .single()

  if (!client) notFound()

  // Agents Lab coupés par MiKL (global) → chat d'étape en pause.
  const cfgRel = (client as { client_configs?: unknown }).client_configs
  const cfg = (Array.isArray(cfgRel) ? cfgRel[0] : cfgRel) as { elio_lab_enabled?: boolean } | null | undefined
  const globalAgentsOff = (cfg?.elio_lab_enabled ?? false) === false

  const { data: parcours } = await getParcours({ clientId: client.id })
  if (!parcours) notFound()

  const isPaused = parcours.status === 'abandoned'

  const step = parcours.steps.find(s => s.stepNumber === stepNum)
  if (!step) notFound()

  // Pause si les agents sont coupés globalement OU si CET agent est désactivé (Lot B).
  const agentsPaused = globalAgentsOff || step.isEnabled === false

  const prevStep = parcours.steps.find(s => s.stepNumber === stepNum - 1) ?? null
  const nextStep = parcours.steps.find(s => s.stepNumber === stepNum + 1) ?? null

  const { data: agentConfig } = await getEffectiveStepConfig({
    stepId: step.id,
    stepNumber: step.stepNumber,
    clientId: client.id,
  })

  // Guard consentement IA (RGPD) — pilote la mise en veille du chat d'étape Élio.
  const iaConsentGranted = await hasIaConsent(client.id)

  return (
    <ParcoursStepDetail
      step={step}
      totalSteps={parcours.totalSteps}
      prevStep={prevStep ? { stepNumber: prevStep.stepNumber, status: prevStep.status } : null}
      nextStep={nextStep ? { stepNumber: nextStep.stepNumber, status: nextStep.status } : null}
      clientId={client.id}
      isPaused={isPaused}
      agentImagePath={agentConfig?.agentImagePath ?? null}
      iaConsentGranted={iaConsentGranted}
      agentsPaused={agentsPaused}
    />
  )
}
