-- Migration: Create data_exports table + exports storage bucket
-- Story: 9.5a — Export RGPD des données client

-- ============================================================
-- Table: data_exports
-- ============================================================

CREATE TABLE data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL CHECK (requested_by IN ('client', 'operator')),
  requester_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  file_path TEXT,
  file_size_bytes BIGINT,
  expires_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_data_exports_client_id ON data_exports(client_id);
CREATE INDEX idx_data_exports_status ON data_exports(status);
CREATE INDEX idx_data_exports_expires_at ON data_exports(expires_at) WHERE status = 'completed';

-- updated_at trigger
CREATE TRIGGER trg_data_exports_updated_at
  BEFORE UPDATE ON data_exports
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;

-- Client can see their own exports (only exports they requested)
CREATE POLICY "data_exports_select_owner"
  ON data_exports FOR SELECT
  USING (
    (requested_by = 'client' AND requester_id = auth.uid())
    OR
    (requested_by = 'operator' AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = data_exports.client_id
        AND clients.operator_id IN (
          SELECT id FROM operators WHERE auth_user_id = auth.uid()
        )
    ))
    OR is_admin()
  );

-- Authenticated users can insert (server action validates auth)
CREATE POLICY "data_exports_insert_authenticated"
  ON data_exports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only service role (Edge Functions) can update status
CREATE POLICY "data_exports_update_service"
  ON data_exports FOR UPDATE
  USING (
    is_admin()
    OR auth.jwt() ->> 'role' = 'service_role'
  );

COMMENT ON TABLE data_exports IS 'Tracks RGPD data export requests per client (Story 9.5a)';
COMMENT ON COLUMN data_exports.requested_by IS 'Who requested the export: client (self-service) or operator (on behalf)';
COMMENT ON COLUMN data_exports.requester_id IS 'auth.uid() for client exports, operators.id for operator exports';
COMMENT ON COLUMN data_exports.expires_at IS 'ZIP file expires after 7 days per RGPD minimal retention policy';

-- ============================================================
-- Storage: exports bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('exports', 'exports', false, 104857600) -- 100MB limit
ON CONFLICT (id) DO NOTHING;

-- Client can download their own export files (folder = client_id, not auth.uid())
-- Operator can download exports of their owned clients
CREATE POLICY "exports_select_owner"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'exports'
    AND (
      -- Client: folder name matches their client record id
      EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id::text = (storage.foldername(storage.objects.name))[1]
          AND clients.auth_user_id = auth.uid()
      )
      -- Operator: folder name matches a client they own
      OR EXISTS (
        SELECT 1 FROM clients
        JOIN operators ON operators.id = clients.operator_id
        WHERE clients.id::text = (storage.foldername(storage.objects.name))[1]
          AND operators.auth_user_id = auth.uid()
      )
      OR is_admin()
    )
  );

-- Only Edge Functions (service_role) can upload
CREATE POLICY "exports_insert_service"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'exports'
    AND (
      auth.jwt() ->> 'role' = 'service_role'
      OR is_admin()
    )
  );

-- Only Edge Functions (service_role) can delete
CREATE POLICY "exports_delete_service"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'exports'
    AND (
      auth.jwt() ->> 'role' = 'service_role'
      OR is_admin()
    )
  );
