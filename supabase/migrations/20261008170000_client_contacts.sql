-- T-039 — Carnet de contacts par client.
--
-- Contexte, mots de MiKL (06-10, cas reel du CSE Habitat 77) : « le nom du contact
-- que j'ai mis c'est pour le secretaire du CSE mais c'est la comptable qui me paie
-- et elle a pas la meme adresse mail ». La fiche client n'avait qu'UN `email`, qui
-- est aussi l'identifiant de connexion : la facture partait donc toujours a
-- l'adresse du secretaire, jamais a la comptable.
--
-- 🔑 LES DEUX CASES SONT INDEPENDANTES, et c'est le coeur de la demande :
--   `receives_invoices` -> « envoyer la facture a cette adresse »
--   `show_on_invoice`   -> « ce nom doit apparaitre sur la facture »
-- MiKL veut pouvoir produire les trois combinaisons : le NOM du secretaire avec
-- l'ADRESSE de la comptable, les deux pour la comptable, ou aucun nom et juste une
-- adresse. Une seule case ne saurait pas le faire.
--
-- ⚠️ `clients.email` n'est PAS touche : c'est l'identifiant de connexion du client
-- (lecon « email client = 2 sources »). Le carnet s'ajoute, il ne remplace rien.
-- ⚠️ Le carnet vaut AUSSI pour les particuliers (tranche par MiKL le 06-10 : « on
-- sait jamais ») — aucune condition sur `client_kind`.

CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id),
  full_name TEXT NOT NULL,
  email TEXT,
  -- « leur statut dans l'entite ou des anecdotes pour me souvenir d'eux » (MiKL)
  note TEXT,
  receives_invoices BOOLEAN NOT NULL DEFAULT false,
  show_on_invoice BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un destinataire de facture SANS adresse serait un envoi dans le vide, coche a
-- l'ecran et silencieux a l'execution. La base refuse donc la combinaison.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_contacts_recipient_needs_email_check'
  ) THEN
    ALTER TABLE client_contacts
      ADD CONSTRAINT client_contacts_recipient_needs_email_check
      CHECK (receives_invoices = false OR (email IS NOT NULL AND btrim(email) <> ''));
  END IF;
END $$;

-- Un nom vide rendrait la fiche illisible dans le carnet comme sur la facture.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_contacts_full_name_not_blank_check'
  ) THEN
    ALTER TABLE client_contacts
      ADD CONSTRAINT client_contacts_full_name_not_blank_check
      CHECK (btrim(full_name) <> '');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_operator_id ON client_contacts(operator_id);
-- Index partiel : la resolution des destinataires ne lit que les lignes cochees.
CREATE INDEX IF NOT EXISTS idx_client_contacts_recipients
  ON client_contacts(client_id) WHERE receives_invoices;

CREATE TRIGGER trg_client_contacts_updated_at
  BEFORE UPDATE ON client_contacts
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_updated_at();

ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

-- Carnet strictement operateur : le client n'y a AUCUN acces, ni lecture ni
-- ecriture. Il porte des notes privees de MiKL (« anecdotes pour me souvenir
-- d'eux ») qui ne doivent jamais lui etre visibles — meme logique que client_notes.
CREATE POLICY client_contacts_select_operator ON client_contacts
  FOR SELECT
  USING (is_operator(operator_id));

CREATE POLICY client_contacts_insert_operator ON client_contacts
  FOR INSERT
  WITH CHECK (is_operator(operator_id));

CREATE POLICY client_contacts_update_operator ON client_contacts
  FOR UPDATE
  USING (is_operator(operator_id))
  WITH CHECK (is_operator(operator_id));

CREATE POLICY client_contacts_delete_operator ON client_contacts
  FOR DELETE
  USING (is_operator(operator_id));

-- ============================================================
-- `clients.contact` devient un MIROIR D'AFFICHAGE du carnet
--
-- La colonne est lue par l'en-tete de fiche, la liste des clients et l'export CSV
-- (`client-header.tsx`, `get-clients.ts`, `get-client.ts`). La laisser saisissable
-- a cote du carnet creerait exactement le doublon que MiKL signale lui-meme.
-- Elle n'est donc plus saisie nulle part : un trigger la tient a jour depuis le
-- carnet — UN SEUL ECRIVAIN, donc pas de divergence possible, et aucun des
-- lecteurs existants n'a besoin d'etre touche.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_sync_client_contact_label()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_label TEXT;
BEGIN
  v_client_id := COALESCE(NEW.client_id, OLD.client_id);

  -- Le nom affiche est celui du contact a faire figurer sur la facture s'il y en
  -- a un, sinon le plus ancien du carnet. L'ordre est deterministe (created_at,
  -- puis id) : sans ce depart, deux contacts crees dans la meme transaction
  -- feraient osciller l'affichage d'un rafraichissement a l'autre.
  SELECT full_name INTO v_label
  FROM client_contacts
  WHERE client_id = v_client_id
  ORDER BY show_on_invoice DESC, created_at ASC, id ASC
  LIMIT 1;

  UPDATE clients SET contact = v_label WHERE id = v_client_id;

  RETURN NULL;
END $$;

CREATE TRIGGER trg_client_contacts_sync_label
  AFTER INSERT OR UPDATE OR DELETE ON client_contacts
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_client_contact_label();

-- Reprise des donnees existantes : chaque `clients.contact` deja saisi devient le
-- premier contact du carnet. Sans adresse e-mail (la colonne n'en portait pas) et
-- SANS aucune case cochee : `clients.contact` etait documente « n'apparait JAMAIS
-- en facturation », on ne va pas le faire apparaitre a son insu.
INSERT INTO client_contacts (client_id, operator_id, full_name, note, receives_invoices, show_on_invoice)
SELECT c.id, c.operator_id, btrim(c.contact), 'Repris du champ « Nom du contact » de la fiche client (T-039).', false, false
FROM clients c
WHERE c.contact IS NOT NULL
  AND btrim(c.contact) <> ''
  AND NOT EXISTS (SELECT 1 FROM client_contacts cc WHERE cc.client_id = c.id);

COMMENT ON TABLE client_contacts IS
  'T-039 — carnet de contacts d''un client. Strictement operateur (notes privees). receives_invoices et show_on_invoice sont INDEPENDANTES : on peut afficher le nom du secretaire et envoyer a l''adresse de la comptable.';
COMMENT ON COLUMN client_contacts.receives_invoices IS
  'Envoyer la facture a cette adresse. Alimente le tableau `emails` du compte Pennylane. Exige un e-mail (contrainte CHECK).';
COMMENT ON COLUMN client_contacts.show_on_invoice IS
  'Faire figurer ce NOM sur la facture (mention « A l''attention de »). Independant de receives_invoices.';
COMMENT ON COLUMN clients.contact IS
  'T-039 — MIROIR D''AFFICHAGE du carnet `client_contacts`, tenu par le trigger trg_client_contacts_sync_label. NE PLUS ECRIRE DIRECTEMENT : la source de verite est le carnet.';
