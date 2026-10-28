-- Migration: 20261028090000_realtime_presence_private_channels.sql
-- T-064 — faille C-01 (revue CERBERE du 2026-10-27).
--
-- Avant : un seul canal de presence PUBLIC `presence:operator:{operatorId}`, commun a tous
-- les clients d'un operateur. Chaque client recevait l'identifiant et l'heure de connexion
-- des autres clients en ligne, et n'importe qui ayant la cle anon pouvait y publier une
-- fausse presence.
--
-- Pourquoi un decoupage par sujet et pas un filtre : l'autorisation Realtime porte sur le
-- SUJET du canal (realtime.topic()) et sur l'extension (broadcast / presence), jamais sur
-- une cle de presence. Tout abonne d'un sujet voit toutes les presences de ce sujet.
--
-- Apres : deux familles de canaux PRIVES (config.private = true cote navigateur).
--   presence:client:{clientId}     ecrit par ce client seul ; lu par ce client et son operateur
--   presence:operator:{operatorId} ecrit par l'operateur seul ; lu par lui et ses clients
--
-- Ces policies ne visent QUE les sujets `presence:client:` et `presence:operator:` (toute
-- autre valeur de sujet renvoie false dans les fonctions ci-dessous). Les canaux publics existants
-- (postgres_changes, broadcasts `documents:`, `parcours:`, `client_configs:`, `one:`) ne
-- passent par aucune policy tant que le reglage « Allow public access » reste active :
-- cette migration ne change rien pour eux.

-- ============================================================
-- 1. Extraction securisee de l'identifiant d'un sujet
-- ============================================================

-- Renvoie l'UUID qui suit le prefixe, ou NULL si le sujet ne commence pas par ce prefixe
-- ou si la suite n'est pas un UUID. Jamais d'erreur de conversion sur un sujet malforme.
CREATE OR REPLACE FUNCTION public.realtime_topic_uuid(p_topic TEXT, p_prefix TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_topic IS NOT NULL
     AND left(p_topic, length(p_prefix)) = p_prefix
     AND substr(p_topic, length(p_prefix) + 1)
         ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN substr(p_topic, length(p_prefix) + 1)::uuid
  END
$$;

COMMENT ON FUNCTION public.realtime_topic_uuid(TEXT, TEXT) IS
  'T-064 — UUID suivant un prefixe de sujet Realtime, NULL si absent ou malforme';

-- ============================================================
-- 2. Droits de lecture et d'ecriture de presence, par sujet
-- ============================================================

-- Lecture : qui peut recevoir l'etat de presence de ce sujet ?
CREATE OR REPLACE FUNCTION public.realtime_presence_can_read(p_topic TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_client_id UUID;
  v_operator_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Sujet d'un client : le client lui-meme, ou l'operateur qui le suit.
  v_client_id := public.realtime_topic_uuid(p_topic, 'presence:client:');
  IF v_client_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = v_client_id
        AND (
          c.auth_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.operators o
            WHERE o.id = c.operator_id
              AND o.auth_user_id = auth.uid()
          )
        )
    );
  END IF;

  -- Sujet d'un operateur : l'operateur lui-meme, ou l'un de ses clients.
  v_operator_id := public.realtime_topic_uuid(p_topic, 'presence:operator:');
  IF v_operator_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.operators o
      WHERE o.id = v_operator_id
        AND o.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.operator_id = v_operator_id
        AND c.auth_user_id = auth.uid()
    );
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.realtime_presence_can_read(TEXT) IS
  'T-064 — presence Realtime : lecture autorisee pour le titulaire du sujet et sa contrepartie (client <-> son operateur)';

-- Ecriture : qui peut publier sa presence sur ce sujet ? Le titulaire SEUL.
-- C'est ce qui rend l'identite deduite du sujet fiable : sur presence:client:X, seule
-- la personne connectee comme client X peut ecrire.
CREATE OR REPLACE FUNCTION public.realtime_presence_can_write(p_topic TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_client_id UUID;
  v_operator_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  v_client_id := public.realtime_topic_uuid(p_topic, 'presence:client:');
  IF v_client_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = v_client_id
        AND c.auth_user_id = auth.uid()
    );
  END IF;

  v_operator_id := public.realtime_topic_uuid(p_topic, 'presence:operator:');
  IF v_operator_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.operators o
      WHERE o.id = v_operator_id
        AND o.auth_user_id = auth.uid()
    );
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.realtime_presence_can_write(TEXT) IS
  'T-064 — presence Realtime : ecriture reservee au titulaire du sujet';

REVOKE ALL ON FUNCTION public.realtime_presence_can_read(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.realtime_presence_can_write(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.realtime_topic_uuid(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.realtime_presence_can_read(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.realtime_presence_can_write(TEXT) TO authenticated;

-- ============================================================
-- 3. Policies sur realtime.messages
-- ============================================================

-- Lecture : 'broadcast' ET 'presence'. Jusqu'a Realtime v2.76.0 au moins, la jonction d'un
-- canal prive exige le droit de lecture 'broadcast' (realtime_channel.ex,
-- maybe_assign_policies) ; le droit 'presence' seul fait refuser la jonction. Les versions
-- recentes acceptent l'un OU l'autre. Couvrir les deux marche partout et n'ouvre rien de
-- plus : les memes personnes lisent, et personne ne peut ecrire de broadcast sur ces sujets
-- (policy d'ecriture ci-dessous limitee a 'presence').
DROP POLICY IF EXISTS "presence_private_select" ON realtime.messages;
CREATE POLICY "presence_private_select"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.messages.extension IN ('broadcast', 'presence')
    AND public.realtime_presence_can_read((SELECT realtime.topic()))
  );

-- Ecriture : 'presence' uniquement, titulaire du sujet seul.

DROP POLICY IF EXISTS "presence_private_insert" ON realtime.messages;
CREATE POLICY "presence_private_insert"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    realtime.messages.extension = 'presence'
    AND public.realtime_presence_can_write((SELECT realtime.topic()))
  );
