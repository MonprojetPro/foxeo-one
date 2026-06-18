# Rapport QA — Agents d'accompagnement Élio (Lab MonprojetPro)

*Campagne du 2026-06-18 — 11 agents testés par un client simulé piégeur (Sophie, crème cosmétique artisanale), 8 échanges chacun, via la vraie chaîne de prod (prompts réels + garde-fous coach). Jury : 11 juges Sonnet + synthèse.*

## 1. Verdict global

**Les agents sont corrects mais pas encore au niveau « coach qui pousse vraiment la réflexion ».** Aucun n'est mauvais, aucun n'est « très bon » sur toute la ligne.

- ✅ **Deux acquis solides partout** : (1) **aucun forçage** vers « Générer mon document » — le fix de comportement tient ; (2) **fidélité aux faits** quasi parfaite (5/5 partout) — Élio ne déforme ni n'invente les chiffres du client.
- ⚠️ **Un défaut dominant, présent sur presque tous** : l'agent **range les idées du client « pour plus tard / une prochaine étape »… et n'y revient jamais** (axe *exploration* à 2-3/5). C'est l'inverse du coach : on étouffe les pistes pour garder le contrôle du déroulé.
- ⚠️ **Validation trop accommodante** : plusieurs agents rassurent au lieu de challenger (axe *posture coach* à 3-4/5).

## 2. Classement des 11 agents

| Agent | Verdict | Note moy. /5 | En une phrase |
|-------|---------|--------------|---------------|
| **Élio Legit** | 🟢 bon | 4,5 | Le meilleur : signale la réglementation cosmétique spontanément, refuse d'inventer, ne perd jamais le fil. |
| **Élio Offre** | 🟢 bon | 4,3 | Progression pédagogique rigoureuse, beau challenge sur « ça convient à tout le monde ». |
| **Élio Cible** | 🟠 moyen | 4,2 | Restitution verbatim exemplaire + challenge tactful, mais escamote la question de viabilité du marché. |
| **Élio Récap** | 🟠 moyen | 3,8 | Bon sur le fond, mais se contredit sur son rôle et repose une question déjà tranchée. |
| **Élio Business** | 🟠 moyen | 3,8* | Continuité de contexte exemplaire, MAIS ne challenge pas un départ de CDI + oublie le calcul de viabilité. |
| **Élio Marché** | 🟠 moyen | 3,7 | Fidèle et sans forçage, mais met les canaux du client en file d'attente sans jamais les rouvrir. |
| **Élio Identité** | 🟠 moyen | ~3,7 | Correct, mais exploration tronquée (idées rangées sans suite). |
| **Élio Go-to-Market** | 🟠 moyen | 3,5 | Fidélité parfaite, mais valide une cible trop large et balaie des questions liées à son propre conseil. |
| **Élio Contenu** | 🟠 moyen | 3,5 | Fluide et bien mémorisé, mais trop accommodant et un seul pilier éditorial esquissé en 8 tours. |
| **Élio Positionnement** | 🟠 moyen | ~3,4 | Correct, exploration faible (2/5). |
| **Élio Vision** | 🟠 moyen | ~3,3 | Posture coach et exploration les plus faibles (3 et 2/5). |

\* Business : moyenne arithmétique 3,8 mais 2 défauts **majeurs** → fonctionnellement au niveau « moyen faible ».

## 3. Défaut transverse n°1 — « On y reviendra plus tard »… jamais (exploration tronquée)

C'est LE point à corriger. L'agent reçoit une idée concrète du client, la complimente, la range « pour la suite » — et ne la rouvre jamais. Citations réelles :

- **Cible** (majeur) — viabilité du marché soulevée par Sophie, repoussée :
  > « C'est une question légitime, mais c'est quelque chose qu'on creusera dans une prochaine étape. […] On continue ? » → jamais rouvert.
