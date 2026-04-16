import type { StepResult } from './types';
import { pushToRepo } from './clients/github-client';

interface BuildAndPushInput {
  githubToken: string;
  repoFullName: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  clientSlug: string;
}

export async function buildStandaloneAndPush(
  input: BuildAndPushInput
): Promise<StepResult<void>> {
  try {
    // Generate standalone configuration files
    const files = generateStandaloneFiles(input);

    // Push to GitHub via API
    const pushResult = await pushToRepo(input.githubToken, input.repoFullName, files);

    if (!pushResult.success) {
      return { success: false, error: pushResult.error };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: `buildStandaloneAndPush error: ${String(err)}` };
  }
}

function generateStandaloneFiles(
  input: BuildAndPushInput
): Array<{ path: string; content: string }> {
  return [
    {
      path: '.env.example',
      content: [
        'NEXT_PUBLIC_SUPABASE_URL=',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY=',
        'NEXT_PUBLIC_ENABLE_LAB_MODULE=false',
        'NEXT_PUBLIC_ENABLE_AGENTS=false',
        '',
      ].join('\n'),
    },
    {
      path: '.gitignore',
      content: [
        'node_modules/',
        '.next/',
        '.env*.local',
        '.vercel/',
        'dist/',
        '',
      ].join('\n'),
    },
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name: `monprojetpro-${input.clientSlug}`,
          version: '1.0.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
          },
          dependencies: {
            next: '^16.1.0',
            react: '^19.0.0',
            'react-dom': '^19.0.0',
            '@supabase/supabase-js': '^2.95.0',
            '@supabase/ssr': 'latest',
          },
          devDependencies: {
            typescript: '^5.7.0',
            '@types/react': '^19.0.0',
            '@types/react-dom': '^19.0.0',
          },
        },
        null,
        2
      ),
    },
    {
      path: 'README.md',
      content: [
        `# MonprojetPro — ${input.clientSlug}`,
        '',
        'Dashboard standalone généré par le kit de sortie MonprojetPro.',
        '',
        '## Démarrage',
        '',
        '```bash',
        'npm install',
        'npm run dev',
        '```',
        '',
        '## Configuration',
        '',
        'Copier `.env.example` en `.env.local` et remplir les valeurs Supabase.',
        '',
      ].join('\n'),
    },
  ];
}
