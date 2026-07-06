/**
 * Définitions des outils de l'agent Élio Hub (format Anthropic — Contrat 1/4).
 *
 * Fichier serveur ordinaire (PAS 'use server') : importé uniquement par la boucle
 * agent (elio-hub-agent.ts). Les schémas sont stricts (additionalProperties: false)
 * pour que le LLM ne puisse pas inventer de paramètres.
 */

import type { AnthropicTool } from '../../types/elio-hub-agent.types'

const CLIENT_PARAM = {
  type: 'string',
  description:
    "Le client visé : son UUID si tu le connais déjà (préférable), sinon son nom, prénom, email ou nom d'entreprise (recherche approximative).",
} as const

const SKIP_CONFIRMATION_PARAM = {
  type: 'boolean',
  description:
    "true UNIQUEMENT si MiKL a explicitement demandé dans son message courant de ne pas vérifier (ex : « sans vérif », « envoie directement »). Jamais par défaut, jamais par déduction.",
} as const

export const HUB_AGENT_TOOLS: AnthropicTool[] = [
  // ── Outils LECTURE (exécution immédiate, RLS de la session MiKL) ────────────
  {
    name: 'get_hub_overview',
    description:
      "Vue d'ensemble du Hub : nombre de clients (Lab/One), MRR, factures impayées (nombre + montant), validations en attente, messages clients non lus, prochains rendez-vous. À utiliser pour toute question générale sur l'état de l'activité.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'search_client',
    description:
      "Recherche un client par nom, email ou entreprise et retourne sa fiche complète : infos, parcours Lab, dernières demandes de validation, derniers messages Élio. Si plusieurs clients correspondent, retourne la liste pour lever l'ambiguïté.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nom, email ou entreprise du client recherché.' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_client_activity',
    description:
      "Activité récente d'un client : dernier message envoyé/reçu (chat), dernière visio, dernières validations, les 2 dernières séances de coaching terminées (avec un extrait du transcript si disponible), et « dernier contact il y a N jours ». À utiliser pour savoir où en est la relation avec un client ou ce qui s'est dit en séance de coaching.",
    input_schema: {
      type: 'object',
      properties: { client: CLIENT_PARAM },
      required: ['client'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_unpaid_invoices',
    description:
      'Liste les factures impayées ou en attente (montant, client, statut). À utiliser pour les questions de trésorerie/relances.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_pending_validations',
    description:
      'Liste les demandes de validation en attente (briefs Lab, évolutions One, soumissions d\'étapes) avec le client et la date. À utiliser pour prioriser le travail de MiKL.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_stagnant_parcours',
    description:
      "Liste les étapes de parcours Lab actives sans aucune activité depuis N jours (défaut 7). À utiliser pour détecter les clients qui stagnent dans leur incubation.",
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Seuil en jours (défaut 7).' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_silent_clients',
    description:
      "Liste les clients (hors prospects) sans aucun message échangé depuis N jours (défaut 7), avec la date du dernier message. À utiliser pour détecter les silences radio.",
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Seuil en jours (défaut 7).' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_menufacile_report',
    description:
      "Rapport MenuFacile sur une période (défaut 7 jours) : totaux produit (utilisateurs, recettes, modération) + agrégats de la période (nouveaux comptes, nouvelles recettes, copies). Ne JAMAIS inventer de chiffres MenuFacile — toujours passer par cet outil.",
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Période en jours (1-90, défaut 7).' },
      },
      additionalProperties: false,
    },
  },

  // ── Outils ACTION (garde-fou : proposition à valider par MiKL) ──────────────
  {
    name: 'send_chat_message',
    description:
      "Envoie un message chat à un client de la part de MiKL. Par défaut, crée une PROPOSITION que MiKL doit valider (carte dans le chat) — le message ne part pas immédiatement.",
    input_schema: {
      type: 'object',
      properties: {
        client: CLIENT_PARAM,
        content: { type: 'string', description: 'Le message à envoyer au client (français, ton de MiKL).' },
        skip_confirmation: SKIP_CONFIRMATION_PARAM,
      },
      required: ['client', 'content'],
      additionalProperties: false,
    },
  },
  {
    name: 'send_email_to_client',
    description:
      "Envoie un email à un client (sujet + corps texte). Par défaut, crée une PROPOSITION que MiKL doit valider. L'email part via l'infrastructure transactionnelle (Resend) et respecte les préférences email du client.",
    input_schema: {
      type: 'object',
      properties: {
        client: CLIENT_PARAM,
        subject: { type: 'string', description: "Sujet de l'email." },
        body: { type: 'string', description: "Corps de l'email en texte simple (pas de HTML)." },
        skip_confirmation: SKIP_CONFIRMATION_PARAM,
      },
      required: ['client', 'subject', 'body'],
      additionalProperties: false,
    },
  },
  {
    name: 'launch_parcours',
    description:
      "Installe un circuit type de parcours Lab pour un client (ajout des étapes à la suite, sans doublon). Par défaut, crée une PROPOSITION que MiKL doit valider. Si template_key est omis, l'outil retourne la liste des circuits disponibles — demande alors à MiKL lequel choisir.",
    input_schema: {
      type: 'object',
      properties: {
        client: CLIENT_PARAM,
        template_key: {
          type: 'string',
          description: "Clé du circuit type (ex : 'fondation-complete'). Omettre pour lister les circuits disponibles.",
        },
        skip_confirmation: SKIP_CONFIRMATION_PARAM,
      },
      required: ['client'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_quote_draft',
    description:
      "Crée un devis Pennylane (brouillon, PAS envoyé par email au client) pour un client, à partir de lignes {label, quantity, unit_price_ht}. Par défaut, crée une PROPOSITION que MiKL doit valider.",
    input_schema: {
      type: 'object',
      properties: {
        client: CLIENT_PARAM,
        lines: {
          type: 'array',
          description: 'Lignes du devis.',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Libellé de la ligne.' },
              quantity: { type: 'number', description: 'Quantité (défaut 1).' },
              unit_price_ht: { type: 'number', description: 'Prix unitaire HT en euros.' },
              description: { type: 'string', description: 'Description optionnelle.' },
            },
            required: ['label', 'unit_price_ht'],
            additionalProperties: false,
          },
          minItems: 1,
        },
        notes: { type: 'string', description: 'Notes publiques du devis (optionnel).' },
        skip_confirmation: SKIP_CONFIRMATION_PARAM,
      },
      required: ['client', 'lines'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_coaching_credits',
    description:
      "Ajoute (ou retire, avec un nombre négatif) des crédits de coaching One+ à un client. Par défaut, crée une PROPOSITION que MiKL doit valider.",
    input_schema: {
      type: 'object',
      properties: {
        client: CLIENT_PARAM,
        credits: { type: 'integer', description: 'Nombre de crédits à ajouter (négatif pour retirer).' },
        note: { type: 'string', description: "Note explicative (visible dans l'historique)." },
        skip_confirmation: SKIP_CONFIRMATION_PARAM,
      },
      required: ['client', 'credits'],
      additionalProperties: false,
    },
  },
]
