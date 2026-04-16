import type { VercelProjectResult, StepResult } from '../types';

const VERCEL_API_BASE = 'https://api.vercel.com';
const DEPLOYMENT_POLL_INTERVAL_MS = 5000;
const DEPLOYMENT_POLL_TIMEOUT_MS = 300_000; // 5 minutes

interface VercelEnvVar {
  key: string;
  value: string;
  target: ('production' | 'preview' | 'development')[];
  type: 'plain' | 'encrypted';
}

export async function createVercelProject(
  token: string,
  name: string,
  envVars: VercelEnvVar[]
): Promise<StepResult<VercelProjectResult>> {
  try {
    const res = await fetch(`${VERCEL_API_BASE}/v11/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        framework: 'nextjs',
        buildCommand: 'npm run build',
        outputDirectory: '.next',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `Vercel createProject failed (${res.status}): ${body}` };
    }

    const project = await res.json();

    // Set env vars
    for (const envVar of envVars) {
      const envRes = await fetch(`${VERCEL_API_BASE}/v10/projects/${project.id}/env`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(envVar),
      });

      if (!envRes.ok) {
        const body = await envRes.text();
        return { success: false, error: `Vercel setEnvVar "${envVar.key}" failed (${envRes.status}): ${body}` };
      }
    }

    return {
      success: true,
      data: {
        projectId: project.id,
        projectUrl: `https://vercel.com/${project.accountId}/${project.name}`,
      },
    };
  } catch (err) {
    return { success: false, error: `Vercel createProject error: ${String(err)}` };
  }
}

export async function connectGitRepo(
  token: string,
  projectId: string,
  repoFullName: string
): Promise<StepResult<void>> {
  try {
    const res = await fetch(`${VERCEL_API_BASE}/v9/projects/${projectId}/link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'github',
        repo: repoFullName,
        productionBranch: 'main',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `Vercel connectGitRepo failed (${res.status}): ${body}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: `Vercel connectGitRepo error: ${String(err)}` };
  }
}

export async function pollDeploymentStatus(
  token: string,
  projectId: string
): Promise<StepResult<string>> {
  const startTime = Date.now();

  while (Date.now() - startTime < DEPLOYMENT_POLL_TIMEOUT_MS) {
    try {
      const res = await fetch(
        `${VERCEL_API_BASE}/v6/deployments?projectId=${projectId}&limit=1&state=READY,ERROR`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.deployments?.length > 0) {
          const deployment = data.deployments[0];
          if (deployment.state === 'READY') {
            return { success: true, data: `https://${deployment.url}` };
          }
          if (deployment.state === 'ERROR') {
            return { success: false, error: `Deployment failed: ${deployment.url}` };
          }
        }
      }
    } catch {
      // Retry on network error
    }

    await new Promise((resolve) => setTimeout(resolve, DEPLOYMENT_POLL_INTERVAL_MS));
  }

  return { success: false, error: 'Deployment polling timed out (5 min)' };
}

export function buildHandoffEnvVars(
  supabaseUrl: string,
  supabaseAnonKey: string
): VercelEnvVar[] {
  return [
    {
      key: 'NEXT_PUBLIC_ENABLE_LAB_MODULE',
      value: 'false',
      target: ['production', 'preview'],
      type: 'plain',
    },
    {
      key: 'NEXT_PUBLIC_ENABLE_AGENTS',
      value: 'false',
      target: ['production', 'preview'],
      type: 'plain',
    },
    {
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      value: supabaseUrl,
      target: ['production', 'preview'],
      type: 'plain',
    },
    {
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      value: supabaseAnonKey,
      target: ['production', 'preview'],
      type: 'plain',
    },
  ];
}
