-- Migration: Create operators table
-- Story: 1.2 — Migrations Supabase fondation
-- Convention: snake_case, pluriel, TIMESTAMPTZ, gen_random_uuid()

CREATE TABLE operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator'
    CHECK (role IN ('operator', 'admin')),
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE operators IS 'Operateurs de la plateforme MonprojetPro (MiKL et futurs operateurs)';
COMMENT ON COLUMN operators.role IS 'operator = standard, admin = super-admin';
