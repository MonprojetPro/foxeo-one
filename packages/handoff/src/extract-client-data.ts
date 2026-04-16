import type { SupabaseClient } from '@supabase/supabase-js';
import type { StepResult } from './types';

// Tables with client_id FK, in topological order (parents first)
const CLIENT_TABLES = [
  'clients',
  'client_configs',
  'consents',
  'parcours_instances',
  'step_submissions',
  'communication_profiles',
  'elio_configs',
  'elio_config_history',
  'client_notes',
  'messages',
  'documents',
  'document_folders',
  'support_tickets',
  'reminders',
  'meetings',
  'meeting_requests',
  'validation_requests',
  'user_preferences',
  'data_exports',
  'billing_sync',
  'notifications',
] as const;

export type ClientTable = (typeof CLIENT_TABLES)[number];

export interface ExtractedData {
  tables: Record<string, unknown[]>;
  counts: Record<string, number>;
}

export async function extractClientData(
  supabase: SupabaseClient,
  clientId: string
): Promise<StepResult<ExtractedData>> {
  const tables: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  try {
    for (const table of CLIENT_TABLES) {
      const filterColumn = table === 'clients' ? 'id' : 'client_id';

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq(filterColumn, clientId)
        .limit(100000);

      if (error) {
        return {
          success: false,
          error: `Extract failed on table "${table}": ${error.message}`,
        };
      }

      tables[table] = data ?? [];
      counts[table] = (data ?? []).length;
    }

    return {
      success: true,
      data: { tables, counts },
    };
  } catch (err) {
    return { success: false, error: `extractClientData error: ${String(err)}` };
  }
}

export function getClientTables(): readonly string[] {
  return CLIENT_TABLES;
}
