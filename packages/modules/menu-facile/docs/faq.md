# MenuFacile — FAQ

### Le Hub se connecte-t-il à la base de MenuFacile ?
Non, jamais. MenuFacile a sa propre base Supabase. Le Hub passe **exclusivement**
par le guichet `admin-api` (HTTP + secret Bearer).

### Où est stocké le secret ?
Dans les variables d'environnement du Hub (`MENUFACILE_ADMIN_API_SECRET`), lues
uniquement côté serveur. Il n'est **jamais** exposé au navigateur (pas de préfixe
`NEXT_PUBLIC_`) et le helper est verrouillé par `import 'server-only'`.

### Que se passe-t-il si le guichet est injoignable ?
Les Server Actions renvoient `{ data: null, error }` (jamais d'exception non gérée).
L'UI affiche un message d'erreur clair avec un bouton « Réessayer ».

### Pourquoi un `MetricCard` local plutôt que celui d'Analytics ?
Règle d'architecture : un module ne peut pas importer un autre module directement.
Chaque module embarque ses propres composants.

### Ce module connaît-il MenuFacile « en dur » ?
Non. L'URL et le secret vivent dans la config (`.env`), pas dans le code. Le même
module pourrait piloter un autre produit exposant le même contrat d'API.
