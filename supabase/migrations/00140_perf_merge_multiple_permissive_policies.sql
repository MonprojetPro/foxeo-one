-- Optimisation perf : multiple_permissive_policies
-- Fusionne les policies PERMISSIVE redondantes (même table, même cmd, mêmes roles) en UNE
-- policy <table>_<cmd>_merged dont la condition est le OR des conditions d'origine.
-- Strictement équivalent (Postgres OR déjà les policies permissives entre elles).
-- WITH CHECK fusionné via coalesce(with_check, qual) pour préserver le contrôle de nouvelle
-- ligne des policies sans WITH CHECK explicite. Chevauchements inter-rôles laissés intacts.
-- Isolation multi-tenant vérifiée par test d'impersonation (rôle authenticated + JWT client).
--
-- Phase 1 : construit toutes les instructions dans un tableau (lecture pure de pg_policies).
-- Phase 2 : exécute (aucune mutation du catalogue pendant la lecture → pas d'effet d'itération).
do $$
declare
  rec record;
  s text;
  allstmts text[] := array[]::text[];
begin
  for rec in
    select tablename, cmd,
      regexp_replace(roles::text, '[{}]', '', 'g') as roles_list,
      array_agg(policyname order by policyname) as names,
      string_agg('(' || qual || ')', ' OR ') filter (where qual is not null) as using_expr,
      string_agg('(' || coalesce(with_check, qual) || ')', ' OR ') filter (where coalesce(with_check, qual) is not null) as check_expr
    from pg_policies
    where schemaname = 'public' and permissive = 'PERMISSIVE'
    group by tablename, cmd, roles
    having count(*) > 1
  loop
    foreach s in array rec.names loop
      allstmts := allstmts || ('DROP POLICY IF EXISTS ' || quote_ident(s) || ' ON public.' || quote_ident(rec.tablename));
    end loop;
    allstmts := allstmts || ('DROP POLICY IF EXISTS ' || quote_ident(rec.tablename || '_' || lower(rec.cmd) || '_merged') || ' ON public.' || quote_ident(rec.tablename));
    allstmts := allstmts || (
      'CREATE POLICY ' || quote_ident(rec.tablename || '_' || lower(rec.cmd) || '_merged') || ' ON public.' || quote_ident(rec.tablename)
      || ' AS PERMISSIVE FOR ' || rec.cmd || ' TO ' || rec.roles_list
      || case when rec.cmd in ('SELECT','UPDATE','DELETE') and rec.using_expr is not null then ' USING (' || rec.using_expr || ')' else '' end
      || case when rec.cmd in ('INSERT','UPDATE') and rec.check_expr is not null then ' WITH CHECK (' || rec.check_expr || ')' else '' end
    );
  end loop;

  foreach s in array allstmts loop
    execute s;
  end loop;
end $$;
