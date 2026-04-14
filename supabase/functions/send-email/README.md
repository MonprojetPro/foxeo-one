# Edge Function: send-email

**Story 3.3 — Notifications email transactionnelles**

## Rôle

Envoie un email transactionnel lors de l'insertion d'une nouvelle notification dans la table `notifications`. Appel asynchrone via trigger DB (`pg_net`) — **ne bloque jamais** la création de la notification in-app.

## Variables d'environnement requises

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | URL du projet Supabase (auto-injecté) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (auto-injectée) |
| `RESEND_API_KEY` | Clé API Resend — https://resend.com/api-keys |
| `EMAIL_FROM` | Adresse expéditeur — `MonprojetPro <noreply@monprojet-pro.com>` (défaut) |

### Configuration dans Supabase Dashboard

```
Supabase → Edge Functions → send-email → Secrets
```

### Configuration Trigger (une fois après migration)

```sql
-- À exécuter dans Supabase SQL Editor
ALTER DATABASE postgres SET app.settings.edge_function_url = 'https://<project>.supabase.co/functions/v1';
ALTER DATABASE postgres SET app.settings.service_role_key = '<service_role_key>';
```

## Architecture

```
notifications INSERT
  ↓ (trigger: trg_send_email_on_notification)
pg_net.http_post → send-email Edge Function
  ↓
handler.ts → vérifie préférences email
  ↓ (si activé)
email-client.ts → Resend API (3 tentatives)
  ↓
activity_logs (email_sent | email_failed)
```

## Types d'email supportés

| Type de notification | Sujet email | Destinataire |
|---------------------|-------------|--------------|
| `message` | "Nouveau message de {sender}" | client / operator |
| `validation` | "Votre brief a été validé/refusé" | client |
| `inactivity_alert` / `alert` | "Client inactif : {nom}" | operator (MiKL) |
| `graduation` | "Félicitations ! Votre espace One est prêt" | client |
| `payment` | "Échec de paiement" | client + operator |

## Ajouter un nouveau template

1. Créer `supabase/functions/_shared/email-templates/mon-template.ts`
2. Exporter une fonction `monTemplateEmailTemplate(data: MonData): string`
3. Importer dans `supabase/functions/send-email/handler.ts`
4. Ajouter un `case` dans le `switch (notification.type)`

## Préférences email

- Colonne `email_notifications_enabled` sur tables `clients` et `operators` (défaut: `true`)
- Story 3.4 ajoute l'interface UI pour modifier cette préférence

## Mode dégradé

Si Resend est indisponible :
- L'envoi email échoue silencieusement
- La notification in-app reste fonctionnelle (non bloquée)
- L'échec est loggé dans `activity_logs` avec `action = 'email_failed'`
- Monitoring : requête `activity_logs WHERE action = 'email_failed'` pour alertes MiKL
