-- Optimisation perf : auth_rls_initplan
-- Enveloppe auth.uid()/auth.role()/auth.jwt() dans (select ...) pour une évaluation
-- UNIQUE par requête au lieu d'une évaluation par ligne. Transformation strictement
-- sémantiquement identique (100 policies concernées au moment de la migration).
-- Appliquée en place via ALTER POLICY (aucune fenêtre sans policy).
do $$
declare
  r record;
  stmt text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        qual like '%auth.uid()%' or qual like '%auth.role()%' or qual like '%auth.jwt()%'
        or with_check like '%auth.uid()%' or with_check like '%auth.role()%' or with_check like '%auth.jwt()%'
      )
      -- garde anti double-wrap : on ne touche pas une policy déjà optimisée
      and coalesce(qual,'') not like '%(select auth.%'
      and coalesce(with_check,'') not like '%(select auth.%'
      and coalesce(qual,'') not like '%( SELECT auth.%'
      and coalesce(with_check,'') not like '%( SELECT auth.%'
  loop
    stmt := 'ALTER POLICY ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename)
      || case when r.qual is not null then ' USING ('
           || replace(replace(replace(r.qual,'auth.uid()','(select auth.uid())'),'auth.role()','(select auth.role())'),'auth.jwt()','(select auth.jwt())')
           || ')' else '' end
      || case when r.with_check is not null then ' WITH CHECK ('
           || replace(replace(replace(r.with_check,'auth.uid()','(select auth.uid())'),'auth.role()','(select auth.role())'),'auth.jwt()','(select auth.jwt())')
           || ')' else '' end;
    execute stmt;
  end loop;
end $$;
