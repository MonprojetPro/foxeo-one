/**
 * Outils ACTION de l'agent Élio Hub — garde-fou (Contrat 4).
 *
 * Deux phases distinctes :
 *  1. `prepareHubAction`  : résout le client, valide l'input, construit le summary
 *     lisible en français et fige un tool_input enrichi (_resolved_client_id / name)
 *     pour que l'exécution soit déterministe, même différée à la confirmation.
 *  2. `executeHubAction`  : exécute l'effet réel (chat, email, devis, parcours,
 *     crédits) à partir du tool_input préparé. Appelée soit immédiatement
 *     (skip_confirmation), soit plus tard via confirmElioHubAction.
 *
 * Imports inter-modules assumés (fichiers existants à HEAD uniquement) :
 *  - createAndSendQuote      (@monprojetpro/modules-facturation — sendNow:false)
 *  - applyParcoursTemplate   (@monprojetpro/module-parcours)
 *  - ⚠️ PAS d'import du module chat : modules-chat dépend déjà de module-elio
 *    (cycle turbo). send_chat_message écrit directement dans `messages` +
 *    `notifications` via Supabase — la doctrine officielle inter-modules.
 *    Logique alignée sur packages/modules/chat/actions/send-message.ts.
 *
 * Fichier serveur ordinaire (PAS 'use server') : importé par la boucle agent.
 */

import type { createServerSupabaseClient } from '@monprojetpro/supabase'
import { createAndSendQuote } from '@monprojetpro/modules-facturation'
import type { LineItem } from '@monprojetpro/modules-facturation'
import { applyParcoursTemplate, getParcoursTemplate, PARCOURS_TEMPLATES } from '@monprojetpro/module-parcours'
import { resolveClient, clientDisplayName } from './resolve-client'
import type { HubActionToolName } from '../../types/elio-hub-agent.types'

type Supa = Awaited<ReturnType<typeof createServerSupabaseClient>>

export interface HubActionContext {
  operatorId: string
}

export interface PreparedHubAction {
  toolName: HubActionToolName
  /** Input enrichi (_resolved_client_id, _resolved_client_name) — figé en base. */
  toolInput: Record<string, unknown>
  /** Phrase lisible en français, affichée dans la carte de confirmation. */
  summary: string
}

export type PrepareHubActionResult =
  | { status: 'ready'; prepared: PreparedHubAction }
  /** Pas une action : réponse informationnelle à renvoyer au LLM (ex : liste des circuits). */
  | { status: 'info'; payload: unknown }
  | { status: 'error'; message: string; candidates?: unknown }

export type ExecuteHubActionResult =
  | { ok: true; result: Record<string, unknown> }
  | { ok: false; error: string }

function str(input: Record<string, unknown>, key: string): string {
  const v = input[key]
  return typeof v === 'string' ? v.trim() : ''
}

function preview(text: string, max = 120): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

// ── Phase 1 : préparation (résolution + summary) ─────────────────────────────

