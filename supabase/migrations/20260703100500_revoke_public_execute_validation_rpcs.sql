-- ============================================================================
-- Complément de 20260703100000 : REVOKE PUBLIC sur les RPC validation
-- Date : 2026-07-03
--
-- Le REVOKE FROM anon de la migration précédente ne suffisait pas : l'ACL des
-- deux fonctions contenait encore le grant PUBLIC (`=X/postgres`, grantee vide),
-- hérité du GRANT EXECUTE ... TO PUBLIC par défaut de Postgres. Via ce grant,
-- anon pouvait toujours exécuter les RPC par héritage.
--
-- On révoque PUBLIC : sans risque, car postgres / authenticated / service_role
-- conservent leurs grants EXPLICITES (vérifiés en base avant ce fix).
-- Le garde interne is_operator(p_operator_id) reste la défense principale.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.approve_validation_request(uuid, text, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_validation_request(uuid, text, uuid) FROM PUBLIC;
