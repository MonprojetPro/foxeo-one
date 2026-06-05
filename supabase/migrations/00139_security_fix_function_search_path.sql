-- Sécurité : function_search_path_mutable
-- Fige search_path = public sur 12 fonctions (évite la résolution de schéma mutable).
-- Valeur "public" car toutes référencent des tables public non-qualifiées ;
-- les références auth.*/net.* y sont déjà schéma-qualifiées (non impactées).
alter function public.apply_client_module_config(uuid, text[]) set search_path = public;
alter function public.approve_validation_request(uuid, text, uuid, text, text) set search_path = public;
alter function public.create_parcours_steps_from_template(uuid, jsonb) set search_path = public;
alter function public.fn_get_operator_id() set search_path = public;
alter function public.fn_update_elio_conversation_timestamp() set search_path = public;
alter function public.fn_update_updated_at() set search_path = public;
alter function public.has_ia_consent(uuid) set search_path = public;
alter function public.inject_elio_questions(uuid, uuid, text, uuid) set search_path = public;
alter function public.inject_elio_roadmap(uuid, uuid, text) set search_path = public;
alter function public.log_elio_config_changes() set search_path = public;
alter function public.reject_validation_request(uuid, text, uuid) set search_path = public;
alter function public.trigger_send_email_on_notification() set search_path = public;
