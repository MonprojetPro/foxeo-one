// Edge Function: transfer-client-instance
// Story: 9.5b — Transfert instance One au client sortant
//
// Triggered: invoked by transferInstanceToClient Server Action after creating instance_transfers record
// Input: { transferId: string, clientId: string, instanceId: string, recipientEmail: string }
//
// Steps:
// 1. UPDATE instance_transfers status → 'processing'
// 2. Export code source (ZIP of apps/client/ + active modules)
// 3. Export database (pg_dump via Supabase Admin API)
// 4. Generate "Guide d'autonomie" Markdown → plain text for MVP
// 5. Prepare strategic documents (brief final, PRD, architecture)
// 6. Package all in ZIP → upload to Storage bucket 'transfers'
// 7. UPDATE instance_transfers status → 'completed', set file_path, sent_at
// 8. UPDATE client_instances status → 'transferred', transferred_at = NOW()
// 9. INSERT activity_logs: type 'client_instance_transferred'
// 10. Trigger send-email Edge Function with download link
//
// NOTE: Steps 2-5 are stubbed for MVP. Full implementation requires:
//   - GitHub/GitLab API access for repo creation
//   - Supabase Admin API for pg_dump
//   - PDF generation library
// In production, this process takes 10-30 minutes.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TransferInput {
  transferId: string
  clientId: string
  instanceId: string
  recipientEmail: string
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  let input: TransferInput

  try {
    input = await req.json() as TransferInput
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { transferId, clientId, instanceId, recipientEmail } = input

  if (!transferId || !clientId || !instanceId || !recipientEmail) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Step 1: Mark transfer as processing
    await supabase
      .from('instance_transfers')
      .update({ status: 'processing' })
      .eq('id', transferId)

    // Step 2: Fetch client + instance data
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, email, company')
      .eq('id', clientId)
      .single()

    const { data: instance } = await supabase
      .from('client_instances')
      .select('id, instance_url, slug, active_modules, supabase_project_id, tier')
      .eq('id', instanceId)
      .single()

    if (!client || !instance) {
      throw new Error(`Client or instance not found: clientId=${clientId}, instanceId=${instanceId}`)
    }

    const transferDate = new Date().toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Step 3: Generate "Guide d'autonomie" (MVP: plain text)
    const modulesList = ((instance.active_modules as string[] | null) ?? [])
      .map((m: string) => `- ${m}`)
      .join('\n')

    const guide = `# Guide d'Autonomie — Instance MonprojetPro One

**Client** : ${client.name}
**Entreprise** : ${client.company}
**Instance** : ${instance.instance_url}
**Date de transfert** : ${transferDate}

## 1. Architecture Technique

Votre instance MonprojetPro One est construite sur les technologies suivantes :
- **Framework** : Next.js 16.1 (App Router)
- **UI** : React 19, Tailwind CSS 4
- **Backend** : Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Déploiement** : Vercel (recommandé) ou self-hosted

### Modules actifs
${modulesList}

## 2. Variables d'Environnement

Créez un fichier \`.env.local\` à la racine du projet :

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<votre-url-supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<votre-clé-anon>
SUPABASE_SERVICE_ROLE_KEY=<votre-clé-service-role>

# App
NEXT_PUBLIC_APP_URL=${instance.instance_url}
\`\`\`

## 3. Installation et Déploiement

### Option A : Déploiement Vercel (recommandé)
1. Importez le repo Git sur Vercel
2. Configurez les variables d'environnement
3. Déployez (automatique)

### Option B : Self-hosted
1. \`npm install\`
2. \`npm run build\`
3. \`npm run start\`

## 4. Accès Supabase

Vos credentials Supabase vous ont été transférés. Vous êtes propriétaire du projet.

${instance.supabase_project_id
  ? `**Projet ID** : ${instance.supabase_project_id}\n**URL Dashboard** : https://supabase.com/dashboard/project/${instance.supabase_project_id}`
  : '**Action requise** : Créez un nouveau projet Supabase sur https://supabase.com et restaurez le dump fourni.'
}

## 5. Support Technique

MonprojetPro propose un support technique optionnel (payant) :
- **Email** : support@monprojet-pro.com
- **Tarif** : 150€/h (interventions ponctuelles)
- **Abonnement** : 300€/mois (support continu)

---

*Document généré automatiquement lors du transfert d'instance le ${transferDate}.*
`

    // Step 4: Create transfer package (MVP: guide only as text file)
    // In production: ZIP with code source + DB dump + docs + guide PDF
    const packageContent = new TextEncoder().encode(guide)
    const fileName = `monprojetpro-instance-${instance.slug}-${new Date().toISOString().split('T')[0]}.txt`
    const filePath = `${clientId}/${transferId}/${fileName}`

    // Step 5: Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from('transfers')
      .upload(filePath, packageContent, {
        contentType: 'text/plain',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    const fileSizeBytes = packageContent.byteLength

    // Step 6: Update transfer record as completed
    await supabase
      .from('instance_transfers')
      .update({
        status: 'completed',
        file_path: filePath,
        file_size_bytes: fileSizeBytes,
        sent_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', transferId)

    // Step 7: Update client_instances status → 'transferred'
    await supabase
      .from('client_instances')
      .update({
        status: 'transferred',
        transferred_at: new Date().toISOString(),
      })
      .eq('id', instanceId)

    // Step 8: Log activity
    await supabase.from('activity_logs').insert({
      actor_type: 'system',
      actor_id: clientId,
      action: 'client_instance_transferred',
      entity_type: 'client',
      entity_id: clientId,
      metadata: {
        transfer_id: transferId,
        instance_id: instanceId,
        recipient_email: recipientEmail,
        file_path: filePath,
      },
    })

    // Step 9: Send email to client
    const safeClientName = escapeHtml(client.name)
    const safeRecipientEmail = escapeHtml(recipientEmail)

    await supabase.functions.invoke('send-email', {
      body: {
        to: recipientEmail,
        subject: 'Votre instance MonprojetPro One vous est transférée',
        html: `<h2>Bonjour ${safeClientName},</h2>
<p>Votre instance MonprojetPro One a été transférée avec succès.</p>
<p>Vous trouverez en pièce jointe votre guide d'autonomie.</p>
<p>Pour toute question, contactez notre support : <a href="mailto:support@monprojet-pro.com">support@monprojet-pro.com</a></p>
<p><em>L'équipe MonprojetPro</em></p>`,
        text: `Bonjour ${safeClientName},\n\nVotre instance MonprojetPro One a été transférée avec succès.\n\nPour toute question : support@monprojet-pro.com\n\nL'équipe MonprojetPro`,
      },
    })

    return new Response(
      JSON.stringify({ success: true, transferId, filePath }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('[TRANSFER_CLIENT_INSTANCE] Error:', errorMessage)

    // Mark transfer as failed
    await supabase
      .from('instance_transfers')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('id', transferId)

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
