# Impact Assessment — Passage Instance Par Client (08/02/2026)

> **Changement architectural majeur** : MonprojetPro One passe d'un modele multi-tenant a une instance dediee par client (Vercel + Supabase propre). Le Lab reste multi-tenant. Le Hub reste instance unique. 16 nouveaux FRs (FR153-168).

## Epics impactes

| Epic | Impact | Detail |
|------|--------|--------|
| **Epic 1** | MODERE | Story 1.1 doit mentionner le dual deployment model (client/ = template Lab + One) |
| **Epic 9** | ELEVE | Graduation = provisioning nouvelle instance. Stories 9.1, 9.2, 9.5 a adapter |
| **Epic 10** | MODERE | Module activation One = redeploy instance. Notes a ajouter |
| **Epic 12** | ELEVE | Nouvelles stories : provisioning, monitoring instances, documentation check. Stories 12.1, 12.4 a adapter |

## Nouveaux FRs mappes

| FR | Epic | Description |
|----|------|-------------|
| FR153 | Epic 12 (Story 12.6) | Instance deployee dediee par client One |
| FR154 | Epic 10 | Client One proprietaire code + donnees |
| FR155 | Epic 1 | Communication Hub↔One via API REST + HMAC |
| FR156 | Epic 12 (Story 12.6) | Provisioning instance One via Hub |
| FR157 | Epic 9 (Story 9.5) | Client quitte One = export code + DB + docs |
| FR158 | Epic 12 (Story 12.8) | Documentation obligatoire par module (guide, FAQ, flows) |
| FR159 | Epic 12 (Story 12.8) | Documentation accessible via module documents |
| FR160 | Epic 12 (Story 12.8) | Documentation alimente Elio One |
| FR161 | Epic 9 + 12 (Stories 9.5, 12.8) | Documentation incluse dans export client |
| FR162 | Epic 12 (Story 12.7) | Surveillance usage ressources par instance |
| FR163 | Epic 12 (Story 12.7) | Alertes seuils capacite (60/80/95%) |
| FR164 | Epic 12 (Story 12.7) | Tableau de bord sante instances |
| FR165 | Epic 12 (Story 12.7) | Initier upgrade tier instance |
| FR166 | Epic 9 (Story 9.1) | Graduation provisionne instance dediee |
| FR167 | Epic 9 (Story 9.1) | Graduation migre donnees Lab vers instance One |
| FR168 | Epic 9 (Story 9.5) | Lab = propriete MonprojetPro, client recupere documents |

## Notes d'impact par story existante

- **Story 9.1** : Ajouter etape provisioning (Supabase + Vercel) avant migration des donnees. Le `dashboard_type` routing devient URL d'instance.
- **Story 9.2** : Le client est redirige vers `{slug}.monprojet-pro.com` au lieu de `app.monprojet-pro.com`. Les conversations Elio sont migrees vers l'instance dediee.
- **Story 9.5** : Simplifie pour One — suppression directe de l'instance (pas d'anonymisation dans une DB partagee). Lab : anonymisation classique dans DB partagee.
- **Story 12.1** : Les logs d'activite sont locaux a chaque instance. Le Hub aggrege via API. Mode maintenance = notification a toutes les instances.
- **Story 12.4** : Analytics Hub doit collecter des metriques depuis chaque instance One via API health check.
- **Story 12.5** : Ajouter monitoring usage (DB rows, storage, bandwidth) par instance avec seuils d'alerte.
