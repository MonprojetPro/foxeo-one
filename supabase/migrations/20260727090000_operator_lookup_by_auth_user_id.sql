-- Résolution de l'opérateur par identifiant stable plutôt que par email
--
-- INCIDENT DU 2026-07-27 (MiKL bloqué à la porte de son propre Hub)
-- `operators.email` avait été passé à contact@monprojet-pro.com alors que le compte
-- d'authentification restait mikl@foxeo.io. Le mot de passe était pourtant bon : la
-- connexion réussissait, puis cette fonction ne retrouvait aucun opérateur (elle cherchait
-- uniquement par email) et le Hub déconnectait aussitôt avec « Compte opérateur requis ».
--
-- CAUSE DE FOND : l'email servait de clé d'identification alors que c'est une donnée
-- MODIFIABLE, stockée à deux endroits (auth.users.email et operators.email) que rien
-- n'oblige à rester synchronisés. Le seul lien stable est `auth_user_id`.
--
-- CORRECTIF : on résout d'abord par `auth.uid()`. Le repli par email ne sert plus qu'au
-- tout premier login, quand `auth_user_id` n'est pas encore lié — c'était la raison
-- d'être initiale du lookup par email (cf. commentaire dans apps/hub/.../auth.ts).
--
-- Le repli exige `auth_user_id IS NULL` : sans cette condition, quelqu'un disposant d'un
-- compte auth portant l'email d'un opérateur DÉJÀ lié pourrait se faire passer pour lui.

CREATE OR REPLACE FUNCTION public.fn_get_operator_by_email(p_email text)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_operator RECORD;
BEGIN
  -- Cas nominal : l'opérateur est déjà rattaché à ce compte d'authentification.
  -- L'email n'entre pas en jeu — il peut diverger sans jamais bloquer la connexion.
  SELECT id, name, role, two_factor_enabled, auth_user_id
  INTO v_operator
  FROM operators
  WHERE auth_user_id = (SELECT auth.uid());

  -- Repli : tout premier login, le rattachement n'existe pas encore.
  IF v_operator.id IS NULL THEN
    -- Garde conservée : on ne peut interroger que sur son propre email, sinon un client
    -- authentifié pourrait lire la fiche d'un opérateur arbitraire.
    IF LOWER(p_email) != LOWER(auth.jwt()->>'email') THEN
      RETURN NULL;
    END IF;

    SELECT id, name, role, two_factor_enabled, auth_user_id
    INTO v_operator
    FROM operators
    WHERE email = LOWER(p_email)
      AND auth_user_id IS NULL;
  END IF;

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
$function$;

COMMENT ON FUNCTION public.fn_get_operator_by_email(text) IS
  'Resout l''operateur du compte connecte. Par auth.uid() en priorite (l''email peut diverger sans bloquer) ; repli par email uniquement au premier login, tant que auth_user_id est NULL.';
