-- Migration 00143 — fn_mark_graduation_screen_shown (SECURITY DEFINER)
--
-- Cause racine (boucle /graduation/celebrate) : la table clients n'a qu'une
-- policy UPDATE opérateur (clients_update_operator, 00012). L'UPDATE du client
-- sur sa propre row (graduation_screen_shown = TRUE) est filtré par la RLS :
-- 0 ligne modifiée, AUCUNE erreur retournée. Le flag reste FALSE et le
-- middleware renvoie le client vers /graduation/celebrate à chaque navigation.
--
-- Fix conforme au commentaire de 00012 ("utiliser une fonction SECURITY
-- DEFINER dediee pour les updates sensibles") : le client ne reçoit PAS de
-- policy UPDATE générale sur clients (il pourrait toucher status, operator_id…),
-- il passe par cette RPC qui ne pose QUE ce flag, uniquement sur sa row,
-- uniquement s'il est gradué.

CREATE OR REPLACE FUNCTION fn_mark_graduation_screen_shown()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE clients
  SET graduation_screen_shown = TRUE
  WHERE auth_user_id = auth.uid()
    AND graduated_at IS NOT NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION fn_mark_graduation_screen_shown() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_mark_graduation_screen_shown() TO authenticated;

COMMENT ON FUNCTION fn_mark_graduation_screen_shown() IS
  'SECURITY DEFINER: le client gradué pose graduation_screen_shown=TRUE sur sa propre row (la RLS clients ne lui donne aucun droit UPDATE). Retourne TRUE si une row a été modifiée.';
