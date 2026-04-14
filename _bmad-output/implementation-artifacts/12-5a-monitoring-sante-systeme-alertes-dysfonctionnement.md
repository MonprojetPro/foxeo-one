# Story 12.5a: Monitoring sante systeme & alertes dysfonctionnement

Status: done

## Story

As a **MiKL (operateur)**,
I want **voir un indicateur de sante du systeme et recevoir des alertes en cas de dysfonctionnement**,
so that **je sais que tout fonctionne et je suis informe immediatement en cas de probleme**.

## Acceptance Criteria

**Given** MiKL accede a la page "Monitoring" (FR147)
**When** la page se charge
**Then** un dashboard affiche :
- **Statut global** : vert (OK) / orange (degradé) / rouge (problème)
- **Services internes** : Supabase DB (SELECT 1 < 500ms), Auth, Realtime, Storage
- **Services externes** : Pennylane API v2 (GET /customers?page_size=1 < 2s), Cal.com, OpenVidu
- **Metriques** : temps de reponse moyen, nb erreurs (derniere heure), taille DB
- Checks a la demande (bouton "Rafraichir") et cron 5 min

**Given** un dysfonctionnement est detecte (FR148)
**When** un service depasse le seuil
**Then** :
1. Statut global passe a orange/rouge
2. Notification prioritaire MiKL : "Alerte systeme — {service} ne repond pas"
3. Activity log 'system_alert'
4. Debounce 15 min (pas de spam si le probleme persiste)
5. Mode degrade : systeme reste fonctionnel, message explicite aux utilisateurs

## Tasks / Subtasks

- [x] Creer l'Edge Function `health-check-cron` (AC: #1)
  - [x] Creer `supabase/functions/health-check-cron/index.ts`
  - [x] Cron toutes les 5 min via pg_cron
  - [x] Checks services internes : Supabase DB (`SELECT 1`), Storage (HEAD request), Realtime (connection check)
  - [x] Checks services externes : `GET https://app.pennylane.com/api/external/v2/me` (timeout 2s), Cal.com ping, OpenVidu ping
  - [x] Mesurer le temps de reponse de chaque check
  - [x] UPSERT resultats dans `system_config.health_checks` (JSONB avec timestamp + latence + statut par service)
  - [x] Si seuil depasse : envoyer notification MiKL (via notification in-app type 'system') + activity log system_alert
  - [x] Debounce : verifier `system_config.health_alert_debounce` pour eviter spam (15 min entre alertes par service)