export async function prepareHubAction(
  supabase: Supa,
  toolName: HubActionToolName,
  input: Record<string, unknown>,
): Promise<PrepareHubActionResult> {
  const clientQuery = str(input, 'client')
  const resolved = await resolveClient(supabase, clientQuery)
  if (!resolved.ok) {
    return { status: 'error', message: resolved.message, candidates: resolved.candidates }
  }
  const client = resolved.client
  const name = clientDisplayName(client)

  const base: Record<string, unknown> = {
    ...input,
    _resolved_client_id: client.id,
    _resolved_client_name: name,
  }
  delete base.skip_confirmation

  switch (toolName) {
    case 'send_chat_message': {
      const content = str(input, 'content')
      if (!content) return { status: 'error', message: 'Le message à envoyer est vide.' }
      return {
        status: 'ready',
        prepared: {
          toolName,
          toolInput: base,
          summary: `Envoyer un message chat à ${name} : « ${preview(content)} »`,
        },
      }
    }

    case 'send_email_to_client': {
      const subject = str(input, 'subject')
      const body = str(input, 'body')
      if (!subject || !body) return { status: 'error', message: "Sujet et corps de l'email requis." }
      if (!client.email) return { status: 'error', message: `${name} n'a pas d'adresse email enregistrée.` }
      if (!client.authUserId) {
        return { status: 'error', message: `${name} n'a pas encore de compte actif — email transactionnel impossible.` }
      }
      return {
        status: 'ready',
        prepared: {
          toolName,
          toolInput: base,
          summary: `Envoyer un email à ${name} — sujet : « ${preview(subject, 80)} »`,
        },
      }
    }

    case 'launch_parcours': {
      const templateKey = str(input, 'template_key')
      if (!templateKey) {
        // Pas un échec : on renvoie la liste des circuits pour que l'agent demande à MiKL.
        return {
          status: 'info',
          payload: {
            message: 'Aucun circuit précisé — voici les circuits types disponibles. Demande à MiKL lequel installer.',
            templates: PARCOURS_TEMPLATES.map((t) => ({
              key: t.key,
              label: t.label,
              targetProfile: t.targetProfile,
              stepsCount: t.agentNames.length,
            })),
          },
        }
      }
      const template = getParcoursTemplate(templateKey)
      if (!template) {
        return {
          status: 'error',
          message: `Circuit « ${templateKey} » introuvable. Circuits valides : ${PARCOURS_TEMPLATES.map((t) => t.key).join(', ')}.`,
        }
      }
      return {
        status: 'ready',
        prepared: {
          toolName,
          toolInput: base,
          summary: `Installer le circuit « ${template.label} » (${template.agentNames.length} étapes) pour ${name}`,
        },
      }
    }

    case 'create_quote_draft': {
      const rawLines = Array.isArray(input.lines) ? input.lines : []
      const lines = rawLines
        .filter((l): l is Record<string, unknown> => typeof l === 'object' && l !== null)
        .map((l) => ({
          label: typeof l.label === 'string' ? l.label : '',
          quantity: typeof l.quantity === 'number' && l.quantity > 0 ? l.quantity : 1,
          unitPriceHt: typeof l.unit_price_ht === 'number' ? l.unit_price_ht : NaN,
          description: typeof l.description === 'string' ? l.description : null,
        }))
      if (lines.length === 0 || lines.some((l) => !l.label || Number.isNaN(l.unitPriceHt))) {
        return { status: 'error', message: 'Lignes de devis invalides — chaque ligne exige label + unit_price_ht (nombre).' }
      }
      const totalHt = lines.reduce((s, l) => s + l.quantity * l.unitPriceHt, 0)
      return {
        status: 'ready',
        prepared: {
          toolName,
          toolInput: { ...base, lines: lines.map((l) => ({ label: l.label, quantity: l.quantity, unit_price_ht: l.unitPriceHt, description: l.description })) },
          summary: `Créer un devis (brouillon, non envoyé) de ${totalHt.toLocaleString('fr-FR')} € HT pour ${name} (${lines.length} ligne${lines.length > 1 ? 's' : ''})`,
        },
      }
    }

    case 'add_coaching_credits': {
      const credits = typeof input.credits === 'number' ? Math.trunc(input.credits) : NaN
      if (!Number.isFinite(credits) || credits === 0) {
        return { status: 'error', message: 'Nombre de crédits invalide (entier non nul requis).' }
      }
      const verb = credits > 0 ? 'Ajouter' : 'Retirer'
      return {
        status: 'ready',
        prepared: {
          toolName,
          toolInput: { ...base, credits },
          summary: `${verb} ${Math.abs(credits)} crédit${Math.abs(credits) > 1 ? 's' : ''} de coaching à ${name}`,
        },
      }
    }
  }
}

// ── Phase 2 : exécution réelle ────────────────────────────────────────────────