- **Contenu** (majeur) — échantillons gratuits balayés :
  > « Les échantillons, c'est une bonne intuition commerciale — mais c'est plus une décision business que de contenu. On peut y revenir séparément si tu veux. » (alors que les échantillons = du contenu : UGC, avis, preuve sociale).
- **Marché** (majeur) — canaux du client mis en attente :
  > « Marché local, boutiques bio, Instagram […] On va y revenir dans une prochaine étape. » → jamais rouvert.
- **Go-to-Market** (majeur) — balaie échantillons/prix qu'il venait lui-même d'introduire.

**Cause** : les garde-fous coach (ajoutés aujourd'hui) interdisent de *conclure* prématurément, mais pas explicitement de *différer une idée à « plus tard »*. Et plusieurs personas contiennent encore des formules de mise en attente (« on creusera séparément », « on les utilisera pour la suite »). Le modèle les imite.

## 4. Défaut transverse n°2 — Validation sans challenge (béni-oui-oui partiel)

- **Business** (majeur) — quitter un CDI validé émotionnellement, sans une question sur l'épargne de sécurité ni le délai avant premiers revenus :
  > « C'est courageux de le dire clairement — et c'est exactement ce qu'il faut poser dès le départ. »
- **Go-to-Market** (majeur) — cible « 25-50 ans peau sensible » (beaucoup trop large) validée comme « une vraie direction ».
- **Contenu / Vision** — rassurent le client (« tout va bien, on élargira plus tard ») au lieu de le pousser à trancher.

## 5. Défaut transverse n°3 — Le calcul/objectif central parfois jamais posé

- **Business** (majeur) — objectif « 2000 €/mois » posé tour 2, tous les coûts connus tour 6, mais **jamais** « combien de pots vendre par mois ? ». La session se termine sans répondre à *« est-ce viable ? »*.

## 6. Défauts mineurs

- **Menu de démarrage rituel** (Cible, Legit, Go-to-Market) : « tu préfères 1, 2 ou 3 ? » alors que le client a déjà dit vouloir être guidé → friction.
- **Récap** : incohérence sur son propre rôle + repose une question déjà tranchée.

## 7. Bug technique trouvé (corrigé)

5 fichiers source `.md` (Cible, Contenu, Positionnement, Vision = 1.1 ; Identité = 1.2) avaient une **température > 1.0**, refusée par l'API Claude. **Prod non touchée** (base à ≤ 1.0). Harnais clampé ; fichiers `.md` à corriger pour éliminer le footgun (si resync `.md`→base sans clamp).

## 8. Recommandations priorisées (Impact / Effort)

| # | Reco | Impact | Effort | Cible |
|---|------|--------|--------|-------|
| 1 | **Garde-fou anti-report** : interdire explicitement de différer une idée du client à « plus tard / prochaine étape » — si ça touche à l'étape, on la traite MAINTENANT ; sinon, on l'intègre en 1 phrase. | 🔴 Fort | Faible | `step-elio-chat.tsx` (tous agents) |
| 2 | **Renforcer le mandat de challenge** : sur une décision risquée/floue (quitter un CDI, cible trop large), creuser au moins une fois avant de valider. | 🔴 Fort | Faible | garde-fous + personas |
| 3 | **Scrubber les personas** des formules de mise en attente (« on creusera séparément », « pour la suite »). | 🟠 Moyen | Moyen | 11 fichiers `.md` |
| 4 | **Imposer la synthèse chiffrée** quand l'étape a un objectif quantifié (Business : « combien vendre pour atteindre X ? »). | 🟠 Moyen | Faible | persona Business (+ Marché) |
| 5 | **Alléger le menu de démarrage** quand le client a déjà exprimé une préférence. | 🟡 Faible | Faible | personas concernées |
| 6 | Corriger les 5 températures `.md` à ≤ 1.0 (footgun). | 🟡 Faible | Faible | 5 `.md` |

**Conclusion** : un seul correctif (reco #1, le garde-fou anti-report) réglerait le défaut le plus visible sur presque tous les agents, pour un effort faible.
