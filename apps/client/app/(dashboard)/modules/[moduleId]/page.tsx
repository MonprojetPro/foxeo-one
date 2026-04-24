import { notFound, redirect } from 'next/navigation'
import { EmptyState } from '@monprojetpro/ui'
import { discoverModules, getModule } from '@monprojetpro/utils'
import dynamic from 'next/dynamic'

type ModulePageProps = {
  params: Promise<{ moduleId: string }>
}

export default async function ModulePage({ params }: ModulePageProps) {
  const { moduleId } = await params

  // core-dashboard est l'accueil — rediriger vers / pour qu'il reçoive ses props correctement
  if (moduleId === 'core-dashboard') {
    redirect('/')
  }

  // Auto-discover modules
  await discoverModules()
  const module = getModule(moduleId)

  if (!module) {
    notFound()
  }

  // Dynamic import of module component
  // For now, manually map module IDs to imports
  // In production, this would use a more sophisticated registry
  const moduleComponents: Record<string, any> = {}

  const ModuleComponent = moduleComponents[moduleId]

  if (!ModuleComponent) {
    return (
      <EmptyState
        title={`Module: ${module.name}`}
        description="Ce module n'a pas encore de composant implementé."
      />
    )
  }

  return <ModuleComponent />
}
