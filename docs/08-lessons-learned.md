# Foxeo One — Registre des Lecons Apprises (ATLAS)

> Maintenu par ATLAS "l'Historien" — Ne jamais supprimer d'entrees, marquer OBSOLETE si necessaire.
> Chaque entree documente un probleme reel qui a fait perdre du temps.

---

## Index par categorie

| Code | Categorie | Nb lecons |
|------|-----------|-----------|
| CFG | Configuration | 1 |

---

## Lecons

### [CFG-001] Supabase Edge Function echoue depuis Next.js mais marche depuis le dashboard
- **Date** : 2026-03-25
- **Projet** : Foxeo One
- **Phase** : Integration Elio Hub (Edge Function elio-chat)
- **Categorie** : Configuration (CFG)
- **Symptome** : L'appel a la Edge Function `elio-chat` via `supabase.functions.invoke()` depuis le Hub Next.js retournait une erreur. Aucun log visible cote Edge Function. La fonction testee directement depuis le dashboard Supabase fonctionnait parfaitement.
- **Cause racine** : Supabase Edge Functions ont `verify_jwt = true` par defaut. L'appel depuis Next.js via `supabase.functions.invoke()` n'envoyait pas de JWT valide, causant un rejet d'authentification silencieux avant meme que le code de la fonction ne s'execute.
- **Fausses pistes** :
  1. **FAUSSE PISTE — API key Anthropic** : On a d'abord soupconne que l'ANTHROPIC_API_KEY n'etait pas configuree dans les secrets Supabase. Verification faite : la cle etait bien presente. Ca n'a PAS marche parce que le probleme etait en amont de l'execution de la fonction.
  2. **FAUSSE PISTE — Probleme cote client Next.js** : On a ensuite soupconne un probleme dans le code `send-to-elio.ts` (mauvais URL, mauvais params). L'amelioration des messages d'erreur a montre que l'erreur venait bien de l'invocation elle-meme, pas du code client.
  3. **FAUSSE PISTE — Logs vides** : Les logs Supabase etaient vides, ce qui suggerait que la fonction ne s'executait pas du tout — indice cle que le probleme etait au niveau auth/gateway, pas dans le code.
- **Solution validee** : Creer un fichier `supabase/functions/elio-chat/config.toml` avec `verify_jwt = false`, puis redeployer avec `npx supabase functions deploy elio-chat --project-ref <ref> --no-verify-jwt`.
- **Temps perdu** : ~2 sessions de debug (~1h30 cumule)
- **Prevention** :
  - Pour toute nouvelle Edge Function, toujours se poser la question : "le client qui appelle envoie-t-il un JWT valide ?"
  - Si la fonction est appelee par un Server Action (pas par le browser directement), considerer `verify_jwt = false` d'emblee
  - Si les logs Edge Function sont vides, c'est un indice fort que la requete est rejetee AVANT l'execution (auth gateway)
  - Toujours tester une Edge Function depuis le dashboard ET depuis l'app pour detecter les differences d'authentification
- **Agents impliques** : SPARK (dev), ATLAS (documentation)
