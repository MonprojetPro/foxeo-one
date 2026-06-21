-- Migration 00142 : Permettre au client One d'éditer SON propre branding
-- ─────────────────────────────────────────────────────────────────────────
-- 1. RPC update_own_branding  — SECURITY DEFINER, is_owner, custom_branding UNIQUEMENT
-- 2. Policy storage client    — upload logo dans client-assets sous son propre clientId
-- ─────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════════════
-- 1. RPC update_own_branding
-- ══════════════════════════════════════════════════════════════════════════
-- Sécurité :
--   • SECURITY DEFINER → s'exécute avec les droits du propriétaire (postgres)
--     pour contourner la RLS UPDATE qui n'autorise que l'opérateur.
--   • Mais identifie le client via auth.uid() → on ne peut modifier QUE sa propre ligne.
--   • UNIQUEMENT la colonne custom_branding — aucun autre champ n'est touchable.
--   • search_path = public pour éviter l'injection de search_path.
--   • Validation JSON : vérifie displayName (max 50), accentColor (HEX), logoUrl (http/https).

CREATE OR REPLACE FUNCTION public.update_own_branding(p_branding jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id   uuid;
  v_current     jsonb;
  v_merged      jsonb;
  v_display     text;
  v_accent      text;
  v_logo        text;
BEGIN
  -- Récupérer le client_id correspondant à l'utilisateur connecté
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'CLIENT_NOT_FOUND: Aucun client correspondant à cet utilisateur';
  END IF;

  -- Valider les champs fournis (uniquement ce qui est présent dans p_branding)
  v_display := p_branding->>'displayName';
  v_accent  := p_branding->>'accentColor';
  v_logo    := p_branding->>'logoUrl';

  IF v_display IS NOT NULL AND char_length(v_display) > 50 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: displayName dépasse 50 caractères';
  END IF;

  IF v_accent IS NOT NULL AND v_accent !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: accentColor doit être au format #RRGGBB';
  END IF;

  IF v_logo IS NOT NULL AND v_logo !~ '^https?://' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: logoUrl doit commencer par http:// ou https://';
  END IF;

  -- Récupérer le branding actuel
  SELECT COALESCE(custom_branding, '{}'::jsonb) INTO v_current
  FROM public.client_configs
  WHERE client_id = v_client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONFIG_NOT_FOUND: Configuration client introuvable';
  END IF;

  -- Merge : on conserve les champs existants non fournis
  v_merged := v_current;

  -- Appliquer seulement les champs présents dans p_branding (null = reset intentionnel)
  IF p_branding ? 'logoUrl' THEN
    IF v_logo IS NULL THEN
      v_merged := v_merged - 'logoUrl';
    ELSE
      v_merged := jsonb_set(v_merged, '{logoUrl}', to_jsonb(v_logo));
    END IF;
  END IF;

  IF p_branding ? 'displayName' THEN
    IF v_display IS NULL THEN
      v_merged := v_merged - 'displayName';
    ELSE
      v_merged := jsonb_set(v_merged, '{displayName}', to_jsonb(v_display));
    END IF;
  END IF;

  IF p_branding ? 'accentColor' THEN
    IF v_accent IS NULL THEN
      v_merged := v_merged - 'accentColor';
    ELSE
      v_merged := jsonb_set(v_merged, '{accentColor}', to_jsonb(v_accent));
    END IF;
  END IF;

  -- Toujours mettre à jour updatedAt
  v_merged := jsonb_set(v_merged, '{updatedAt}', to_jsonb(now()::text));

  -- Mise à jour UNIQUEMENT de custom_branding — aucune autre colonne
  UPDATE public.client_configs
  SET custom_branding = v_merged
  WHERE client_id = v_client_id;

  RETURN v_merged;
END;
$$;

-- Révoquer l'accès public par défaut, puis accorder aux utilisateurs authentifiés uniquement
REVOKE ALL ON FUNCTION public.update_own_branding(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_own_branding(jsonb) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- 2. Policy storage — upload logo client dans client-assets
-- ══════════════════════════════════════════════════════════════════════════
-- Scope strict : le client ne peut écrire QUE dans clients/{son_client_id}/branding/
-- Son client_id est résolu via la table clients (auth_user_id = auth.uid()).
-- Lecture publique déjà couverte par client_assets_select_public (migration 00061).

CREATE POLICY "client_assets_insert_owner"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-assets'
    AND (storage.foldername(name))[1] = 'clients'
    AND (storage.foldername(name))[2] = (
      SELECT id::text FROM public.clients WHERE auth_user_id = auth.uid() LIMIT 1
    )
    AND (storage.foldername(name))[3] = 'branding'
  );

CREATE POLICY "client_assets_update_owner"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'client-assets'
    AND (storage.foldername(name))[1] = 'clients'
    AND (storage.foldername(name))[2] = (
      SELECT id::text FROM public.clients WHERE auth_user_id = auth.uid() LIMIT 1
    )
    AND (storage.foldername(name))[3] = 'branding'
  );

COMMENT ON FUNCTION public.update_own_branding(jsonb) IS
  'Permet à un client authentifié de mettre à jour UNIQUEMENT custom_branding de sa propre ligne client_configs. SECURITY DEFINER pour bypasser la RLS UPDATE opérateur. Aucun autre champ n''est modifiable via cette fonction.';
