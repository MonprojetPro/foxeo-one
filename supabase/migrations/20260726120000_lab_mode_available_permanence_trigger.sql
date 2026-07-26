-- Migration — Permanence de l'accès Lab au niveau base de données
--
-- Règle métier (décision MiKL) : une fois qu'un client a obtenu l'accès Lab
-- (client_configs.lab_mode_available = true), cet accès et son historique de parcours
-- restent disponibles À VIE — même si le client gradue vers le One, même si un futur
-- flux de code oublie la règle. Le code applicatif la respecte déjà (cf.
-- packages/modules/crm/actions/toggle-access.ts, packages/modules/facturation/actions/
-- pennylane-paid-handlers.ts), mais rien n'empêchait techniquement un futur UPDATE — un
-- nouveau handler, un script de migration de données, une correction manuelle en base —
-- de repasser le flag à false par erreur. Cette migration rend la règle INVIOLABLE au
-- niveau base : plus aucun code applicatif ne peut la violer, même par inadvertance.
--
-- Choix : on NE lève PAS d'exception sur la transition true → false. Un UPDATE qui
-- touche client_configs pour une tout autre raison (ex: changer active_modules) et qui,
-- par négligence, repasse lab_mode_available à false en même temps ne doit pas échouer
-- entièrement — on neutralise silencieusement la seule colonne concernée en la
-- reforçant à sa valeur précédente (true), et le reste de l'UPDATE s'applique normalement.

-- search_path figé : la fonction ne touche aucune table (elle ne lit que NEW/OLD), mais un
-- search_path mutable est signalé comme faille par les advisors Supabase — on le neutralise.
CREATE OR REPLACE FUNCTION enforce_lab_mode_available_permanence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.lab_mode_available = true AND NEW.lab_mode_available = false THEN
    NEW.lab_mode_available := true;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION enforce_lab_mode_available_permanence IS
  'Empêche toute transition lab_mode_available true → false : l''accès Lab, une fois accordé, reste permanent (règle métier MiKL). Neutralise la transition plutôt que de lever une exception, pour ne jamais casser un UPDATE légitime portant sur d''autres colonnes.';

DROP TRIGGER IF EXISTS trg_lab_mode_available_permanence ON client_configs;

CREATE TRIGGER trg_lab_mode_available_permanence
  BEFORE UPDATE ON client_configs
  FOR EACH ROW
  EXECUTE FUNCTION enforce_lab_mode_available_permanence();
