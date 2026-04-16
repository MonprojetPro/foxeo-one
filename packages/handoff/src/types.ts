export type HandoffType = 'subscription_cancelled' | 'one_shot';

export type HandoffStatus =
  | 'pending'
  | 'vercel_provisioning'
  | 'github_provisioning'
  | 'supabase_provisioning'
  | 'data_migration'
  | 'build_push'
  | 'deployment'
  | 'finalizing'
  | 'completed'
  | 'failed';

export type HandoffStep =
  | 'vercel'
  | 'github'
  | 'supabase'
  | 'data_migration'
  | 'build_push'
  | 'deployment'
  | 'finalize';

export interface HandoffRecord {
  id: string;
  client_id: string;
  handoff_type: HandoffType;
  status: HandoffStatus;
  current_step: HandoffStep | null;
  vercel_project_id: string | null;
  github_repo_url: string | null;
  supabase_project_url: string | null;
  supabase_url: string | null;
  supabase_anon_key: string | null;
  supabase_service_role_key: string | null;
  error_log: ErrorLogEntry[];
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ErrorLogEntry {
  step: HandoffStep;
  error: string;
  timestamp: string;
}

export interface HandoffInput {
  clientId: string;
  slug: string;
  handoffType: HandoffType;
  orgName?: string;
}

export interface VercelProjectResult {
  projectId: string;
  projectUrl: string;
}

export interface GitHubRepoResult {
  repoUrl: string;
  cloneUrl: string;
}

export interface SupabaseProjectResult {
  projectUrl: string;
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
}

export interface HandoffCredentials {
  vercel: VercelProjectResult;
  github: GitHubRepoResult;
  supabase: SupabaseProjectResult;
  deploymentUrl: string;
}

export interface StepResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
