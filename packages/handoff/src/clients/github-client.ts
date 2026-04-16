import type { GitHubRepoResult, StepResult } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

export async function createGitHubRepo(
  token: string,
  org: string,
  name: string
): Promise<StepResult<GitHubRepoResult>> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/orgs/${org}/repos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        name,
        private: true,
        auto_init: false,
        description: `MonprojetPro standalone — ${name}`,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `GitHub createRepo failed (${res.status}): ${body}` };
    }

    const repo = await res.json();
    return {
      success: true,
      data: {
        repoUrl: repo.html_url,
        cloneUrl: repo.clone_url,
      },
    };
  } catch (err) {
    return { success: false, error: `GitHub createRepo error: ${String(err)}` };
  }
}

export async function pushToRepo(
  token: string,
  repoFullName: string,
  files: Array<{ path: string; content: string }>
): Promise<StepResult<void>> {
  try {
    // Create initial commit via GitHub API (tree + commit + ref)
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // 1. Create blobs
    const blobShas: Array<{ path: string; sha: string }> = [];
    for (const file of files) {
      const blobRes = await fetch(`${GITHUB_API_BASE}/repos/${repoFullName}/git/blobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: file.content,
          encoding: 'utf-8',
        }),
      });

      if (!blobRes.ok) {
        const body = await blobRes.text();
        return { success: false, error: `GitHub createBlob failed for ${file.path}: ${body}` };
      }

      const blob = await blobRes.json();
      blobShas.push({ path: file.path, sha: blob.sha });
    }

    // 2. Create tree
    const treeRes = await fetch(`${GITHUB_API_BASE}/repos/${repoFullName}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tree: blobShas.map((b) => ({
          path: b.path,
          mode: '100644',
          type: 'blob',
          sha: b.sha,
        })),
      }),
    });

    if (!treeRes.ok) {
      const body = await treeRes.text();
      return { success: false, error: `GitHub createTree failed: ${body}` };
    }

    const tree = await treeRes.json();

    // 3. Create commit
    const commitRes = await fetch(`${GITHUB_API_BASE}/repos/${repoFullName}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'feat: initial MonprojetPro standalone deployment',
        tree: tree.sha,
      }),
    });

    if (!commitRes.ok) {
      const body = await commitRes.text();
      return { success: false, error: `GitHub createCommit failed: ${body}` };
    }

    const commit = await commitRes.json();

    // 4. Create ref (main branch)
    const refRes = await fetch(`${GITHUB_API_BASE}/repos/${repoFullName}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: 'refs/heads/main',
        sha: commit.sha,
      }),
    });

    if (!refRes.ok) {
      const body = await refRes.text();
      return { success: false, error: `GitHub createRef failed: ${body}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: `GitHub pushToRepo error: ${String(err)}` };
  }
}
