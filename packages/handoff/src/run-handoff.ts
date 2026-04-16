import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  HandoffInput,
  HandoffRecord,
  HandoffStep,
  HandoffStatus,
  HandoffCredentials,
  StepResult,
  ErrorLogEntry,
} from './types';
import { createVercelProject, connectGitRepo, pollDeploymentStatus, buildHandoffEnvVars } from './clients/vercel-client';
import { createGitHubRepo } from './clients/github-client';
import { createSupabaseProject } from './clients/supabase-management-client';
import { extractClientData } from './extract-client-data';
import { importToNewDb } from './import-to-new-db';
import { buildStandaloneAndPush } from './build-standalone-and-push';
import { createClient } from '@supabase/supabase-js';

const STEPS: HandoffStep[] = [
  'vercel',
  'github',
  'supabase',
  'data_migration',
  'build_push',
  'deployment',
  'finalize',
];

const STEP_TO_STATUS: Record<HandoffStep, HandoffStatus> = {
  vercel: 'vercel_provisioning',
  github: 'github_provisioning',
  supabase: 'supabase_provisioning',
  data_migration: 'data_migration',
  build_push: 'build_push',
  deployment: 'deployment',
  finalize: 'finalizing',
};

interface HandoffTokens {
  vercelApiToken: string;
  githubPat: string;
  supabaseManagementToken: string;
  supabaseOrgId: string;
  githubOrg: string;
}

export async function runHandoff(
  supabase: SupabaseClient,
  input: HandoffInput,
  tokens: HandoffTokens,
  resumeFromStep?: HandoffStep
): Promise<StepResult<HandoffCredentials>> {
  // Create or get handoff record
  let handoffId: string;

  if (resumeFromStep) {
    const { data: existing } = await supabase
      .from('client_handoffs')
      .select('id')
      .eq('client_id', input.clientId)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!existing) {
      return { success: false, error: 'No failed handoff found to resume' };
    }
    handoffId = existing.id;
  } else {
    const { data: newHandoff, error } = await supabase
      .from('client_handoffs')
      .insert({
        client_id: input.clientId,
        handoff_type: input.handoffType,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !newHandoff) {
      return { success: false, error: `Failed to create handoff record: ${error?.message}` };
    }
    handoffId = newHandoff.id;
  }

  const projectName = `monprojetpro-${input.slug}`;
  const repoFullName = `${tokens.githubOrg}/${projectName}`;

  // Determine starting step
  const startIdx = resumeFromStep ? STEPS.indexOf(resumeFromStep) : 0;
  if (startIdx === -1) {
    return { success: false, error: `Invalid resume step: ${resumeFromStep}` };
  }

  // Load existing handoff state for resume
  let handoffState: Partial<HandoffRecord> = {};
  if (resumeFromStep) {
    const { data } = await supabase
      .from('client_handoffs')
      .select('*')
      .eq('id', handoffId)
      .single();
    if (data) handoffState = data;
  }

  let vercelProjectId = handoffState.vercel_project_id ?? '';
  let githubRepoUrl = handoffState.github_repo_url ?? '';
  let supabaseUrl = handoffState.supabase_url ?? '';
  let supabaseAnonKey = handoffState.supabase_anon_key ?? '';
  let supabaseServiceRoleKey = handoffState.supabase_service_role_key ?? '';
  let supabaseProjectUrl = handoffState.supabase_project_url ?? '';
  let deploymentUrl = '';

  for (let i = startIdx; i < STEPS.length; i++) {
    const step = STEPS[i];

    await updateHandoffStatus(supabase, handoffId, STEP_TO_STATUS[step], step);

    const stepResult = await executeStep(step, {
      supabase,
      input,
      tokens,
      projectName,
      repoFullName,
      vercelProjectId,
      githubRepoUrl,
      supabaseUrl,
      supabaseAnonKey,
      supabaseServiceRoleKey,
      handoffId,
    });

    if (!stepResult.success) {
      await logError(supabase, handoffId, step, stepResult.error!);
      await updateHandoffStatus(supabase, handoffId, 'failed', step);
      return { success: false, error: `Step "${step}" failed: ${stepResult.error}` };
    }

    // Capture step outputs
    const stepData = stepResult.data as Record<string, string> | undefined;
    if (stepData) {
      if (stepData.vercelProjectId) vercelProjectId = stepData.vercelProjectId;
      if (stepData.githubRepoUrl) githubRepoUrl = stepData.githubRepoUrl;
      if (stepData.supabaseUrl) supabaseUrl = stepData.supabaseUrl;
      if (stepData.supabaseAnonKey) supabaseAnonKey = stepData.supabaseAnonKey;
      if (stepData.supabaseServiceRoleKey) supabaseServiceRoleKey = stepData.supabaseServiceRoleKey;
      if (stepData.supabaseProjectUrl) supabaseProjectUrl = stepData.supabaseProjectUrl;
      if (stepData.deploymentUrl) deploymentUrl = stepData.deploymentUrl;
    }

    // Persist step results
    await supabase.from('client_handoffs').update({
      vercel_project_id: vercelProjectId || null,
      github_repo_url: githubRepoUrl || null,
      supabase_project_url: supabaseProjectUrl || null,
      supabase_url: supabaseUrl || null,
      supabase_anon_key: supabaseAnonKey || null,
      supabase_service_role_key: supabaseServiceRoleKey || null,
    }).eq('id', handoffId);
  }

  // Mark completed
  await updateHandoffStatus(supabase, handoffId, 'completed', null);
  await supabase.from('client_handoffs').update({ completed_at: new Date().toISOString() }).eq('id', handoffId);

  // Update client status
  await supabase.from('clients').update({ status: 'handed_off' }).eq('id', input.clientId);

  return {
    success: true,
    data: {
      vercel: { projectId: vercelProjectId, projectUrl: '' },
      github: { repoUrl: githubRepoUrl, cloneUrl: '' },
      supabase: {
        projectUrl: supabaseProjectUrl,
        supabaseUrl,
        anonKey: supabaseAnonKey,
        serviceRoleKey: supabaseServiceRoleKey,
      },
      deploymentUrl,
    },
  };
}

