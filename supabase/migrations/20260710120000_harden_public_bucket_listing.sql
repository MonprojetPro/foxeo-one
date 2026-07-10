-- Durcissement sécurité : suppression du listing public anonyme sur 2 buckets.
--
-- Contexte : l'advisor Supabase (0025_public_bucket_allows_listing) signalait que
-- les buckets publics `client-assets` et `screenshots` exposaient une policy SELECT
-- large (rôle `public`, USING bucket_id = X) permettant à n'importe qui d'ÉNUMÉRER
-- (list()) tous les fichiers, donc de découvrir les userId/clientId et l'inventaire
-- des captures d'autres utilisateurs.
--
-- L'affichage des images via getPublicUrl repose sur le flag `public: true` du bucket
-- (servi par le CDN, hors RLS) et reste 100% fonctionnel. Aucun code applicatif
-- n'utilise .list() sur ces buckets (vérifié par grep : seuls upload + getPublicUrl).
-- Les policies d'upload/update/delete (owner + operator) restent intactes.

DROP POLICY IF EXISTS client_assets_select_public ON storage.objects;
DROP POLICY IF EXISTS screenshots_select_public ON storage.objects;
