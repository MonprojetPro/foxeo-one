-- Rewrite trigger_send_email_on_notification : self-contained, sans app.settings.
-- Contexte : app.settings.edge_function_url / service_role_key étaient NULL en prod
-- et ALTER DATABASE est refusé via le MCP. On rend la fonction autonome :
-- URL + clé anon (publique) en dur. send-email a verify_jwt=true (anon accepté)
-- et utilise sa propre SERVICE_ROLE_KEY interne pour la DB — évite de stocker
-- le vrai secret service_role dans un GUC lisible.
CREATE OR REPLACE FUNCTION public.trigger_send_email_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  edge_url TEXT := 'https://mpgpwcpeqfwknohhqdmd.supabase.co/functions/v1/send-email';
  bearer   TEXT := 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZ3B3Y3BlcWZ3a25vaGhxZG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTY2NTEsImV4cCI6MjA4ODczMjY1MX0.s1qgsw_duwUyiajUnNu09uaYF3Wm0fAbg8wPzC24n_k';
BEGIN
  PERFORM net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', bearer
    ),
    body := jsonb_build_object('notificationId', NEW.id)
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[EMAIL:TRIGGER] pg_net failed for notification %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
