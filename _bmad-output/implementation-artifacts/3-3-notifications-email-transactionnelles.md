# Story 3.3: Notifications email transactionnelles

Status: done

## Story

As a **utilisateur (MiKL ou client)**,
I want **recevoir les notifications importantes par email en plus de l'in-app**,
So that **je suis informé même quand je ne suis pas connecté à la plateforme**.

## Acceptance Criteria

1. **AC1 — Service email** : Infrastructure d'envoi email via Supabase Edge Functions (ou Resend/Postmark). Templates email dans `supabase/functions/emails/`. Retry en cas d'échec (NFR-I5).

2. **AC2 — Types email** : Emails envoyés pour (FR99) : validation ("Votre brief a été validé/refusé" → client), message ("Nouveau message de MiKL" → client / "Nouveau message de {client}" → MiKL), alert ("Client Lab inactif" → MiKL), graduation ("Félicitations ! Votre espace One est prêt" → client), payment ("Échec de paiement" → client + MiKL). Envoi < 10 secondes (NFR-I4).

3. **AC3 — Template email** : HTML responsive branding MonprojetPro. Inclut : logo, titre, corps, bouton CTA (lien plateforme), pied de page avec lien désabonnement. Envoyé depuis noreply@monprojet-pro.com.

4. **AC4 — Double delivery** : Notification in-app TOUJOURS créée (Story 3.2). Email EN PLUS si préférences l'autorisent (défaut: oui). In-app ne dépend pas du succès email (envoi asynchrone).

5. **AC5 — Résilience** : Si service email indisponible, erreur loguée dans `activity_logs`. In-app reste fonctionnel (mode dégradé, NFR-R6). Alerte MiKL si taux d'échec élevé.

