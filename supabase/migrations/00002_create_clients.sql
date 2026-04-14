-- Migration: Create clients table
-- Story: 1.2 — Migrations Supabase fondation
-- Convention: snake_case, pluriel, FK {table_singulier}_id, idx_{table}_{colonnes}

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  contact TEXT,
  sector TEXT,
  client_type TEXT NOT NULL
    CHECK (client_type IN ('complet', 'direct_one', 'ponctuel')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'archived')),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_operator_id ON clients(operator_id);
CREATE INDEX idx_clients_auth_user_id ON clients(auth_user_id);

COMMENT ON TABLE clients IS 'Clients geres par les operateurs MonprojetPro';
COMMENT ON COLUMN clients.client_type IS 'complet = Lab+One, direct_one = One seul, ponctuel = mission ponctuelle';
COMMENT ON COLUMN clients.status IS 'active = actif, suspended = suspendu, archived = archive';
COMMENT ON COLUMN clients.auth_user_id IS 'Lien vers auth.users de Supabase Auth';
