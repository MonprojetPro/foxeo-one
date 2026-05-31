-- Migration 00134 — Fix ambiguïté de fonction approve_validation_request (erreur PostgREST 300)
--
-- Problème : la migration 00128 a fait `CREATE OR REPLACE FUNCTION approve_validation_request(...)`
-- en AJOUTANT deux paramètres (p_notification_title, p_notification_body DEFAULT NULL). En Postgres,
-- changer la liste des paramètres crée une NOUVELLE surcharge au lieu de remplacer l'ancienne.
-- Résultat : deux fonctions coexistaient —
--   approve_validation_request(uuid, text, uuid)                              [00125]
--   approve_validation_request(uuid, text, uuid, text DEFAULT, text DEFAULT)  [00128]
-- L'appel à 3 arguments depuis approve-request.ts matchait les DEUX (la 5-args a des défauts)
-- → PostgREST renvoie HTTP 300 (Multiple Choices) → toute validation échouait
-- (« Erreur lors du traitement — veuillez réessayer »).
--
-- Fix : supprimer la version à 3 arguments. La version à 5 arguments (00128) est rétrocompatible
-- via ses DEFAULT NULL : l'appel à 3 arguments s'y résout sans ambiguïté.

DROP FUNCTION IF EXISTS approve_validation_request(uuid, text, uuid);
