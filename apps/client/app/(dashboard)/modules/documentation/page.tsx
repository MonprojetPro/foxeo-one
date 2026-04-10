import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import * as fs from 'fs'
import * as path from 'path'
import type { ModuleDoc } from './documentation-accordion'
import { DocumentationSearch } from './documentation-search'

const MODULES_DIR = path.resolve(process.cwd(), 'packages/modules')

/** Modules connus avec leur nom lisible */
const MODULE_NAMES: Record<string, string> = {
  'core-dashboard': 'Dashboard',
  chat: 'Chat',
  documents: 'Documents',
  visio: 'Visioconférence',
  parcours: 'Parcours Lab',
  elio: 'Élio — Assistant IA',
  notifications: 'Notifications',
  support: 'Support',
  facturation: 'Comptabilité',
  'validation-hub': 'Validation Hub',
  crm: 'CRM',
  admin: 'Administration',
  templates: 'Templates',
  analytics: 'Analytics',
}

function readDocFile(moduleId: string, fileName: string): string {
  const filePath = path.join(MODULES_DIR, moduleId, 'docs', fileName)
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return ''
  }
}

function loadModuleDoc(moduleId: string): ModuleDoc {
  return {
    moduleId,
    moduleName: MODULE_NAMES[moduleId] ?? moduleId,
    guide: readDocFile(moduleId, 'guide.md'),
    faq: readDocFile(moduleId, 'faq.md'),
    flows: readDocFile(moduleId, 'flows.md'),
  }
}

export default async function DocumentationPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) notFound()

  // Sequential queries — avoid nested await anti-pattern
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!client) notFound()

  const { data: clientConfig } = await supabase
    .from('client_configs')
    .select('active_modules')
    .eq('client_id', client.id)
    .maybeSingle()

  const activeModules: string[] = clientConfig?.active_modules ?? []

  const moduleDocs: ModuleDoc[] = activeModules
    .filter((id) => id in MODULE_NAMES)
    .map(loadModuleDoc)
    .filter((doc) => doc.guide || doc.faq || doc.flows)

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Documentation</h1>
        <p className="text-muted-foreground text-sm">
          Guides d'utilisation, FAQ et flux de travail de vos modules actifs.
        </p>
      </div>

      {moduleDocs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Aucun module actif avec documentation disponible.
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            Contactez MiKL pour activer des modules sur votre dashboard.
          </p>
        </div>
      ) : (
        <DocumentationSearch modules={moduleDocs} />
      )}
    </div>
  )
}
