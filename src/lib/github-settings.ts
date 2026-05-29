import { prisma } from "@/lib/db";
import { parseGithubRepo } from "@/lib/github-repo";

export type GithubRepoSettings = {
  owner: string;
  name: string;
  branch: string;
};

const SINGLETON_ID = "singleton";

export async function getGithubRepoSettings(): Promise<GithubRepoSettings | null> {
  const row = await prisma.appSettings.findUnique({ where: { id: SINGLETON_ID } });
  if (!row?.githubRepoOwner || !row.githubRepoName) return null;
  return {
    owner: row.githubRepoOwner,
    name: row.githubRepoName,
    branch: row.githubBranch || "main",
  };
}

export async function saveGithubRepoSettings(repoInput: string): Promise<GithubRepoSettings> {
  const parsed = parseGithubRepo(repoInput);
  if (!parsed) {
    throw new Error('Invalid repository. Use "owner/name" or a github.com URL.');
  }

  const row = await prisma.appSettings.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      githubRepoOwner: parsed.owner,
      githubRepoName: parsed.name,
      githubBranch: "main",
    },
    update: {
      githubRepoOwner: parsed.owner,
      githubRepoName: parsed.name,
    },
  });

  return {
    owner: row.githubRepoOwner!,
    name: row.githubRepoName!,
    branch: row.githubBranch,
  };
}

export async function getGithubSettingsResponse() {
  const row = await prisma.appSettings.findUnique({ where: { id: SINGLETON_ID } });
  const repo =
    row?.githubRepoOwner && row.githubRepoName
      ? `${row.githubRepoOwner}/${row.githubRepoName}`
      : null;
  return {
    repo,
    branch: row?.githubBranch ?? "main",
    configured: Boolean(repo),
  };
}
