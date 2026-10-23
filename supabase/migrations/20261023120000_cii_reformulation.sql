-- Migration: 20261023120000_cii_reformulation.sql
-- T-062 (volet reformulation) — assistant de reformulation CII decrit par MiKL
-- le 20-10 : upload d'un fichier listant des fonctions dev (avec leur temps,
-- fourni directement dans le fichier — jamais estime par l'IA), reformulation
-- au format officiel CII (Action+Innovation+Technologie+Benefice), relecture
-- ligne par ligne, puis transfert vers un devis ou une facture existants.

CREATE TABLE cii_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  client_project_id UUID REFERENCES client_projects(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  raw_content TEXT NOT NULL,
  -- TJM en euros (pas en centimes — convention LineItem.unitPrice de facturation).
  -- Fixe a 300 par defaut, mais explicitement corrigible par MiKL (demande du 23-10).
  tjm_euros NUMERIC(10, 2) NOT NULL DEFAULT 300,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cii_imports IS 'T-062 — Un fichier uploade par MiKL (liste de fonctions dev), rattache a un client et optionnellement a un projet (client_projects). Porte le TJM applique a toutes ses lignes.';

CREATE INDEX idx_cii_imports_client ON cii_imports(client_id);

CREATE TABLE cii_reformulation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES cii_imports(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  -- Nom brut tel que lu dans le fichier uploade.
  function_name TEXT NOT NULL,
  -- Temps tel qu'ecrit dans le fichier (ex. "2h", "1.5j") — garde pour tracabilite.
  time_raw TEXT,
  -- Equivalent en jours, utilise pour le calcul (temps_jours * tjm_euros). NULL si
  -- le fichier ne portait aucun temps exploitable pour cette ligne — MiKL corrige
  -- alors manuellement avant validation (jamais d'estimation IA, cf. decision du 23-10).
  time_days NUMERIC(6, 2),
  -- Reformulation au format CII (Action+Innovation+Technologie+Benefice). NULL avant
  -- generation IA ; toujours corrigible par MiKL ensuite.
  reformulated_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reformulated', 'validated', 'transferred')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cii_reformulation_lines IS 'T-062 — Une ligne par fonction dev importee. time_days et reformulated_text sont toujours modifiables par MiKL avant transfert vers un devis/facture.';

CREATE INDEX idx_cii_lines_import ON cii_reformulation_lines(import_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Fonctionnalite interne au Hub, comme client_projects (T-063) : seul
-- l'operateur y a acces, aucune policy "owner" cote client.

ALTER TABLE cii_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY cii_imports_select_operator ON cii_imports
  FOR SELECT USING (is_operator());

CREATE POLICY cii_imports_insert_operator ON cii_imports
  FOR INSERT WITH CHECK (is_operator());

CREATE POLICY cii_imports_update_operator ON cii_imports
  FOR UPDATE USING (is_operator()) WITH CHECK (is_operator());

CREATE POLICY cii_imports_delete_operator ON cii_imports
  FOR DELETE USING (is_operator());

ALTER TABLE cii_reformulation_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY cii_lines_select_operator ON cii_reformulation_lines
  FOR SELECT USING (is_operator());

CREATE POLICY cii_lines_insert_operator ON cii_reformulation_lines
  FOR INSERT WITH CHECK (is_operator());

CREATE POLICY cii_lines_update_operator ON cii_reformulation_lines
  FOR UPDATE USING (is_operator()) WITH CHECK (is_operator());

CREATE POLICY cii_lines_delete_operator ON cii_reformulation_lines
  FOR DELETE USING (is_operator());

-- ── Realtime ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cii_imports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cii_imports;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cii_reformulation_lines'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cii_reformulation_lines;
  END IF;
END $$;

ALTER TABLE cii_imports REPLICA IDENTITY FULL;
ALTER TABLE cii_reformulation_lines REPLICA IDENTITY FULL;