6. **AC6 — Tests** : Tests unitaires Edge Function. Tests templates. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Choix et configuration service email (AC: #1)
  - [x] 1.1 Configurer Resend (recommandé pour simplicité) ou Postmark comme provider email
  - [x] 1.2 Setup variables d'environnement : `RESEND_API_KEY`, `EMAIL_FROM` (noreply@monprojet-pro.com)
  - [x] 1.3 Créer helper `supabase/functions/_shared/email-client.ts` — wrapper d'envoi avec retry (3 tentatives, backoff exponentiel)

- [x] Task 2 — Templates email HTML (AC: #3)
  - [x] 2.1 Template de base `supabase/functions/_shared/email-templates/base.ts` — layout HTML responsive (logo, header, body slot, CTA, footer)
  - [x] 2.2 Template `validation.ts` — Brief validé/refusé
  - [x] 2.3 Template `new-message.ts` — Nouveau message
  - [x] 2.4 Template `alert-inactivity.ts` — Client inactif
  - [x] 2.5 Template `graduation.ts` — Graduation Lab→One
  - [x] 2.6 Template `payment-failed.ts` — Échec paiement

- [x] Task 3 — Edge Function d'envoi (AC: #1, #2, #4)
  - [x] 3.1 `supabase/functions/send-email/index.ts` — Edge Function recevant { recipientEmail, type, data }
  - [x] 3.2 Sélection du template selon le type
  - [x] 3.3 Envoi via Resend/Postmark
  - [x] 3.4 Retry logic (3 tentatives, 1s → 3s → 9s)
  - [x] 3.5 Log résultat dans `activity_logs`

- [x] Task 4 — Intégration avec système de notifications (AC: #4)
  - [x] 4.1 Créer un DB trigger ou Edge Function qui écoute les inserts sur `notifications`
  - [x] 4.2 Pour chaque nouvelle notification, vérifier les préférences email du destinataire
  - [x] 4.3 Si email autorisé → appeler send-email Edge Function
  - [x] 4.4 L'envoi email est asynchrone — ne bloque pas la notification in-app

- [x] Task 5 — Gestion erreurs (AC: #5)
  - [x] 5.1 Logger les échecs dans `activity_logs` avec contexte (destinataire, type, erreur)
  - [x] 5.2 Monitoring : si > 5 échecs en 1h, créer notification alert pour MiKL
  - [x] 5.3 Mode dégradé : notifications in-app fonctionnent toujours

- [x] Task 6 — Tests (AC: #6)
  - [x] 6.1 Tests templates email : rendu HTML correct, variables remplacées
  - [x] 6.2 Tests Edge Function : envoi mock, retry, gestion erreurs
  - [x] 6.3 Tests intégration : notification insérée → email déclenché
  - [x] 6.4 Tests résilience : service indisponible → in-app OK

- [x] Task 7 — Documentation (AC: #6)
  - [x] 7.1 Documenter la configuration du service email
  - [x] 7.2 Documenter les templates et comment en ajouter

## Dev Notes

### Architecture — Règles critiques

- **Edge Function** pour l'envoi email — PAS de Server Action (l'envoi est déclenché par un trigger, pas par l'utilisateur directement).
- **Asynchrone** : L'envoi email ne doit JAMAIS bloquer la création de la notification in-app.
- **Logging** : `[EMAIL:SEND]`, `[EMAIL:RETRY]`, `[EMAIL:FAILED]`

### Service email recommandé — Resend

Resend est le choix recommandé pour sa simplicité et son SDK TypeScript natif :
```typescript
import { Resend } from 'resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

await resend.emails.send({
  from: 'MonprojetPro <noreply@monprojet-pro.com>',
  to: recipientEmail,
  subject: title,
  html: renderedTemplate,
})
```

**Alternative** : Postmark (meilleure délivrabilité mais plus complexe).

### Template email — Structure

```typescript
// supabase/functions/_shared/email-templates/base.ts
export function baseTemplate(content: { title: string; body: string; ctaUrl?: string; ctaText?: string }): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
    <body style="font-family: 'Inter', sans-serif; background: #f4f4f5; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px;">
        <img src="https://monprojet-pro.com/logo.png" alt="MonprojetPro" style="height: 32px; margin-bottom: 24px;" />
        <h2 style="color: #0a0a0a; font-family: 'Poppins', sans-serif;">${content.title}</h2>
        <div style="color: #3f3f46; line-height: 1.6;">${content.body}</div>
        ${content.ctaUrl ? `<a href="${content.ctaUrl}" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: #059669; color: white; border-radius: 6px; text-decoration: none;">${content.ctaText || 'Voir sur MonprojetPro'}</a>` : ''}
        <hr style="margin-top: 32px; border: none; border-top: 1px solid #e4e4e7;" />
        <p style="font-size: 12px; color: #a1a1aa;">Vous recevez cet email car vous êtes inscrit sur MonprojetPro. <a href="{{unsubscribe_url}}">Se désabonner</a></p>
      </div>
    </body>
    </html>
  `
}
```

### Trigger envoi email

**Option 1 (recommandée)** : Database trigger Supabase qui appelle l'Edge Function via `pg_net` :
```sql
CREATE OR REPLACE FUNCTION notify_email_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.edge_function_url') || '/send-email',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := jsonb_build_object('notification_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_send_email_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_email_on_insert();
```

**Option 2** : L'Edge Function `send-email` est appelée directement par les Server Actions qui créent des notifications.

### Retry logic

```typescript
async function sendWithRetry(fn: () => Promise<void>, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await fn()
      return
    } catch (error) {
      if (attempt === maxRetries) throw error
      await new Promise(resolve => setTimeout(resolve, Math.pow(3, attempt) * 1000))
    }
  }
}
```

### Fichiers à créer

- `supabase/functions/_shared/email-client.ts`
- `supabase/functions/_shared/email-templates/base.ts`
- `supabase/functions/_shared/email-templates/validation.ts`
- `supabase/functions/_shared/email-templates/new-message.ts`
- `supabase/functions/_shared/email-templates/alert-inactivity.ts`
- `supabase/functions/_shared/email-templates/graduation.ts`
- `supabase/functions/_shared/email-templates/payment-failed.ts`
- `supabase/functions/send-email/index.ts`
- Tests co-localisés

### Dépendances

- **Story 3.2** : Table `notifications` et module notifications
- Service email externe (Resend ou Postmark) — API key requise
- `pg_net` extension Supabase pour triggers HTTP

### Anti-patterns — Interdit

- NE PAS envoyer l'email de manière synchrone dans les Server Actions (asynchrone via trigger ou Edge Function)
- NE PAS faire dépendre la notification in-app du succès de l'email
- NE PAS hardcoder les adresses email dans le code
- NE PAS envoyer d'emails sans vérifier les préférences (Story 3.4)

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-3-*.md#Story 3.3]
- [Source: docs/project-context.md]

## Senior Developer Review (AI)

### Review Model
claude-opus-4-6 (adversarial code review)

### Issues Found: 10 (1 Critical, 4 High, 3 Medium, 2 Low)

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | **CRITICAL** | `activity_logs` schema mismatch — handler used `operator_id`, `details` (non-existent columns), missing `actor_type` (NOT NULL) | Fixed: `actor_type: 'system'`, `actor_id`, `metadata` |
| 2 | **HIGH** | Recipient query by `id` instead of `auth_user_id` — `recipient_id` = `auth.uid()` ≠ `clients.id` | Fixed: `.eq('auth_user_id', notif.recipient_id)` |
| 3 | **HIGH** | Task 5.2 monitoring not implemented — only index existed, no failure counting logic | Fixed: Added `checkEmailFailureThreshold()` — counts failures in last 1h, alerts admins if > 5 |
| 4 | **HIGH** | Retry backoff off-by-one — `Math.pow(3, attempt)` gave 3s→9s instead of spec 1s→3s→9s | Fixed: `Math.pow(3, attempt - 1)` → 1s→3s→9s |
| 5 | **HIGH** | XSS in templates — direct user content interpolation in HTML | Fixed: Added `escapeHtml()` function, applied to all user-supplied fields |
| 6 | MEDIUM | Hardcoded 'MiKL' sender in new-message template | Fixed: Extract sender name from notification title via regex |
| 7 | MEDIUM | Placeholder data for inactivity days/dates and payment amounts | Fixed: Extract real values from `notification.body` via regex |
| 8 | MEDIUM | `supabase/.gitignore` not tracked in File List | Fixed: Added to File List |
| 9 | LOW | Hardcoded platform URLs (`hub.monprojet-pro.com`, `lab.monprojet-pro.com`) | Accepted: URLs stable per deployment model, no config needed |
| 10 | LOW | Logo URL `monprojet-pro.com` → `monprojetpro.biz` | Fixed: Updated to `monprojetpro.biz/logo.png` |

### Verdict
**PASS** — All CRITICAL and HIGH issues fixed. All 34 Edge Function tests pass. Full suite: 1280/1280.

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

- Correction test `base.test.ts` — le lien désabonnement contient `<a href=`, test reformulé pour vérifier absence de style `inline-block` (CTA button)
- Correction test `payment-failed.test.ts` — ajout du mot `échec` (minuscules) dans le body du template client
- Correction test `email-client.test.ts` — gestion propre de l'unhandled rejection sur le test retry avec fake timers
- **Code Review** : 10 issues corrigés (1 CRITICAL, 4 HIGH, 3 MEDIUM, 2 LOW) — voir section "Senior Developer Review (AI)" ci-dessus

### Completion Notes List

- **Task 1** : Service Resend choisi. `email-client.ts` utilise `fetch` natif (Deno + Node compatible) sans dépendance SDK Resend → testable directement en Vitest. Factory `createEmailClient()` pour injection de config. Retry exponentiel : 3s → 9s.
- **Task 2** : 6 templates HTML responsive (base + 5 spécialisés). Tous en TypeScript pur, sans imports Deno, testables en Vitest. Template `newMessage` tronque les previews > 200 chars.
- **Task 3** : `handler.ts` extrait la logique métier de `index.ts` pour testabilité. `index.ts` est un thin wrapper Deno. Route: POST `{ notificationId }` → fetch notification → fetch recipient → check preferences → render template → send via Resend.
- **Task 4** : Migration `00024_email_notifications.sql` : colonnes `email_notifications_enabled` (default true) sur `clients` et `operators`. Trigger `trg_send_email_on_notification` via `pg_net` (asynchrone, fail-silent). Config via `app.settings.edge_function_url` et `app.settings.service_role_key`.
- **Task 5** : Mode dégradé : tout échec email loggé dans `activity_logs` avec `action='email_failed'`. Index `idx_activity_logs_email_failed` pour monitoring. La notification in-app n'est jamais bloquée.
- **Task 6** : 33 tests (9 fichiers). Couverture : email-client (6 tests), templates (18 tests : 7+3+3+2+3), handler (4 tests), résilience (2 tests).
- **Task 7** : `README.md` dans `supabase/functions/send-email/` avec guide de configuration, types d'email, ajout template, mode dégradé.

### File List

- `supabase/functions/_shared/email-client.ts` — NEW
- `supabase/functions/_shared/email-client.test.ts` — NEW
- `supabase/functions/_shared/email-templates/base.ts` — NEW
- `supabase/functions/_shared/email-templates/base.test.ts` — NEW
- `supabase/functions/_shared/email-templates/validation.ts` — NEW
- `supabase/functions/_shared/email-templates/validation.test.ts` — NEW
- `supabase/functions/_shared/email-templates/new-message.ts` — NEW
- `supabase/functions/_shared/email-templates/new-message.test.ts` — NEW
- `supabase/functions/_shared/email-templates/alert-inactivity.ts` — NEW
- `supabase/functions/_shared/email-templates/alert-inactivity.test.ts` — NEW
- `supabase/functions/_shared/email-templates/graduation.ts` — NEW
- `supabase/functions/_shared/email-templates/graduation.test.ts` — NEW
- `supabase/functions/_shared/email-templates/payment-failed.ts` — NEW
- `supabase/functions/_shared/email-templates/payment-failed.test.ts` — NEW
- `supabase/functions/send-email/index.ts` — NEW
- `supabase/functions/send-email/handler.ts` — NEW
- `supabase/functions/send-email/handler.test.ts` — NEW
- `supabase/functions/send-email/resilience.test.ts` — NEW
- `supabase/functions/send-email/README.md` — NEW
- `supabase/migrations/00024_email_notifications.sql` — NEW
- `supabase/.gitignore` — MODIFIED (added functions/.env)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED (status in-progress → done)
- `_bmad-output/implementation-artifacts/3-3-notifications-email-transactionnelles.md` — MODIFIED
