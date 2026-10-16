-- T-050 — Archivage de la transcription de visio dans le DOSSIER DU CLIENT.
--
-- Demande de MiKL (11-10) : « récupérer la transcription et la mettre dans le
-- dossier du client ». La récupération chez Google était déjà écrite
-- (syncMeetingResults) ; ce qui manquait est le DÉPÔT, et de quoi savoir qu'il
-- a déjà eu lieu.
--
-- Pourquoi deux colonnes et pas un simple booléen : `transcript_document_id`
-- fait le lien vers le document réel, donc une suppression du document se voit
-- (ON DELETE SET NULL -> l'archivage pourra être refait). Un booléen aurait
-- continué à répondre « déjà archivé » pour un document disparu.
--
-- L'état d'AVANCEMENT du rattrapage (tentatives, dernière erreur, abandon) ne
-- vit PAS ici : il va dans `meetings.metadata.transcript_sync`, exactement
-- comme `metadata.reminder_sent_at` du cron de rappel. Raison : une visio sans
-- transcription n'a aucune ligne `meeting_recordings`, et on ne veut pas en
-- créer une vide juste pour compter des tentatives.

ALTER TABLE meeting_recordings
  ADD COLUMN IF NOT EXISTS transcript_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transcript_archived_at TIMESTAMPTZ;

COMMENT ON COLUMN meeting_recordings.transcript_document_id IS
  'T-050 — Document créé dans le dossier du client à partir de la transcription Google. NULL = jamais archivé, ou document supprimé depuis.';

COMMENT ON COLUMN meeting_recordings.transcript_archived_at IS
  'T-050 — Horodatage du dépôt dans le dossier client. Sert d''anti-doublon : une transcription ne produit qu''un document.';

CREATE INDEX IF NOT EXISTS idx_meeting_recordings_transcript_document_id
  ON meeting_recordings(transcript_document_id);
