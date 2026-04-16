-- Story 13.5: Vue analytics catalogue modules
-- Agregation pre-calculee pour limiter les round-trips

CREATE OR REPLACE VIEW v_module_catalog_analytics AS
SELECT
  mc.id,
  mc.module_key,
  mc.name,
  mc.kind,
  mc.category,
  mc.setup_price_ht,
  mc.monthly_price_ht,
  mc.is_default,
  mc.is_active,
  COUNT(DISTINCT cc.client_id) FILTER (
    WHERE mc.module_key = ANY(cc.active_modules)
  ) AS active_clients_count,
  -- Revenue setup = one-time (total cumule des clients actifs)
  COALESCE(mc.setup_price_ht, 0)
    * COUNT(DISTINCT cc.client_id) FILTER (WHERE mc.module_key = ANY(cc.active_modules))
  AS total_setup_revenue,
  -- Revenue recurrent = mensuel × 12 × nb clients
  COALESCE(mc.monthly_price_ht, 0) * 12
    * COUNT(DISTINCT cc.client_id) FILTER (WHERE mc.module_key = ANY(cc.active_modules))
  AS estimated_yearly_recurring_revenue,
  -- Revenue premiere annee = setup + recurrent (pour comparaison rapide)
  (COALESCE(mc.setup_price_ht, 0) + COALESCE(mc.monthly_price_ht, 0) * 12)
    * COUNT(DISTINCT cc.client_id) FILTER (WHERE mc.module_key = ANY(cc.active_modules))
  AS estimated_first_year_revenue
FROM module_catalog mc
LEFT JOIN client_configs cc ON true
GROUP BY mc.id, mc.module_key, mc.name, mc.kind, mc.category,
         mc.setup_price_ht, mc.monthly_price_ht, mc.is_default, mc.is_active;

-- RLS sur la vue via la table source (module_catalog a deja RLS operator)
