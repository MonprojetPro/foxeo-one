# User Journeys

> **Mise à jour 2026-04-14 — Parcours client unifié** : Le flow commercial et technique d'onboarding a été unifié et formalisé dans `../onboarding-flow-unifie.md` (ADR-01 Révision 2 + Stories Epic 13). Les journeys ci-dessous restent valables pour illustrer l'usage produit, mais les sections qui décrivent la segmentation `complet / direct_one / ponctuel` ou l'attribution de parcours Lab par Orpheus doivent être lues à la lumière du document unifié : le parcours Lab est désormais proposé librement par MiKL en sortie de visio découverte, et les 3 types de clients sont devenus des étiquettes informationnelles historiques.

## Parcours client unifié (2026-04-14)

Pour le flow complet prospect → devis → paiement → création compte → usage → sortie, se référer à `../onboarding-flow-unifie.md`. Ce document couvre :

- Les 3 entrées prospect (webhook site, webhook Cal.com, manuel Hub).
- Les 3 chemins commerciaux (Lab 199€, One direct 30%+70%, Ponctuel 30%+70%).
- Le tunnel automatique paiement Pennylane → création de compte (Story 13.4).
- L'impersonation MiKL pour support/debug (Story 13.3).
- Les 2 kits de sortie différenciés (Lab Story 13.2 / One Story 13.1 + 1 mois support).

Les journeys ci-dessous (Sandrine, MiKL, Thomas, Edge Case paiement) restent des références UX pertinentes pour la conception produit et l'implémentation des modules.

---

## Journey 1 : Sandrine, Assistante de Direction (MVP - Happy Path)

**Qui est-elle ?**
Sandrine, 45 ans, seule salariée d'une association. Elle jongle entre 8 outils différents, son WordPress date de 2018, et elle passe ses journées à copier-coller des données d'un tableur à l'autre. Elle rêve d'un endroit unique où tout est centralisé.

**Sa journée avec MonprojetPro One :**

> **8h30** — Sandrine ouvre son dashboard. Le tableau de bord lui affiche immédiatement : *"3 inscriptions cette nuit pour la formation du 15 mars. 1 paiement en attente de confirmation."*
>
> **9h15** — Elle demande à Élio : *"Qui n'a pas renouvelé son adhésion depuis l'an dernier ?"* Élio lui sort la liste en 2 secondes. Elle clique sur "Préparer relance" — Élio génère les emails, elle valide, c'est envoyé.
>
> **11h00** — Un adhérent appelle : *"J'ai pas reçu mon attestation de formation."* Sandrine tape dans Élio : *"Attestation formation Jean Dupont, session du 8 janvier."* Le PDF se génère, elle l'envoie par email en un clic.
>
> **14h00** — Elle crée un nouvel événement : soirée networking le 20 avril. Elle remplit le formulaire, définit la jauge (50 places), le tarif adhérent (15€) vs non-adhérent (25€). Un clic : l'événement est publié sur le site.
>
> **16h30** — Alerte Élio : *"La formation Qualiopi du 22 mars a 2 documents manquants : convention signée de Martin Petit et fiche d'émargement J2."* Sandrine sait exactement quoi faire.
>
> **17h00** — Elle génère son export comptable du mois en un clic. Fini les 3h de consolidation Excel.

---

## Journey 2 : MiKL, Pilote du Hub (Validation Hub)

**Le contexte :**
MiKL gère plusieurs clients en parallèle. Son Hub centralise tout : demandes entrantes, statuts clients, briefs à valider.

**Un flux Validation Hub :**

