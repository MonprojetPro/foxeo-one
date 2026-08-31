-- Migration: bucket 'screenshots' aligné sur le pattern GuardVeto
-- Demande MiKL 2026-08-31 : accepter aussi PDF et photos HEIC/HEIF (iPhone),
-- et relever la limite à 10 Mo (les images sont de toute façon compressées
-- côté navigateur avant upload — voir compress-image.ts).

UPDATE storage.buckets
SET
  file_size_limit = 10485760, -- 10 Mo, identique à TAILLE_MAX_OCTETS (contraintes.ts)
  allowed_mime_types = ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'application/pdf'
  ]
WHERE id = 'screenshots';
