# Story 12.5b: Preparation integrations P2 — Webhooks & API

Status: done

## Story

As a **MiKL (operateur)**,
I want **avoir la structure de donnees prete pour les integrations futures (webhooks sortants et API client)**,
so that **la plateforme est prete a evoluer vers les integrations en Phase 2 sans migration lourde**.

## Acceptance Criteria

**Given** la preparation des integrations futures (FR115, FR116)
**When** la structure est mise en place
**Then** :

**Webhooks sortants (FR115) — Structure P2 :**
- Page "Webhooks" dans le module Admin : "Fonctionnalite disponible en Phase 2"
- Table `outgoing_webhooks` creee (migration)
- UI placeholder avec description

**API Client (FR116) — Structure P2 :**
- Page "API" dans le module Admin : "Fonctionnalite disponible en Phase 2"
- Table `api_keys` creee (migration)
- UI placeholder avec description
- Mention "Phase 2" clairement visible

## Tasks / Subtasks

- [x] Creer la migration tables P2 (AC: #1, #2)
  - [x] Creer `supabase/migrations/00068_create_p2_integration_tables.sql` :
    ```sql
    CREATE TABLE outgoing_webhooks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      url TEXT NOT NULL,
      events TEXT[] NOT NULL DEFAULT '{}',
      secret TEXT NOT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id),
      key_hash TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      permissions TEXT[] NOT NULL DEFAULT '{}',
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      revoked_at TIMESTAMPTZ
    );

    ALTER TABLE outgoing_webhooks ENABLE ROW LEVEL SECURITY;
    CREATE POLICY outgoing_webhooks_operator ON outgoing_webhooks USING (is_operator());

    ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
    CREATE POLICY api_keys_operator ON api_keys USING (is_operator());
    CREATE POLICY api_keys_owner ON api_keys FOR SELECT
      USING (client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid()));
    ```

- [x] Creer les composants placeholders (AC: #1, #2)
  - [x] Creer `packages/modules/admin/components/webhooks-placeholder.tsx` :
    - Badge "Phase 2" orange/amber
    - Titre "Webhooks sortants"
    - Description : "Configurez des webhooks sortants pour integrer MonprojetPro avec vos outils (Slack, Zapier, Make...)"
    - Icone webhook + illustration
  - [x] Creer `packages/modules/admin/components/api-placeholder.tsx` :
    - Badge "Phase 2"
    - Titre "API Client"
    - Description : "Generez des cles API pour permettre a vos clients d'integrer MonprojetPro dans leurs systemes"
    - Icone API key + illustration

- [x] Ajouter les onglets P2 dans la page Admin Hub (AC: #1, #2)
  - [x] Ajouter onglet "Webhooks" dans la page Admin → `<WebhooksPlaceholder />`
  - [x] Ajouter onglet "API" dans la page Admin → `<ApiPlaceholder />`

- [x] Creer les tests unitaires
  - [x] Test migration : tables creees avec bons schemas, RLS en place (4 tests)
  - [x] Test composants placeholders : rendu badge P2, descriptions (4 tests)

## Dev Notes

### Architecture Patterns

- **Story minimaliste** : objectif principal = creer les tables et les placeholders UI. Aucune logique metier a implementer.
- **Tables vides** : les tables `outgoing_webhooks` et `api_keys` restent vides — elles sont creees pour eviter une migration future quand P2 sera developpe.
- **Badge "Phase 2"** : utiliser `<Badge variant="outline" className="text-amber-500 border-amber-500">Phase 2</Badge>` depuis `@monprojetpro/ui`.

### Source Tree

```
supabase/migrations/
└── 00068_create_p2_integration_tables.sql  # CREE (note: 00067 deja pris par seed email templates)

packages/modules/admin/
└── components/
    ├── webhooks-placeholder.tsx            # CREE
    ├── webhooks-placeholder.test.tsx       # CREE
    ├── api-placeholder.tsx                 # CREE
    └── api-placeholder.test.tsx            # CREE
```

### Technical Constraints

- **Numero migration** : 00068 (00067 deja utilise par seed_email_templates_story123).
- **Pas de logique webhook** : ne pas implementer d'envoi, de signature HMAC, ou de retry pour les webhooks. P2 uniquement.

### References

- [Source: epic-12-administration-analytics-templates-stories-detaillees.md#Story 12.5b]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Migration 00068 (pas 00067) : 00067 etait deja pris par `00067_seed_email_templates_story123.sql`
- Admin page avait deja l'onglet Webhooks (stub) mais pas l'onglet API — les deux ont ete mis a jour

### Completion Notes List

- Migration `00068_create_p2_integration_tables.sql` creee avec tables `outgoing_webhooks` et `api_keys`, RLS + policies
- Composants `WebhooksPlaceholder` et `ApiPlaceholder` crees avec Badge "Phase 2" amber, icones, descriptions
- Page Admin Hub mise a jour : onglet Webhooks remplace le stub, onglet "API" ajoute
- Exports ajoutes dans `packages/modules/admin/index.ts`
- 12 tests passes : 4 migration (dans migrations.test.ts), 4 webhooks-placeholder, 4 api-placeholder

#### Code Review Fixes (Opus 4.6)
- [CR-1] MEDIUM: Ajout `updated_at` + triggers `trg_outgoing_webhooks_updated_at` et `trg_api_keys_updated_at` (convention projet)
- [CR-2] MEDIUM: `api_keys.client_id` FK avec `ON DELETE CASCADE` (lifecycle coherence)
- [CR-3] MEDIUM: RLS policies splitees en per-operation (SELECT/INSERT/UPDATE/DELETE) avec `WITH CHECK` pour INSERT
- [CR-4] MEDIUM: Import explicite `vi` dans les fichiers test (coherence projet)

### File List

- supabase/migrations/00068_create_p2_integration_tables.sql (CREE)
- packages/modules/admin/components/webhooks-placeholder.tsx (CREE)
- packages/modules/admin/components/webhooks-placeholder.test.tsx (CREE)
- packages/modules/admin/components/api-placeholder.tsx (CREE)
- packages/modules/admin/components/api-placeholder.test.tsx (CREE)
- packages/modules/admin/index.ts (MODIFIE)
- apps/hub/app/(dashboard)/modules/admin/page.tsx (MODIFIE)
- supabase/migrations/migrations.test.ts (MODIFIE — 4 tests migration ajoutés)
- _bmad-output/implementation-artifacts/sprint-status.yaml (MODIFIE)
