import type { SupabaseProjectResult, StepResult } from '../types';

const SUPABASE_MGMT_API_BASE = 'https://api.supabase.com/v1';
const PROJECT_READY_POLL_INTERVAL_MS = 10_000;
const PROJECT_READY_POLL_TIMEOUT_MS = 300_000; // 5 minutes

export interface CreateSupabaseProjectInput {
  name: string;
  organizationId: string;
  region?: string;
  dbPassword: string;
}

export async function createSupabaseProject(
  token: string,
  input: CreateSupabaseProjectInput
): Promise<StepResult<SupabaseProjectResult>> {
  try {
    const res = await fetch(`${SUPABASE_MGMT_API_BASE}/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: input.name,
        organization_id: input.organizationId,
        region: input.region ?? 'eu-west-1',
        plan: 'free',
        db_pass: input.dbPassword,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 503) {
        return {
          success: false,
          error: `MANUAL_FALLBACK: Supabase Management API unavailable (${res.status}). Create project manually.`,
        };
      }
      return { success: false, error: `Supabase createProject failed (${res.status}): ${body}` };
    }

    const project = await res.json();
    const projectId = project.id;

    // Poll until project is ready
    const readyResult = await pollProjectReady(token, projectId);
    if (!readyResult.success) {
      return readyResult as StepResult<SupabaseProjectResult>;
    }

    // Get API keys
    const keysResult = await getProjectApiKeys(token, projectId);
    if (!keysResult.success) {
      return keysResult as StepResult<SupabaseProjectResult>;
    }

    const supabaseUrl = `https://${project.id}.supabase.co`;

    return {
      success: true,
      data: {
        projectUrl: `https://supabase.com/dashboard/project/${projectId}`,
        supabaseUrl,
        anonKey: keysResult.data!.anonKey,
        serviceRoleKey: keysResult.data!.serviceRoleKey,
      },
    };
  } catch (err) {
    return { success: false, error: `Supabase createProject error: ${String(err)}` };
  }
}

async function pollProjectReady(
  token: string,
  projectId: string
): Promise<StepResult<void>> {
  const startTime = Date.now();

  while (Date.now() - startTime < PROJECT_READY_POLL_TIMEOUT_MS) {
    try {
      const res = await fetch(`${SUPABASE_MGMT_API_BASE}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const project = await res.json();
        if (project.status === 'ACTIVE_HEALTHY') {
          return { success: true };
        }
      }
    } catch {
      // Retry on network error
    }

    await new Promise((resolve) => setTimeout(resolve, PROJECT_READY_POLL_INTERVAL_MS));
  }

  return { success: false, error: 'Supabase project provisioning timed out (5 min)' };
}

async function getProjectApiKeys(
  token: string,
  projectId: string
): Promise<StepResult<{ anonKey: string; serviceRoleKey: string }>> {
  try {
    const res = await fetch(`${SUPABASE_MGMT_API_BASE}/projects/${projectId}/api-keys`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `Supabase getApiKeys failed (${res.status}): ${body}` };
    }

    const keys: Array<{ name: string; api_key: string }> = await res.json();
    const anonKey = keys.find((k) => k.name === 'anon')?.api_key;
    const serviceRoleKey = keys.find((k) => k.name === 'service_role')?.api_key;

    if (!anonKey || !serviceRoleKey) {
      return { success: false, error: 'Supabase API keys not found in response' };
    }

    return { success: true, data: { anonKey, serviceRoleKey } };
  } catch (err) {
    return { success: false, error: `Supabase getApiKeys error: ${String(err)}` };
  }
}
