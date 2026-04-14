import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { Alert, AlertDescription, AlertTitle } from '@monprojetpro/ui'
import { getElioConfig, getCommunicationProfile, buildElioSystemPrompt, OrpheusConfigForm } from '@monprojetpro/module-elio'

export const metadata = {
  title: 'Configuration avancée Élio (Orpheus) — MonprojetPro',
  description: 'Personnalisez les paramètres avancés de votre assistant IA Élio',
}

export default async function ElioAdvancedSettingsPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!client) {
    redirect('/login')
  }

  const { data: config } = await getElioConfig()

  // Debug preview: build system prompt with real client profile if debug mode enabled
  const isDebug = process.env.ENABLE_ELIO_DEBUG === 'true'
  let debugPromptPreview: string | null = null

  if (isDebug && config) {
    const { data: profile } = await getCommunicationProfile({ clientId: client.id })
    const defaultProfile = {
      id: 'default',
      clientId: client.id,
      preferredTone: 'friendly' as const,
      preferredLength: 'balanced' as const,
      interactionStyle: 'collaborative' as const,
      contextPreferences: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    debugPromptPreview = buildElioSystemPrompt(
      profile ?? defaultProfile,
      undefined,
      config.customInstructions
    )
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Configuration avancée Élio</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Personnalisez le comportement de votre assistant IA (Orpheus).
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>⚠️ Configuration Orpheus — Paramètres avancés</AlertTitle>
        <AlertDescription>
          Modifiez ces paramètres uniquement si vous savez ce que vous faites. Une mauvaise
          configuration peut affecter la qualité et la cohérence des réponses d&apos;Élio.
        </AlertDescription>
      </Alert>

      <OrpheusConfigForm initialConfig={config} />

      {isDebug && debugPromptPreview && (
        <details className="rounded-lg border border-border p-4">
          <summary className="cursor-pointer font-semibold text-sm text-foreground">
            🔍 Preview System Prompt (Debug)
          </summary>
          <pre className="mt-4 overflow-x-auto rounded-md bg-muted p-4 text-xs text-muted-foreground whitespace-pre-wrap">
            {debugPromptPreview}
          </pre>
        </details>
      )}
    </div>
  )
}
