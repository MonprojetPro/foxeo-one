-- Migration: 00054_subscription_tier.sql
-- Story 9.4: Changement de tier abonnement client One
-- Adds subscription_tier, tier_changed_at, pending_billing_update, elio_proactive_alerts to client_configs

-- 1. Add subscription_tier (Base / Essentiel / Agentique)
ALTER TABLE client_configs
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'base'
    CHECK (subscription_tier IN ('base', 'essentiel', 'agentique'));

COMMENT ON COLUMN client_configs.subscription_tier IS 'Tier abonnement One : base (ponctuel), essentiel (49€/mois), agentique (99€/mois). Défaut : base.';

CREATE INDEX IF NOT EXISTS idx_client_configs_subscription_tier ON client_configs(subscription_tier);

-- 2. Add tier_changed_at (timestamp of last tier change)
ALTER TABLE client_configs
  ADD COLUMN IF NOT EXISTS tier_changed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN client_configs.tier_changed_at IS 'Date du dernier changement de tier abonnement.';

-- 3. Add pending_billing_update (flag for Epic 11 — Pennylane/Stripe sync)
ALTER TABLE client_configs
  ADD COLUMN IF NOT EXISTS pending_billing_update BOOLEAN DEFAULT false;

COMMENT ON COLUMN client_configs.pending_billing_update IS 'Flag indiquant qu''une mise à jour de facturation est en attente (Epic 11 — Pennylane/Stripe). Positionné à true lors de tout changement de tier.';

-- 4. Add elio_proactive_alerts boolean (enabled/disabled for One+ tier)
ALTER TABLE client_configs
  ADD COLUMN IF NOT EXISTS elio_proactive_alerts BOOLEAN DEFAULT false;

COMMENT ON COLUMN client_configs.elio_proactive_alerts IS 'Alertes proactives Élio One+ activées (true) ou désactivées (false). Activé automatiquement lors du passage en tier Agentique.';

-- 5. Extend activity_logs action to include 'tier_changed'
-- (No constraint change needed — action column is TEXT without enum constraint)
