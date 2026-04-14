# Cal.com — Setup et configuration

## Prérequis

- Docker et Docker Compose installés
- Accès réseau pour le port 3001

## Lancement local

```bash
cd docker/calcom
docker compose up -d
```

Cal.com sera accessible sur `http://localhost:3001`.

## Configuration Cal.com

### 1. Créer le calendrier MiKL

1. Se connecter à Cal.com (`http://localhost:3001`)
2. Créer un compte administrateur
3. Créer un event type "Consultation" (slug: `consultation`)
4. URL résultante : `http://localhost:3001/mikl/consultation`

### 2. Configurer le webhook

1. Aller dans Settings > Developer > Webhooks
2. Ajouter un webhook :
   - **URL** : `{SUPABASE_URL}/functions/v1/calcom-webhook`
   - **Event** : `BOOKING_CREATED`
   - **Secret** : Générer un secret et le stocker dans `CALCOM_WEBHOOK_SECRET`

### 3. Champs personnalisés (metadata)

Ajouter des champs cachés à l'event type :
- `clientId` (hidden, pré-rempli par l'iframe)
- `operatorId` (hidden, pré-rempli par l'iframe)

Ces champs sont passés automatiquement via les query params de l'iframe.

## Variables d'environnement

```env
# .env (apps/client)
NEXT_PUBLIC_CALCOM_URL=http://localhost:3001/mikl/consultation

# Supabase Edge Function secrets
CALCOM_WEBHOOK_SECRET=your-webhook-secret

# Docker (docker/calcom/.env)
CALCOM_NEXTAUTH_SECRET=your-nextauth-secret
CALCOM_ENCRYPTION_KEY=your-encryption-key
```

## Production

En production, Cal.com est déployé sur un VPS Docker :
- URL : `https://cal.monprojet-pro.com`
- Webhook : `https://{project-ref}.supabase.co/functions/v1/calcom-webhook`
- Secrets gérés via Supabase Dashboard > Edge Functions > Secrets

## Flux de données

```
Client iframe → Cal.com → BOOKING_CREATED webhook → calcom-webhook Edge Function
  → Create meeting (meetings table)
  → Create meeting_request (accepted, meeting_requests table)
  → Notify client (notifications table)
```
