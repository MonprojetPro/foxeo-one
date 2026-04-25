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

  // Tous les modules actifs ont leur propre dossier apps/client/app/(dashboard)/modules/[name]/page.tsx
  // Ce catch-all ne devrait jamais être atteint pour les modules connus — si on arrive ici,
  // le module est activé dans la DB mais sa page dédiée n'a pas encore été créée.
  // ⚠️ Checklist ajout module : créer apps/client/app/(dashboard)/modules/[moduleId]/page.tsx
  return (
    <EmptyState
      title={module.name}
      description={`Le module "${module.name}" est activé mais sa page n'a pas encore été déployée. Contactez MiKL.`}
    />
  )
}