> **Notification Hub** : *"🔔 Nouvelle demande de Sandrine (Association) — Catégorie : Évolution fonctionnelle"*
>
> MiKL ouvre la demande. Élio One a déjà qualifié :
> - **Besoin exprimé** : "Je voudrais pouvoir envoyer des SMS de rappel avant les événements"
> - **Contexte collecté** : 3 questions posées par Élio, réponses de Sandrine
> - **Priorité estimée** : Moyenne
> - **Historique pertinent** : Sandrine a déjà demandé des rappels email (déployé en janvier)
>
> MiKL a 4 options :
> - **[A] Réactiver Lab** — Besoin trop complexe, parcours à faire
> - **[B] Visio** — Clarifier en live
> - **[C] Dev direct** — C'est clair, je code
> - **[D] Reporter** — Pas maintenant
>
> MiKL choisit **[C]**. Il clique "Ouvrir dans Cursor", le projet BMAD du client s'ouvre. Il développe le module SMS, le déploie, puis met à jour la doc Élio One.
>
> Sandrine reçoit : *"✅ Votre demande de rappels SMS est déployée. Élio peut maintenant vous aider à les configurer."*

---

## Journey 3 : Thomas, Nouveau Client Lab (Parcours Création)

**Qui est-il ?**
Thomas, 38 ans, quitte son job de commercial pour lancer son activité de coaching sportif. Il a l'expertise terrain mais zéro idée de comment structurer son business digital.

**Son parcours Lab :**

> **Visio onboarding avec MiKL** — Thomas explique son projet, ses doutes, ses envies. La visio est transcrite automatiquement.
>
> **Orpheus analyse** et génère :
> - Brief Initial structuré
> - Profil communication : *"Direct, préfère les listes, niveau tech débutant, tutoiement OK"*
> - Parcours recommandé : **Complet (5 étapes)**
>
> MiKL valide et assigne le parcours. Thomas reçoit son accès Lab.
>
> **Étape 1 — Vision** : Élio Lab pose des questions ciblées. *"Thomas, qu'est-ce qui te fait vibrer dans le coaching ? Si dans 3 ans tout a marché, ça ressemble à quoi ?"* Thomas répond par chat ou audio. Élio produit un **Brief Vision**.
>
> → Soumis au Validation Hub → MiKL valide : *"Je comprends ton projet."*
>
> **Étape 2 — Positionnement** : *"À qui tu veux vraiment parler ? Le cadre stressé qui veut se remettre en forme ou l'athlète amateur qui veut performer ?"* → **Brief Positionnement** → Validation MiKL.
>
> **Étape 3, 4, 5...** → Même flow jusqu'à la **Graduation**.
>
> **Graduation** : Thomas migre vers MonprojetPro One. Son Élio One hérite de TOUT : son profil comm, ses briefs, ses préférences. *"Salut Thomas ! Prêt à lancer ta première offre de coaching ?"*

---

## Journey 4 : Edge Case — Paiement Stripe Échoué

**Le contexte :**
Un adhérent s'inscrit à une formation, le paiement Stripe échoue (carte expirée).

**Le flux de récupération :**

> **Côté adhérent (site public)** :
> - Message clair : *"Votre paiement n'a pas abouti. Votre place est réservée 48h. Cliquez ici pour réessayer."*
> - Email automatique avec lien de paiement
> - Rappel à J+1 si toujours pas payé
>
> **Côté Sandrine (MonprojetPro One)** :
> - Alerte dashboard : *"⚠️ 1 inscription en attente de paiement — Formation 15 mars — Jean Dupont"*
> - Fiche CRM de Jean Dupont montre : inscription en cours, paiement échoué, 2 rappels envoyés
> - Sandrine peut : relancer manuellement, annuler l'inscription, ou contacter Jean
>
> **Si Jean ne paie pas après 48h** :
> - Place libérée automatiquement
> - Jean notifié : *"Votre réservation a expiré. Vous pouvez vous réinscrire si des places sont disponibles."*
> - Log complet dans l'historique CRM

---

## Journey Requirements Summary

| Journey | Capacités clés révélées |
|---------|------------------------|
| **Sandrine (Happy Path)** | Dashboard alertes, CRM conversationnel, génération docs, publication site, conformité Qualiopi, exports |
| **MiKL (Validation Hub)** | Hub notifications, demandes pré-qualifiées, 4 options traitement, lien Cursor, feedback client |
| **Thomas (Lab)** | Transcription visio, analyse Orpheus, parcours flexible, validations Validation Hub, migration Lab→One |
| **Edge Case (Paiement)** | Gestion erreurs Stripe, relances auto, réservation temporaire, alertes admin, logs CRM |

---