interface StepContext {
  supabase: SupabaseClient;
  input: HandoffInput;
  tokens: HandoffTokens;
  projectName: string;
  repoFullName: string;
  vercelProjectId: string;
  githubRepoUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  handoffId: string;
}

async function executeStep(
  step: HandoffStep,
  ctx: StepContext
): Promise<StepResult<Record<string, string>>> {
  switch (step) {
    case 'vercel': {
      // Create Vercel project (env vars set later when Supabase creds are known)
      const result = await createVercelProject(ctx.tokens.vercelApiToken, ctx.projectName, []);
      if (!result.success) return { success: false, error: result.error };
      return { success: true, data: { vercelProjectId: result.data!.projectId } };
    }

    case 'github': {
      const result = await createGitHubRepo(
        ctx.tokens.githubPat,
        ctx.tokens.githubOrg,
        ctx.projectName
      );
      if (!result.success) return { success: false, error: result.error };
      return { success: true, data: { githubRepoUrl: result.data!.repoUrl } };
    }

    case 'supabase': {
      const dbPassword = generateDbPassword();
      const result = await createSupabaseProject(ctx.tokens.supabaseManagementToken, {
        name: ctx.projectName,
        organizationId: ctx.tokens.supabaseOrgId,
        dbPassword,
      });

      if (!result.success) {
        if (result.error?.startsWith('MANUAL_FALLBACK')) {
          return { success: false, error: result.error };
        }
        return { success: false, error: result.error };
      }

      return {
        success: true,
        data: {
          supabaseProjectUrl: result.data!.projectUrl,
          supabaseUrl: result.data!.supabaseUrl,
          supabaseAnonKey: result.data!.anonKey,
          supabaseServiceRoleKey: result.data!.serviceRoleKey,
        },
      };
    }

    case 'data_migration': {
      // Extract from multi-tenant
      const extractResult = await extractClientData(ctx.supabase, ctx.input.clientId);
      if (!extractResult.success) return { success: false, error: extractResult.error };

      // Import to new Supabase
      const targetSupabase = createClient(ctx.supabaseUrl, ctx.supabaseServiceRoleKey);
      const importResult = await importToNewDb(targetSupabase, extractResult.data!);
      if (!importResult.success) return { success: false, error: importResult.error };

      return { success: true, data: {} };
    }

    case 'build_push': {
      const result = await buildStandaloneAndPush({
        githubToken: ctx.tokens.githubPat,
        repoFullName: ctx.repoFullName,
        supabaseUrl: ctx.supabaseUrl,
        supabaseAnonKey: ctx.supabaseAnonKey,
        clientSlug: ctx.input.slug,
      });
      if (!result.success) return { success: false, error: result.error };
      return { success: true, data: {} };
    }

    case 'deployment': {
      // Connect Vercel to GitHub + set env vars
      const envVars = buildHandoffEnvVars(ctx.supabaseUrl, ctx.supabaseAnonKey);
      for (const envVar of envVars) {
        const envRes = await fetch(`https://api.vercel.com/v10/projects/${ctx.vercelProjectId}/env`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ctx.tokens.vercelApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(envVar),
        });
        if (!envRes.ok) {
          const body = await envRes.text();
          return { success: false, error: `Vercel setEnvVar "${envVar.key}" failed (${envRes.status}): ${body}` };
        }
      }

      const connectResult = await connectGitRepo(
        ctx.tokens.vercelApiToken,
        ctx.vercelProjectId,
        ctx.repoFullName
      );
      if (!connectResult.success) return { success: false, error: connectResult.error };

      // Poll for deployment
      const pollResult = await pollDeploymentStatus(ctx.tokens.vercelApiToken, ctx.vercelProjectId);
      if (!pollResult.success) return { success: false, error: pollResult.error };

      return { success: true, data: { deploymentUrl: pollResult.data! } };
    }

    case 'finalize': {
      // Finalize step is handled by the caller (credentials generation)
      return { success: true, data: {} };
    }
  }
}

