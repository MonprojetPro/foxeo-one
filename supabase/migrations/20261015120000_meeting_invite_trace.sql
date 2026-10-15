-- T-056 : tracer l'envoi du lien de visio.
--
-- POURQUOI : MiKL demande un bouton « renvoyer le lien ». Sans savoir A QUI et
-- QUAND le lien est parti, « renvoyer » se fait a l'aveugle et on envoie deux
-- fois. C'est mot pour mot la lecon de T-044a (facture envoyee sans date
-- d'envoi affichee) : une action d'envoi sans sa trace visible n'est pas finie.
--
-- Les trois colonnes sont NULLABLE : les rendez-vous existants n'ont jamais ete
-- envoyes depuis cette interface, et pretendre le contraire serait faux.
--
-- ⚠️ La colonne ne sert a rien tant que le LECTEUR ne la demande pas :
-- `toMeeting` et les types `Meeting`/`MeetingDB` la portent, et un test echoue
-- si elle en disparait (c'est exactement l'oubli qui a rendu T-044 inoperant).

alter table public.meetings
  add column if not exists invite_last_sent_at timestamptz,
  add column if not exists invite_last_sent_to text,
  add column if not exists invite_sent_count integer not null default 0;

comment on column public.meetings.invite_last_sent_at is
  'Date du dernier envoi du lien de visio par email (T-056). NULL = jamais envoye depuis le Hub.';
comment on column public.meetings.invite_last_sent_to is
  'Adresse du dernier destinataire du lien (T-056) — pour ne pas renvoyer a l''aveugle.';
comment on column public.meetings.invite_sent_count is
  'Nombre total d''envois du lien (T-056). Un compteur a 2+ signale un renvoi.';