- [x] Creer les composants monitoring (AC: #1)
  - [x] Creer `packages/modules/admin/components/system-health.tsx` — dashboard sante
  - [x] `useSystemHealth()` hook : TanStack Query sur `system_config WHERE key='health_checks'`
  - [x] Indicateur statut global : badge vert/orange/rouge (calcule desde les checks individuels)
  - [x] Tableau des services avec statut, latence, derniere verif
  - [x] Bouton "Rafraichir" → invoke Edge Function `health-check-cron` manuellement

- [x] Ajouter la page Monitoring dans le Hub (AC: #1)
  - [x] Ajouter onglet "Monitoring" dans la page Admin Hub
  - [x] Afficher `<SystemHealth />`

- [x] Creer les tests unitaires
  - [x] Test Edge Function `health-check-cron` : checks services, seuils, debounce notification (20 tests via health-check-logic.test.ts)
  - [x] Test `system-health.tsx` : rendu statuts, couleurs, bouton refresh, erreur (10 tests)

## Dev Notes

### Architecture Patterns

- **`system_config.health_checks`** JSONB format :
  ```json
  {
    "checkedAt": "2026-03-07T10:00:00Z",
    "services": {
      "supabase_db": { "status": "ok", "latencyMs": 45 },
      "supabase_storage": { "status": "ok", "latencyMs": 120 },
      "pennylane": { "status": "degraded", "latencyMs": 3200 },
      "cal_com": { "status": "ok", "latencyMs": 890 }
    },
    "globalStatus": "degraded"
  }
  ```
- **Check Pennylane** : utiliser `GET /me` (endpoint de verification auth) plutot que `/customers?page_size=1` pour minimiser les credits API.
- **Mode degrade** : si un service externe (Pennylane, Cal.com) est en erreur, le systeme MonprojetPro reste fonctionnel — les fonctionnalites dependantes affichent "Service temporairement indisponible".
- **Debounce alerte** : stocker `system_config.last_alert_{service}_at` pour tracker le dernier envoi d'alerte par service.

### Source Tree

```
supabase/functions/health-check-cron/
├── index.ts                              # Edge Function
└── health-check-logic.ts                 # Logique métier testable

packages/modules/admin/
├── components/
│   ├── system-health.tsx                 # Dashboard santé
│   └── system-health.test.tsx            # Tests composant
└── hooks/
    └── use-system-health.ts              # TanStack Query hook
```

### Existing Code Findings

- **`system_config` table** : creee Story 12.1 (migration 00066). `health_checks` key pre-seedee avec `{}`.
- **Pattern Edge Function cron + notification** : voir `elio-alerts-cron/index.ts` — meme pattern exact.
- **`send-email` Edge Function** : invoquer pour les alertes email MiKL.

### Technical Constraints

- **Checks Realtime** : tester la connexion Supabase Realtime depuis une Edge Function est complexe. Simplifier : verifier que le canal Realtime repond via l'API REST de Supabase (`GET /realtime/v1/channels` avec service role key).
- **PENNYLANE_API_TOKEN** : necessaire pour le check Pennylane. Si non configure (dev sans compte), skipping ce check gracieusement.

### References

- [Source: epic-12-administration-analytics-templates-stories-detaillees.md#Story 12.5a]
- [Source: supabase/functions/elio-alerts-cron/index.ts] — pattern reference

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6 (implementation) + claude-opus-4-6 (code review)

### Debug Log References
- Test "désactive le bouton pendant rafraîchissement" : corrigé aria-label match
- CR fix: notification type `system_alert` → `system` (constraint violation)
- CR fix: `timedFetch` dead-code ternary → proper `timeoutMs` parameter
- CR fix: `checkSupabaseDb` non-existent RPC → real DB round-trip via REST SELECT
- CR fix: unchecked `.insert()` errors → logged with `console.error`
- CR fix: `hover:bg-white/3` → `hover:bg-white/5` (project convention)
- CR fix: added error state handling in `SystemHealth` component + test

### Completion Notes List
- Edge Function `health-check-cron` : checks parallèles de 7 services (4 internes + 3 externes), seuils par service dans `health-check-logic.ts`, UPSERT `system_config.health_checks`
- Logique métier extraite dans `health-check-logic.ts` (Vitest-compatible, pas Deno) pour testabilité maximale
- Debounce alertes : `system_config.health_alert_debounce` key séparée, par service (ex: `last_alert_pennylane_at`)
- Notifications opérateur : `recipient_type: 'operator'`, `recipient_id: operator.auth_user_id`, type `system` + activity_log `system_alert`
- Services non configurés (OPENVIDU_URL absent) : skip gracieux, status 'ok' avec error message `skipped`
- `useSystemHealth()` : TanStack Query + `refetchInterval` 5min + `triggerRefresh()` via `supabase.functions.invoke`
- `SystemHealth` composant : skeleton loader, error state, badge global vert/orange/rouge, tableau 7 services, bouton Rafraîchir
- Onglet "Monitoring" ajouté dans `apps/hub/app/(dashboard)/modules/admin/page.tsx`
- Code review: 3 HIGH, 3 MEDIUM, 2 LOW trouvés et corrigés
- Types dupliqués documentés (Deno Edge Function ≠ workspace module — import croisé impossible)

### File List
- supabase/functions/health-check-cron/index.ts (CRÉÉ)
- supabase/functions/health-check-cron/health-check-logic.ts (CRÉÉ)
- supabase/functions/health-check-cron/health-check-logic.test.ts (CRÉÉ)
- packages/modules/admin/hooks/use-system-health.ts (CRÉÉ)
- packages/modules/admin/components/system-health.tsx (CRÉÉ)
- packages/modules/admin/components/system-health.test.tsx (CRÉÉ)
- packages/modules/admin/index.ts (MODIFIÉ)
- apps/hub/app/(dashboard)/modules/admin/page.tsx (MODIFIÉ)
- _bmad-output/implementation-artifacts/sprint-status.yaml (MODIFIÉ)

## Change Log

- 2026-03-09 : Story 12.5a implémentée — Edge Function health-check-cron, composants monitoring Hub, 30 tests
- 2026-03-09 : Code review fixes — notification type constraint, DB check, error handling, error state UI
