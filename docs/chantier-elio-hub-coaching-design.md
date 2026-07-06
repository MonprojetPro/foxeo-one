# Design — Chantier Élio Hub agentique + Coaching One+ (2026-07-06)

> Document de référence pour les équipiers de dev. Contrats d'interface FIGÉS — ne pas dévier.
> Décisions produit validées par MiKL le 2026-07-06 (session Élio Hub / One+).

## Décisions produit (source de vérité)

1. **Élio Hub = bras droit de MiKL** : accès en lecture à tout le Hub (clients, parcours, validations, factures, messages, MenuFacile et futurs produits), et capable d'AGIR (envoyer un message chat de la part de MiKL, créer facture/devis, envoyer email, déclencher un parcours Lab…).
2. **Garde-fou par défaut, débrayable** : toute action à effet externe crée une proposition à valider (carte dans le chat). MAIS si MiKL précise explicitement dans son message qu'il n'a pas besoin de vérifier (« sans vérif », « envoie directement »), l'action s'exécute immédiatement. Le débrayage vaut pour la demande en cours, jamais par défaut.
3. **Multi-LLM obligatoire** : plus aucune dépendance en dur à Claude/Anthropic. Fournisseur + modèle configurables depuis le Hub. Deux adaptateurs : `anthropic` (natif) et `openai-compatible` (couvre OpenAI, Mistral, Groq, DeepSeek, Gemini via endpoint OpenAI, OpenRouter…).
4. **Coaching One+** : le client réserve seul (Cal.com). 1 crédit/mois par défaut, **configurable par client** et rechargeable manuellement par MiKL. Crédits cumulables (report). Pas de blocage : sans crédit, la séance est facturée 45 € automatiquement, ajoutée à la facturation mensuelle. Toutes les visios enregistrées nourrissent Élio Hub et Élio One.
5. **Facturation One à remettre en route** : grille v2 (One 39 €/mois = tier `essentiel`, One+ 99 €/mois = tier `agentique`, Ponctuel = devis), UI de création d'abonnement, sync Pennylane opérationnelle.

## Contrat 1 — Edge Function `elio-chat` v2 (multi-provider + tools)

Rétro-compatible : les 12 call-sites existants continuent de marcher sans modification.

**Body accepté** :
```jsonc
{
  "systemPrompt": "string — requis, non vide",
  "message": "string — mode simple (legacy)",
  "history": [{ "role": "user|assistant", "content": "..." }],   // legacy
  "messages": [ /* mode agent : blocs Anthropic natifs (text, tool_use, tool_result) */ ],
  "model": "string?",
  "maxTokens": 8192, "temperature": 1.0,
  "provider": {                       // NOUVEAU — optionnel, défaut anthropic
    "name": "anthropic" | "openai-compatible",
    "baseUrl": "https://…",           // requis si openai-compatible
    "apiKeyEnv": "OPENAI_API_KEY"     // nom du secret Edge Function — DOIT finir par _API_KEY (allowlist)
  },
  "tools": [ /* format Anthropic {name, description, input_schema} — l'adaptateur convertit pour openai */ ]
}
```
**Réponse** (le champ `content` reste la concaténation du texte — compat totale) :
```jsonc
{ "content": "…", "toolCalls": [{ "id", "name", "input" }], "stopReason": "end_turn|tool_use|…",
  "model": "…", "inputTokens": 0, "outputTokens": 0 }
```
- `verify_jwt = true` dans config.toml (fix sécu — la fonction est actuellement publique).
- L'adaptateur openai-compatible : `POST {baseUrl}/chat/completions`, mappe system→message system, tools→functions, tool_use↔tool_calls, tool_result↔role:tool. Les `messages` entrants sont TOUJOURS au format Anthropic ; l'adaptateur convertit dans les deux sens.
- Clés : `Deno.env.get(apiKeyEnv)` uniquement si le nom finit par `_API_KEY`. Jamais de clé dans le body.

## Contrat 2 — Config LLM (`system_config`)

Clé `llm_config`, valeur JSON :
```jsonc
{
  "default": { "provider": "anthropic", "model": "claude-sonnet-4-6", "baseUrl": null, "apiKeyEnv": "ANTHROPIC_API_KEY" },
  "micro":   { "provider": "anthropic", "model": "claude-haiku-4-5-20251001", "baseUrl": null, "apiKeyEnv": "ANTHROPIC_API_KEY" },
  "hubAgent": { "provider": "anthropic", "model": "claude-sonnet-4-6", "baseUrl": null, "apiKeyEnv": "ANTHROPIC_API_KEY" }
}
```
Actions dans `packages/modules/elio/actions/llm-config.ts` : `getLlmConfig()` (fallback défauts si clé absente) et `setLlmConfig(config)` (opérateur only, validation Zod). `callLLM()` lit `default`, les callers micro (concierge, titres) lisent `micro`, l'agent Hub lit `hubAgent`.

## Contrat 3 — Table `elio_hub_actions` (garde-fou)

```sql
id uuid pk default gen_random_uuid(),
operator_id uuid not null references operators(id),
conversation_id uuid references elio_conversations(id) on delete set null,
tool_name text not null,
tool_input jsonb not null,
summary text not null,              -- phrase lisible : « Envoyer message chat à Dupont : "…" »
status text not null default 'pending'
  check (status in ('pending','confirmed','rejected','executed','failed','auto_executed')),
result jsonb, error text,
created_at timestamptz default now(), decided_at timestamptz, executed_at timestamptz
```
RLS : opérateur uniquement (is_operator(operator_id)). Realtime : ajouter à la publication.

## Contrat 4 — Boucle agent Hub (Server Action, PAS dans l'Edge Function)

