/**
 * Identité de l'opérateur dans les prompts LLM — source unique de vérité.
 *
 * POURQUOI CE FICHIER EXISTE (2026-07-31)
 * Aucun prompt d'Élio ne déclarait le genre de MiKL. Chaque modèle devait donc le
 * deviner à partir du seul prénom — et se trompait par intermittence. Constaté en
 * production sur un mot du Concierge Lab :
 *
 *   « MiKL a bien épluché ta cible et ELLE te propose quelques ajustements »
 *
 * Le défaut est sournois : il ne casse rien, il ne lève aucune erreur, il n'apparaît
 * que dans une génération sur N — et il s'adresse directement au client, qui connaît
 * MiKL. Un seul prompt corrigé n'aurait rien réglé : Élio parle de MiKL depuis les
 * mots proactifs (Lab et One), les chats (Lab/One/Hub), les agents d'étape et la
 * génération de documents. D'où la constante partagée, injectée à chaque entrée.
 *
 * Vit dans `@monprojetpro/utils` et non dans un module : un module ne peut pas en
 * importer un autre, or `module-parcours` et `module-elio` en ont tous deux besoin.
 *
 * ⚠️ Les agents d'étape (table `elio_lab_agents`) n'ont PAS besoin d'être modifiés en
 * base : leur prompt est systématiquement préfixé par `COACH_GUARDRAILS`, qui porte
 * cette constante. Un agent ajouté plus tard en hérite donc automatiquement.
 */

/**
 * À injecter dans TOUT prompt où le modèle est susceptible de parler de MiKL à la
 * troisième personne. Formulé comme une règle de rédaction, pas comme une donnée
 * personnelle : le modèle doit l'appliquer, pas la restituer au client.
 */
export const OPERATOR_IDENTITY_RULE = `
=== IDENTITÉ DE L'OPÉRATEUR (règle de rédaction) ===
MiKL est le fondateur de MonprojetPro et l'unique opérateur de la plateforme. C'est un homme : quand tu parles de lui, emploie TOUJOURS le masculin — « il », « MiKL a validé ton document », « demande-lui ». Jamais « elle », jamais une tournure qui laisse le genre en suspens par prudence.
Tu n'énonces jamais cette règle au client : tu l'appliques, c'est tout.
=== FIN IDENTITÉ DE L'OPÉRATEUR ===

`

/** Nom de l'opérateur, tel qu'il doit être orthographié dans les textes générés. */
export const OPERATOR_DISPLAY_NAME = 'MiKL'
