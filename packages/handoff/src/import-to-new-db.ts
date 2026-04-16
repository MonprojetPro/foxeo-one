import type { SupabaseClient } from '@supabase/supabase-js';
import type { StepResult } from './types';
import type { ExtractedData, ClientTable } from './extract-client-data';
import { getClientTables } from './extract-client-data';

const BATCH_SIZE = 500;

export async function importToNewDb(
  targetSupabase: SupabaseClient,
  extractedData: ExtractedData
): Promise<StepResult<{ importedCounts: Record<string, number> }>> {
  const importedCounts: Record<string, number> = {};

  try {
    const tables = getClientTables();

    for (const table of tables) {
      const rows = extractedData.tables[table];
      if (!rows || rows.length === 0) {
        importedCounts[table] = 0;
        continue;
      }

      // Batch insert
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await targetSupabase.from(table).insert(batch);

        if (error) {
          return {
            success: false,
            error: `Import failed on table "${table}" (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${error.message}`,
          };
        }
      }

      importedCounts[table] = rows.length;
    }

    // Verify integrity
    const integrityResult = await verifyIntegrity(targetSupabase, extractedData.counts);
    if (!integrityResult.success) {
      return integrityResult as StepResult<{ importedCounts: Record<string, number> }>;
    }

    return { success: true, data: { importedCounts } };
  } catch (err) {
    return { success: false, error: `importToNewDb error: ${String(err)}` };
  }
}

async function verifyIntegrity(
  targetSupabase: SupabaseClient,
  expectedCounts: Record<string, number>
): Promise<StepResult<void>> {
  const mismatches: string[] = [];

  for (const [table, expectedCount] of Object.entries(expectedCounts)) {
    if (expectedCount === 0) continue;

    const { count, error } = await targetSupabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      mismatches.push(`${table}: query error — ${error.message}`);
      continue;
    }

    if (count !== expectedCount) {
      mismatches.push(`${table}: expected ${expectedCount}, got ${count}`);
    }
  }

  if (mismatches.length > 0) {
    return {
      success: false,
      error: `Integrity check failed:\n${mismatches.join('\n')}`,
    };
  }

  return { success: true };
}
