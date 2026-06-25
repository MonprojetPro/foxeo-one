/**
 * Routage modèle Élio (v2) — un seul endroit pour décider quel modèle sert quoi.
 *
 * Principe : le CŒUR (chat Élio plein écran, travail en profondeur) tourne sur Sonnet ;
 * les MICRO-TÂCHES (question rapide depuis le widget sidebar ou la pop-up d'accueil One)
 * tournent sur Haiku — plus rapide et moins cher, suffisant pour de la FAQ/navigation.
 *
 * Les IDs correspondent à ceux acceptés par l'Edge Function `elio-chat` et les CHECK
 * constraints SQL (cf. migrations 00096/00097/00129).
 */
export const ELIO_MODEL_CORE = 'claude-sonnet-4-6'
export const ELIO_MODEL_MICRO = 'claude-haiku-4-5-20251001'
