import { getElioLabAgents } from '@monprojetpro/module-elio'
import { ElioLabCatalogue } from '@monprojetpro/module-elio'

export default async function ElioLabPage() {
  // Charge uniquement les agents actifs pour le SSR — le toggle archived re-fetche via TanStack Query
  const { data: agents } = await getElioLabAgents({ includeArchived: false })

  return <ElioLabCatalogue initialAgents={agents ?? []} />
}
