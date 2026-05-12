-- Migration 00121 : Ajouter step_submissions et step_feedback_injections à la publication Realtime
-- Raison : step_submissions n'était pas dans supabase_realtime → le badge statut côté client
-- ne se mettait jamais à jour en temps réel après un refus/validation Hub.
-- step_feedback_injections ajouté pour que les feedbacks MiKL apparaissent sans rechargement.

ALTER PUBLICATION supabase_realtime ADD TABLE step_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE step_feedback_injections;
