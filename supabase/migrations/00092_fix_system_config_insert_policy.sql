-- Fix: add INSERT policy on system_config for operators
-- The upsert in configure-google-drive action requires INSERT permission
-- when a key doesn't exist yet in the table.

CREATE POLICY system_config_insert_operator ON system_config
  FOR INSERT WITH CHECK (is_operator());
