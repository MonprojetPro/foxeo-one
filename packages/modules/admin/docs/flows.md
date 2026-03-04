# Module Admin — Flows

## Flux : Provisioning Instance One

```
MiKL confirme graduation
    ↓
graduateClient() [CRM action]
    ↓
provisionOneInstance() [Admin util — stub MVP]
    ├── Générer slug (kebab-case depuis company)
    ├── INSERT client_instances (status: 'active')  ← MVP: actif immédiatement
    └── Retourner { instanceId, instanceUrl, slug }
    ↓
[Story 12.6] Implémentation réelle :
    ├── Créer Supabase project via Management API
    ├── Lancer migrations DB
    ├── Déployer sur Vercel
    └── Health check → status: 'active'
```
