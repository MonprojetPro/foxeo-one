-- Migration 00069: Add monitoring fields to client_instances
-- Story 12.7: Monitoring instances One — usage, seuils & alertes

ALTER TABLE client_instances ADD COLUMN IF NOT EXISTS usage_metrics JSONB DEFAULT '{}';
ALTER TABLE client_instances ADD COLUMN IF NOT EXISTS alert_level TEXT DEFAULT 'none'
  CHECK (alert_level IN ('none', 'info', 'warning', 'critical'));
ALTER TABLE client_instances ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ;

-- Index pour filtrage par alert_level (tableau de bord)
CREATE INDEX IF NOT EXISTS idx_client_instances_alert_level
  ON client_instances(alert_level)
  WHERE status = 'active';

COMMENT ON COLUMN client_instances.usage_metrics IS 'Métriques usage courantes: dbRows, storageUsedMb, bandwidthUsedGb, edgeFunctionCalls';
COMMENT ON COLUMN client_instances.alert_level IS 'Niveau d''alerte calculé: none | info | warning | critical';
COMMENT ON COLUMN client_instances.last_health_check IS 'Horodatage du dernier health check par le cron';
