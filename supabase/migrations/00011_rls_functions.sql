-- Migration 00011: RLS helper functions
-- Story 1.5 — RLS & isolation donnees multi-tenant
--
-- Fonctions SQL reutilisables pour les policies RLS.
-- Convention: is_* pour les helpers RLS, fn_* pour les utilitaires SECURITY DEFINER.

-- ============================================================
-- RLS HELPER FUNCTIONS (used in policies)
-- ============================================================

-- is_admin(): true si l'utilisateur courant est un operateur/admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM operators
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'operator')
  );
END;
$$;

COMMENT ON FUNCTION is_admin() IS 'RLS helper: true si utilisateur courant est operateur/admin';

-- is_owner(p_client_id): true si l'utilisateur courant est le proprietaire du client
CREATE OR REPLACE FUNCTION is_owner(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM clients
    WHERE id = p_client_id
      AND auth_user_id = auth.uid()
  );
END;
$$;

COMMENT ON FUNCTION is_owner(UUID) IS 'RLS helper: true si utilisateur courant est le client specifie';

-- is_operator(p_operator_id): true si l'utilisateur courant est l'operateur specifie
CREATE OR REPLACE FUNCTION is_operator(p_operator_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM operators
    WHERE id = p_operator_id
      AND auth_user_id = auth.uid()
  );
END;
$$;

COMMENT ON FUNCTION is_operator(UUID) IS 'RLS helper: true si utilisateur courant est l operateur specifie';

-- is_operator(): true si l'utilisateur courant est un operateur (sans argument)
CREATE OR REPLACE FUNCTION is_operator()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM operators
    WHERE auth_user_id = auth.uid()
  );
END;
$$;

COMMENT ON FUNCTION is_operator() IS 'RLS helper: true si utilisateur courant est un operateur';

-- ============================================================
-- SECURITY DEFINER UTILITY FUNCTIONS (bypass RLS)
-- ============================================================

-- fn_get_operator_by_email: Lookup operateur par email
-- Bypass RLS pour le middleware Hub et hubLoginAction
-- (necessaire car auth_user_id peut ne pas encore etre lie au premier login)
CREATE OR REPLACE FUNCTION fn_get_operator_by_email(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  v_operator RECORD;
BEGIN
  -- Guard: l'utilisateur ne peut interroger que sur son propre email
  -- Empeche un client authentifie de lire les infos d'un operateur arbitraire
  IF LOWER(p_email) != LOWER(auth.jwt()->>'email') THEN
    RETURN NULL;
  END IF;

  SELECT id, name, role, two_factor_enabled, auth_user_id
  INTO v_operator
  FROM operators
  WHERE email = LOWER(p_email);

  IF v_operator.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'id', v_operator.id,
    'name', v_operator.name,
    'role', v_operator.role,
    'twoFactorEnabled', v_operator.two_factor_enabled,
    'authUserId', v_operator.auth_user_id
  );
END;
$$;

COMMENT ON FUNCTION fn_get_operator_by_email(TEXT) IS 'SECURITY DEFINER: lookup operateur par email, bypass RLS pour middleware/login';

-- fn_link_operator_auth_user: Lie un auth user a un operateur lors du premier login
CREATE OR REPLACE FUNCTION fn_link_operator_auth_user(p_auth_user_id UUID, p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator RECORD;
BEGIN
  -- Guard: l'utilisateur ne peut lier que son propre auth_user_id a son propre email
  -- Empeche une escalade de privileges (un client qui tenterait de se lier a un operateur)
  IF p_auth_user_id != auth.uid() OR LOWER(p_email) != LOWER(auth.jwt()->>'email') THEN
    RETURN NULL;
  END IF;

  UPDATE operators
  SET auth_user_id = p_auth_user_id, updated_at = NOW()
  WHERE email = LOWER(p_email)
    AND auth_user_id IS NULL
  RETURNING id, name INTO v_operator;

  IF v_operator.id IS NOT NULL THEN
    RETURN json_build_object('id', v_operator.id, 'name', v_operator.name);
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION fn_link_operator_auth_user(UUID, TEXT) IS 'SECURITY DEFINER: lie auth.users a operators au premier login Hub';

-- ============================================================
-- GRANTS
-- ============================================================

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_operator(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_operator() TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_operator_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_link_operator_auth_user(UUID, TEXT) TO authenticated;
