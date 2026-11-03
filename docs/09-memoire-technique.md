# Mémoire technique de chantier — MonprojetPro (foxeo-one)

> Mémoire technique **fine**, projet par projet : patterns de code découverts, pièges
> d'implémentation précis, raisons d'un choix d'architecture local.
> Différent de `08-lessons-learned.md` (ATLAS, leçons **métier** : fausses pistes, décisions
> stratégiques) — ici c'est le détail technique qui ne mérite pas une ligne au board mais qui
> coûte cher à redécouvrir. Différent aussi de `02-architecture.md` (décisions d'architecture
> structurantes, globales au projet).

---

## Comment l'alimenter

Écrit par Claude Code lui-même, en fin de story ou de patch, quand l'une de ces conditions est
vraie :

- un bug a demandé **plus d'un essai** (donc passé par TILT) → noter la cause racine, pas
  seulement le fix
- un pattern de code a été découvert ou confirmé réutilisable sur ce projet précis
- un choix d'implémentation local a été tranché sans que ce soit assez structurant pour
  `02-architecture.md`

**Ne pas y mettre** : ce qui est déjà couvert par `08-lessons-learned.md` (métier), par
`02-architecture.md` (archi structurante) ou par le catalogue des modules (code réutilisable
entre projets — ça, c'est pour FORGE).

---

## Entrées

| Date | Contexte (fichier / feature) | Pattern ou piège rencontré | Décision prise | Référence (commit) |
|---|---|---|---|---|
| 2026-10-28 | `packages/modules/chat/hooks/use-chat-presence.ts` — présence sur canal PRIVÉ (T-064) | realtime-js 2.95.3 met `socket.accessTokenValue` dans le payload de jonction : sans `await supabase.realtime.setAuth()` AVANT `subscribe`, la jonction part avec la clé anon et la policy la refuse (le client paraît hors ligne, sans erreur visible). | `setAuth()` attendu avant toute jonction ; un échec de `setAuth` n'empêche pas la tentative (la policy tranche) ; `CHANNEL_ERROR` signalé une fois par sujet. Testé (ordre d'appel vérifié). | 127454a (T-064) |
| 2026-10-28 | `supabase/migrations/20261028090000_realtime_presence_private_channels.sql` | Realtime ≤ v2.76.0 n'ouvre un canal privé que si la lecture `broadcast` est accordée (`realtime_channel.ex`, `maybe_assign_policies`, l.799) ; une policy SELECT limitée à `extension = 'presence'` fait refuser la jonction (« You do not have permissions to read from this Channel topic »). La v2.149.1 accepte broadcast OU presence. | Lecture `extension IN ('broadcast','presence')`, écriture `presence` seule : marche sur toutes les versions, mêmes lecteurs. Trouvé par le test d'intégration, pas par les tests unitaires (mocks). | 127454a (T-064) |
| 2026-10-28 | Policies `realtime.messages` (T-064) | L'autorisation Realtime porte sur le SUJET (`realtime.topic()`) et l'extension, jamais sur une clé de présence : tout abonné d'un sujet voit toutes ses présences. | Un sujet par titulaire (`presence:client:{id}`, `presence:operator:{id}`), identité déduite du sujet côté client, jamais du contenu publié. | 127454a (T-064) |
| 2026-10-28 | Supabase local — `tests/rls/realtime-presence-isolation.test.ts` | CLI 2.76.7 : la clé service (`SERVICE_ROLE_KEY` comme `sb_secret`) est signée HS256, alors que l'auth locale (gotrue v2.188.1) n'a qu'une clé ES256 dans `GOTRUE_JWT_KEYS` → API admin auth refusée (`bad_jwt`, « signing method HS256 is invalid ») ; l'API REST accepte la même clé. | Comptes de test créés par inscription normale (`signUp`, confirmation auto en local), repli sur `signInWithPassword` s'ils existent ; données via REST avec la clé service. Les comptes ne peuvent pas être supprimés en local (sans droits sans leurs lignes). | 127454a (T-064) |
| 2026-10-28 | Supabase local — `supabase start` sur base neuve | Deux paires de migrations au même numéro (`00136_*`, `00137_*`) : clé en double dans `schema_migrations`, la base neuve ne se construit pas. | Contourné par une copie temporaire de `supabase/` renumérotée (hors dépôt) passée en `--workdir`. Correction du dépôt : T-065. | T-065 |
| 2026-11-03 | `packages/modules/parcours/actions/generate-and-submit-step.ts` — bouton « Générer mon document » (T-069) | Le document d'étape ne recevait ni la structure du livrable de l'agent (seulement son nom + sa description) ni la fin de la conversation : `.order('created_at', { ascending: true }).limit(30)` garde les 30 PREMIERS messages, la synthèse finale d'un long échange était perdue. Enrichir la section « Le livrable » d'un agent n'avait donc aucun effet sur le document. | Section « ## Le livrable » extraite du prompt (`utils/extract-deliverable-section.ts`) et imposée ; rubrique vide = « [non traité dans la conversation] » ; tri descendant + `limit(80)` puis remise dans l'ordre. Tout changement de livrable d'un agent passe donc par CE fichier. | 21f7c7f (T-069) |
| 2026-11-03 | `packages/modules/parcours/actions/get-parcours-memory.ts` | Chaque document validé est tronqué (`MAX_CHARS_PER_STEP`) avant d'être injecté aux agents suivants : un livrable plus riche perd sa fin (ex. point mort, tests de résistance) chez Récap / Business Plan. | Plafond porté à 4000. À remonter si un livrable dépasse : relire la taille réelle des `step_submissions` approuvées avant de toucher aux prompts. | 21f7c7f (T-069) |
| 2026-11-03 | Édition des agents Élio Lab | Les prompts sont lus en base (`elio_lab_agents`), pas dans les `.md`. Avant d'écrire en base, comparer `md5(system_prompt)` aux fichiers d'origine (le stockage ajoute un `\n` final) pour ne pas écraser une modif faite dans le Hub ; après, recomparer les 12 empreintes. Tester AVANT avec `node scripts/elio-qa/run.mjs <slugs>` (lit les fichiers locaux, appelle le vrai `elio-chat`). | Procédure suivie pour T-069 : 12/12 empreintes identiques avant et après. | 21f7c7f (T-069) |
| 2026-10-28 | Poste Windows — Docker Desktop 4.63, Windows 11 25H2 (build 26200) | Après un arrêt brutal, les sockets AF_UNIX de `%LOCALAPPDATA%\Docker\run` et `%LOCALAPPDATA%\docker-secrets-engine` ne peuvent plus être supprimés (erreur 1920) : Docker Desktop plante au démarrage (« remove ...dockerInference: Le système ne peut pas accéder au fichier »). | Renommer les deux dossiers (ex. `run.bloque2-2026-10-28`) puis relancer Docker : démarrage en 35 s. Reviendra après chaque arrêt brutal. | — |

---

## Règles

- **Une ligne, pas un roman.** Si ça dépasse 3 phrases, c'est probablement une leçon ATLAS ou
  une décision d'archi, pas une entrée ici — se reposer la question avant d'écrire.
- **Vérifier par la preuve avant d'écrire** : citer le fichier et si possible le commit, jamais
  « je me souviens que ».
- **Relu avant de retoucher un fichier déjà référencé ici** — c'est tout l'intérêt : ne pas
  redécouvrir le même piège à la session suivante.
- **ATLAS vérifie la cohérence** avec les leçons métier au moment où il écrit les siennes — pas
  de duplication entre les deux fichiers.

---

*Créé le 2026-10-28 depuis le template MPP (`installation WF base/templates-projet/docs/09-memoire-technique.md`).
Gardien : Claude Code (écriture), ATLAS (cohérence avec les leçons métier).*
