# Module Analytics — Flows

## Flow principal : consultation du dashboard

```
MiKL ouvre /modules/analytics
  → loading.tsx affiche skeletons
  → page.tsx (RSC) rend AnalyticsDashboard
    → useAnalytics('30d') lance TanStack Query
      → Promise.all([ getOverviewStats, getModuleUsageStats, getElioStats, getEngagementStats, getMrrStats ])
        → Chaque Server Action vérifie is_operator()
        → Requêtes sur activity_logs WHERE created_at > since LIMIT 10000
        → Agrégation JS côté serveur
      → Cache 5 minutes
    → Dashboard se remplit avec MetricCard, BarChart
```

## Flow : changement de période

```
Clic bouton "7j"/"30j"/"90j"/"1an"
  → setPeriod(newPeriod) [état local]
  → useAnalytics(newPeriod) relance la query (nouvelle queryKey)
  → Si non en cache → nouvelles requêtes Supabase
  → Dashboard se met à jour
```