async function updateHandoffStatus(
  supabase: SupabaseClient,
  handoffId: string,
  status: HandoffStatus,
  currentStep: HandoffStep | null
): Promise<void> {
  await supabase.from('client_handoffs').update({
    status,
    current_step: currentStep,
  }).eq('id', handoffId);
}

async function logError(
  supabase: SupabaseClient,
  handoffId: string,
  step: HandoffStep,
  error: string
): Promise<void> {
  const { data: handoff } = await supabase
    .from('client_handoffs')
    .select('error_log')
    .eq('id', handoffId)
    .single();

  const errorLog: ErrorLogEntry[] = (handoff?.error_log as ErrorLogEntry[]) ?? [];
  errorLog.push({ step, error, timestamp: new Date().toISOString() });

  await supabase.from('client_handoffs').update({ error_log: errorLog }).eq('id', handoffId);
}

function generateDbPassword(): string {
  const { randomBytes } = require('node:crypto');
  return randomBytes(24).toString('base64url');
}

export function generateCredentialsJson(
  slug: string,
  credentials: HandoffCredentials
): string {
  return JSON.stringify(
    {
      client: slug,
      generatedAt: new Date().toISOString(),
      vercel: {
        projectUrl: credentials.vercel.projectUrl,
        deploymentUrl: credentials.deploymentUrl,
      },
      github: {
        repoUrl: credentials.github.repoUrl,
      },
      supabase: {
        dashboardUrl: credentials.supabase.projectUrl,
        apiUrl: credentials.supabase.supabaseUrl,
        anonKey: credentials.supabase.anonKey,
        serviceRoleKey: credentials.supabase.serviceRoleKey,
      },
    },
    null,
    2
  );
}

export function generateEmailDraft(slug: string, deploymentUrl: string): string {
  return `# Email de remise — ${slug}

Objet : Votre dashboard MonprojetPro est prêt

---

Bonjour,

Votre dashboard MonprojetPro est désormais disponible en tant que produit autonome.

**Accès :**
- URL de votre dashboard : ${deploymentUrl}

Vous trouverez ci-joint le dossier technique contenant vos accès Vercel, GitHub et Supabase. Ces accès vous permettent de gérer et faire évoluer votre dashboard de manière indépendante.

**Prochaines étapes :**
1. Vérifiez que votre dashboard fonctionne correctement
2. Changez les mots de passe des comptes transmis
3. Configurez vos propres domaines si souhaité

N'hésitez pas à nous contacter pour toute question.

Cordialement,
L'équipe MonprojetPro
`;
}

export function generateTransferChecklist(slug: string): string {
  return `# Checklist de transfert — ${slug}

## Transferts manuels à effectuer par MiKL

### 1. Vercel — Transfert de propriété
- [ ] Aller dans le projet Vercel \`monprojetpro-${slug}\`
- [ ] Settings → General → Transfer Project
- [ ] Entrer l'email du client
- [ ] Le client accepte l'invitation

### 2. GitHub — Transfert du repository
- [ ] Aller dans le repo \`monprojetpro-${slug}\`
- [ ] Settings → General → Danger Zone → Transfer ownership
- [ ] Entrer le username GitHub du client
- [ ] Confirmer le transfert

### 3. Supabase — Transfert de l'organisation
- [ ] Aller dans le projet Supabase \`monprojetpro-${slug}\`
- [ ] Settings → General → Transfer project
- [ ] Inviter le client comme Owner
- [ ] Le client accepte et prend la propriété

### 4. Post-transfert
- [ ] Vérifier que le client a bien accès à tous les services
- [ ] Supprimer les tokens MiKL du projet transféré
- [ ] Marquer le handoff comme finalisé dans le Hub
`;
}
