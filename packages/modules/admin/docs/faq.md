# Module Admin — FAQ

## Q: Pourquoi le provisioning est-il un stub ?

Le provisioning complet (création Supabase project, migrations, déploiement Vercel, health check) est complexe et fait l'objet de la Story 12.6. Le stub MVP permet de valider le flux graduation de bout en bout sans bloquer l'Epic 9.

## Q: Que fait `provisionOneInstance` en MVP ?

Il crée une entrée dans `client_instances` avec status='active' et une URL simulée `{slug}.foxeo.io`. Aucune infrastructure réelle n'est créée.
