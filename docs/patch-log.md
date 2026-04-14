# MonprojetPro — Patch Log

> Maintenu par ATLAS (Patch Mode) — 1 ligne par correction/patch/fix appliqué en session.
> Colonne "Capitalisé" : Oui si la leçon a été enregistrée dans `08-lessons-learned.md`, Non si fix trivial.

| Date | Fix/Patch | Fichiers | Leçon | Capitalisé |
|------|-----------|----------|-------|------------|
| 2026-04-14 | **Incident Vercel — rebrand non committé** : Déploiements en fail depuis 2 jours à cause de 1172 fichiers modifiés localement (rebrand `foxeo → monprojetpro` + WIP) jamais committés dans Git. Causait un désalignement entre les imports `@monprojetpro/*` des commits récents et les packages toujours nommés `@foxeo/*` dans Git. Résolu par gros commit `chore: rebrand + sync WIP` (1190 fichiers, +12422 / -3502) + reconfiguration complète Vercel (suppression ancien projet `foxeo-one`, création de `monprojetpro-hub` et `monprojetpro-client` avec Root Directory appropriés, push des env vars via API REST sans exposer les valeurs, force deploy via `/v13/deployments` avec repoId). **Hub + Client READY en ~5 min après le commit correctif.** | 1190 fichiers (+ créations projets Vercel + archive repo `foxeo-appli-brief`) | 8 leçons regroupées sous DEP-001, GIT-001, DEP-002, DEP-003, SEC-001, CFG-002 | Oui → lessons-learned |