`packages/modules/elio/actions/elio-hub-agent.ts` — la boucle tourne côté Next.js avec la **session de MiKL** (RLS naturelle, env MenuFacile disponible). Max 8 tours d'outils, timeout global 60 s.

Outils LECTURE (exécution immédiate) : `get_hub_overview`, `search_client`, `get_client_activity` (dernier contact : messages + meetings + validations), `list_unpaid_invoices`, `list_pending_validations`, `get_menufacile_report` (metrics + timeseries sommées sur la période demandée), `list_stagnant_parcours`, `list_silent_clients`.

Outils ACTION (garde-fou) : `send_chat_message`, `send_email_to_client`, `create_quote_draft`, `launch_parcours`, `add_coaching_credits`. Chaque outil action accepte `skip_confirmation: boolean` — le system prompt interdit de le mettre à `true` sauf si MiKL a EXPLICITEMENT dit dans son message courant de ne pas vérifier. Sinon : INSERT `elio_hub_actions` (pending) + la réponse du tool est « proposition enregistrée, en attente de validation » ; la carte de confirmation s'affiche dans le chat ; `confirmElioHubAction(id)` / `rejectElioHubAction(id)` exécutent ou annulent.

## Contrat 5 — Coaching One+ (schéma)

```sql
-- migration 20260706120000_coaching_credits.sql (équipier Coaching)
alter table client_configs add column coaching_monthly_credits int not null default 1;
create table coaching_credit_ledger (
  id uuid pk, client_id uuid not null references clients(id) on delete cascade,
  delta int not null, reason text not null
    check (reason in ('monthly_accrual','session_booked','manual_adjust','session_cancelled','initial_grant')),
  meeting_id uuid references meetings(id) on delete set null,
  note text, created_by text not null default 'system', created_at timestamptz default now()
);
-- solde = somme des delta ; fonction get_coaching_balance(p_client_id uuid) returns int
-- meetings.type : élargir le CHECK avec 'coaching'
```
```sql
-- migration 20260706121000_billable_items.sql (équipier Billing)
create table billable_items (
  id uuid pk, client_id uuid not null references clients(id) on delete cascade,
  item_type text not null check (item_type in ('coaching_session')),
  label text not null, amount_cents int not null,          -- 4500 pour une séance
  status text not null default 'pending' check (status in ('pending','invoiced','cancelled')),
  meeting_id uuid references meetings(id) on delete set null,
  pennylane_invoice_id text, created_at timestamptz default now(), invoiced_at timestamptz
);
```
Flux réservation : webhook Cal.com (Edge `calcom-webhook`) → meeting `type='coaching'` (event type coaching détecté via slug/metadata) → si `get_coaching_balance > 0` : ledger `-1 session_booked` ; sinon : INSERT `billable_items` (pending, 4500) + notification client « séance hors forfait — 45 € ajoutés à ta prochaine facture ». Annulation → recréditer / annuler l'item.
Accrual mensuel : cron le 1er du mois → pour chaque client One+ actif : ledger `+coaching_monthly_credits monthly_accrual`.
Facturation mensuelle : cron → les `billable_items` pending du mois écoulé → facture Pennylane (POST /customer_invoices) par client + mirror `billing_sync` AVEC `client_id` + statut invoiced.

## Contrat 6 — Grille tarifaire v2 (mapping)

| Tier technique (`subscription_tier`) | Offre commerciale | Prix HT/mois |
|---|---|---|
| `base` | Ponctuel (pas d'abonnement) | devis |
| `essentiel` | **One** | **39 €** |
| `agentique` | **One+** | **99 €** |

`elio_tier` : `one` pour One, `one_plus` pour One+ — la graduation One+ DOIT écrire `elio_tier='one_plus'` (bug actuel : graduate-client.ts force 'one').

## Périmètres par équipier (fichiers possédés — ne pas toucher aux autres)

- **T1 LLM-Core** : `supabase/functions/elio-chat/**`, `packages/modules/elio/actions/{correct-and-adapt-text,generate-draft,adjust-draft,llm-config}.ts`, `packages/modules/elio/utils/token-cost-calculator.ts`, barrel `packages/modules/elio/index.ts` (ajouts seulement).
- **T3 Coaching** : migration `20260706120000_*`, `supabase/functions/calcom-webhook/**`, `packages/modules/visio/**`, `packages/modules/crm/**` (config crédits + fix tier), `apps/client/components/one-activity-cockpit.tsx`.
- **T4 Billing** : migrations `20260706121000_*`/`20260706122000_*`, `packages/modules/facturation/**`, `supabase/functions/billing-sync/**`, nouvelle Edge Function `monthly-billing/**`.
- **T2 Agent-Hub** (vague suivante) : `packages/modules/elio/actions/elio-hub-agent*.ts`, outils, `send-to-elio.ts`, `elio-chat.tsx` (mémoire conversation + cartes), migration `elio_hub_actions`.
- **T5 Pilotage** (vague suivante) : `apps/hub/app/(dashboard)/elio/hub/**`, accueil Hub (vraies suggestions), transcripts → contexte agents.

## Règles projet à respecter (rappel)

- Server Actions : jamais de throw, retour `{ data, error }` ; fichiers `'use server'` = exports async uniquement (un export const casse next build).
- Notifications : `recipient_id` = auth_user_id, `type` dans la liste CHECK, `title` NOT NULL ; insert cross-user en service_role SANS `.select()`.
- `client_configs` : PK = `client_id` (pas de colonne `id`).
- Tests co-localisés `*.test.ts`. Pas de nouvelle app/route non listée ici.
- Les équipiers NE déploient PAS (ni migrations, ni edge functions), NE committent PAS — l'orchestrateur s'en charge après revue.
