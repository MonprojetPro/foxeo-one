-- Optimisation perf : unindexed_foreign_keys
-- Index sur les clés étrangères non indexées (joins/cascades plus rapides). Purement additif.
create index if not exists idx_api_keys_client_id on public.api_keys (client_id);
create index if not exists idx_client_configs_operator_id on public.client_configs (operator_id);
create index if not exists idx_client_parcours_agents_elio_lab_agent_id on public.client_parcours_agents (elio_lab_agent_id);
create index if not exists idx_document_folders_parent_id on public.document_folders (parent_id);
create index if not exists idx_documents_folder_id on public.documents (folder_id);
create index if not exists idx_elio_config_history_changed_by on public.elio_config_history (changed_by);
create index if not exists idx_elio_token_usage_conversation_id on public.elio_token_usage (conversation_id);
create index if not exists idx_instance_transfers_instance_id on public.instance_transfers (instance_id);
create index if not exists idx_justificatif_uploads_uploaded_by on public.justificatif_uploads (uploaded_by);
create index if not exists idx_parcours_template_id on public.parcours (template_id);
create index if not exists idx_reminders_client_id on public.reminders (client_id);