export async function executeHubAction(
  supabase: Supa,
  ctx: HubActionContext,
  toolName: HubActionToolName,
  toolInput: Record<string, unknown>,
): Promise<ExecuteHubActionResult> {
  const clientId = str(toolInput, '_resolved_client_id')
  const clientName = str(toolInput, '_resolved_client_name')
  if (!clientId) return { ok: false, error: 'Client non résolu dans la proposition (tool_input corrompu).' }

  try {
    switch (toolName) {
      case 'send_chat_message': {
        // Écriture directe (doctrine inter-modules : communication via Supabase).
        // Miroir de chat/actions/send-message.ts (cas operator) : insert messages
        // + notification cloche au client (kit complet — le Realtime chat écoute
        // la table messages, la cloche écoute notifications).
        const content = str(toolInput, 'content')
        if (!content) return { ok: false, error: 'Message vide.' }

        const { data: inserted, error: insertError } = await supabase
          .from('messages')
          .insert({
            client_id: clientId,
            operator_id: ctx.operatorId,
            sender_type: 'operator',
            content,
          })
          .select()
          .single()
        if (insertError || !inserted) {
          return { ok: false, error: `Envoi du message impossible : ${insertError?.message ?? 'erreur inconnue'}` }
        }

        // Notification au client (best-effort — même convention que send-message.ts)
        const { data: clientRow } = await supabase
          .from('clients')
          .select('auth_user_id')
          .eq('id', clientId)
          .maybeSingle()
        const clientAuthUserId = (clientRow as { auth_user_id: string | null } | null)?.auth_user_id
        if (clientAuthUserId) {
          const previewText = content.length > 200 ? `${content.substring(0, 200)}…` : content
          const { error: notifError } = await supabase.from('notifications').insert({
            recipient_type: 'client',
            recipient_id: clientAuthUserId,
            type: 'message',
            title: 'Nouveau message de MiKL',
            body: previewText,
            link: '/modules/chat',
          })
          if (notifError) {
            console.warn('[ELIO:HUB_AGENT] Notification chat non créée (message envoyé quand même):', notifError.message)
          }
        }

        return { ok: true, result: { messageId: (inserted as { id?: string }).id ?? null, sentTo: clientName } }
      }

      case 'send_email_to_client': {
        // Email via l'infra transactionnelle existante : INSERT notification →
        // trigger DB trg_send_email_on_notification → Edge Function send-email
        // (template générique : subject = title, corps = body). Respecte
        // email_notifications_enabled. Effet secondaire assumé : le client voit
        // aussi la notification in-app (cloche).
        const { data: clientRow, error: clientError } = await supabase
          .from('clients')
          .select('auth_user_id')
          .eq('id', clientId)
          .maybeSingle()
        if (clientError) return { ok: false, error: clientError.message }
        const authUserId = (clientRow as { auth_user_id: string | null } | null)?.auth_user_id
        if (!authUserId) return { ok: false, error: `${clientName} n'a pas de compte actif.` }

        // Convention notifications : recipient_id = auth_user_id, type dans la liste
        // CHECK ('info' autorisé), title NOT NULL, pas de .select() (RLS SELECT).
        const { error: notifError } = await supabase.from('notifications').insert({
          recipient_type: 'client',
          recipient_id: authUserId,
          type: 'info',
          title: str(toolInput, 'subject'),
          body: str(toolInput, 'body'),
          link: null,
        })
        if (notifError) return { ok: false, error: `Envoi email impossible : ${notifError.message}` }
        return { ok: true, result: { emailQueuedFor: clientName, subject: str(toolInput, 'subject') } }
      }

      case 'launch_parcours': {
        const { data, error } = await applyParcoursTemplate({
          clientId,
          templateKey: str(toolInput, 'template_key'),
          mode: 'append',
        })
        if (error) return { ok: false, error: error.message }
        return {
          ok: true,
          result: {
            client: clientName,
            stepsInstalled: data?.count ?? 0,
            skippedAgents: data?.skipped ?? [],
          },
        }
      }

      case 'create_quote_draft': {
        const rawLines = Array.isArray(toolInput.lines) ? (toolInput.lines as Record<string, unknown>[]) : []
        const lineItems: LineItem[] = rawLines.map((l) => {
          const quantity = typeof l.quantity === 'number' ? l.quantity : 1
          const unitPrice = typeof l.unit_price_ht === 'number' ? l.unit_price_ht : 0
          return {
            label: typeof l.label === 'string' ? l.label : '',
            description: typeof l.description === 'string' ? l.description : null,
            quantity,
            unit: 'piece',
            unitPrice,
            vatRate: 'FR_200',
            total: quantity * unitPrice,
          }
        })
        const notes = str(toolInput, 'notes')
        // sendNow:false — le devis est créé côté Pennylane mais PAS envoyé par email.
        const { data: quoteId, error } = await createAndSendQuote(clientId, lineItems, {
          sendNow: false,
          publicNotes: notes || null,
        })
        if (error) return { ok: false, error: error.message }
        return { ok: true, result: { client: clientName, pennylaneQuoteId: quoteId, emailed: false } }
      }

      case 'add_coaching_credits': {
        const credits = typeof toolInput.credits === 'number' ? Math.trunc(toolInput.credits) : 0
        if (credits === 0) return { ok: false, error: 'Nombre de crédits invalide.' }
        // INSERT direct dans le ledger (schéma Contrat 5) — RLS insert_operator OK
        // avec la session MiKL. created_by='elio_hub' pour tracer l'origine.
        const note = str(toolInput, 'note')
        const { error } = await supabase.from('coaching_credit_ledger').insert({
          client_id: clientId,
          delta: credits,
          reason: 'manual_adjust',
          note: note || `Ajustement via Élio Hub`,
          created_by: 'elio_hub',
        })
        if (error) return { ok: false, error: `Ajout de crédits impossible : ${error.message}` }
        return { ok: true, result: { client: clientName, creditsDelta: credits } }
      }
    }
  } catch (err) {
    console.error(`[ELIO:HUB_AGENT] Exécution ${toolName} en erreur:`, err)
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
