-- Migration: Create instance_transfers table + add transferred_at to client_instances
-- Story: 9.5b — Transfert instance One au client sortant

-- ============================================================
-- 1. Add transferred_at column to client_instances
-- ============================================================

ALTER TABLE client_instances
  ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;

COMMENT ON COLUMN client_instances.transferred_at IS 'Date de transfert de l''instance au client sortant';

-- ============================================================
-- 2. Create instance_transfers table
-- ============================================================

CREATE TABLE IF NOT EXISTS instance_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES client_instances(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
    DEFAULT 'pending',
  file_path TEXT,
  file_size_bytes BIGINT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_instance_transfers_client_id ON instance_transfers(client_id);
CREATE INDEX IF NOT EXISTS idx_instance_transfers_status ON instance_transfers(status);

COMMENT ON TABLE instance_transfers IS 'Tracking des transferts d''instances One vers les clients sortants';
COMMENT ON COLUMN instance_transfers.status IS 'pending → processing → completed | failed';
COMMENT ON COLUMN instance_transfers.file_path IS 'Chemin Supabase Storage vers le ZIP de transfert';

-- ============================================================
-- 3. RLS policies for instance_transfers
-- ============================================================

ALTER TABLE instance_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY instance_transfers_select_operator
  ON instance_transfers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = instance_transfers.client_id
        AND clients.operator_id IN (
          SELECT id FROM operators WHERE auth_user_id = auth.uid()
        )
    )
    OR is_admin()
  );

CREATE POLICY instance_transfers_insert_operator
  ON instance_transfers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = instance_transfers.client_id
        AND clients.operator_id IN (
          SELECT id FROM operators WHERE auth_user_id = auth.uid()
        )
    )
    OR is_admin()
  );

CREATE POLICY instance_transfers_update_system
  ON instance_transfers FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR is_admin()
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
    OR is_admin()
  );

-- ============================================================
-- 4. Create transfers storage bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('transfers', 'transfers', false)
ON CONFLICT (id) DO NOTHING;

-- Note: Cannot COMMENT ON storage.buckets (owned by supabase_admin)

-- RLS: Only service_role can insert (Edge Function)
CREATE POLICY transfers_insert_system
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'transfers'
    AND auth.jwt() ->> 'role' = 'service_role'
  );

-- RLS: Admin can read
CREATE POLICY transfers_select_admin
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'transfers'
    AND is_admin()
  );

-- RLS: Service role can delete (cleanup)
CREATE POLICY transfers_delete_system
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'transfers'
    AND auth.jwt() ->> 'role' = 'service_role'
  );
