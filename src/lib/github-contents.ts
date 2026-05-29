import type { GithubRepoSettings } from "@/lib/github-settings";

type GithubContentFile = {
  sha: string;
  content?: string;
};

export async function putFileInRepo(
  accessToken: string,
  repo: GithubRepoSettings,
  path: string,
  contentUtf8: string,
  commitMessage: string,
): Promise<{ url: string }> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  let sha: string | undefined;
  const getUrl = `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(repo.branch)}`;
  const existing = await fetch(getUrl, { headers });
  if (existing.ok) {
    const data = (await existing.json()) as GithubContentFile;
    sha = data.sha;
  }

  const putUrl = `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${encodeURIComponent(path)}`;
  const body = {
    message: commitMessage,
    content: Buffer.from(contentUtf8, "utf8").toString("base64"),
    branch: repo.branch,
    ...(sha ? { sha } : {}),
  };

  const res = await fetch(putUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      typeof err === "object" && err && "message" in err
        ? String((err as { message: string }).message)
        : res.statusText;
    throw new Error(msg || `GitHub API error (${res.status})`);
  }

  const result = (await res.json()) as { content?: { html_url?: string } };
  return { url: result.content?.html_url ?? `https://github.com/${repo.owner}/${repo.name}` };
}

export async function listUserRepos(accessToken: string): Promise<
  { fullName: string; name: string; owner: string; private: boolean }[]
> {
  const repos: { fullName: string; name: string; owner: string; private: boolean }[] = [];
  let page = 1;

  while (page <= 5) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!res.ok) break;
    const batch = (await res.json()) as {
      full_name: string;
      name: string;
      owner: { login: string };
      private: boolean;
    }[];
    if (batch.length === 0) break;
    for (const r of batch) {
      repos.push({
        fullName: r.full_name,
        name: r.name,
        owner: r.owner.login,
        private: r.private,
      });
    }
    if (batch.length < 100) break;
    page += 1;
  }

  return repos;
}
