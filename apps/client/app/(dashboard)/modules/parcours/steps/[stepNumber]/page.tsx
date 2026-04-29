import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getParcours } from '@monprojetpro/module-parcours'
import { ParcoursStepDetail } from '@monprojetpro/module-parcours'

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
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!client) notFound()

  const { data: parcours } = await getParcours({ clientId: client.id })
  if (!parcours) notFound()

  const isPaused = parcours.status === 'abandoned'

  const step = parcours.steps.find(s => s.stepNumber === stepNum)
  if (!step) notFound()

  const prevStep = parcours.steps.find(s => s.stepNumber === stepNum - 1) ?? null
  const nextStep = parcours.steps.find(s => s.stepNumber === stepNum + 1) ?? null

  return (
    <ParcoursStepDetail
      step={step}
      totalSteps={parcours.totalSteps}
      prevStep={prevStep ? { stepNumber: prevStep.stepNumber, status: prevStep.status } : null}
      nextStep={nextStep ? { stepNumber: nextStep.stepNumber, status: nextStep.status } : null}
      clientId={client.id}
      isPaused={isPaused}
    />
  )
}
