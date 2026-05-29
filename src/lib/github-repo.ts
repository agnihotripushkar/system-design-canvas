export type ParsedGithubRepo = {
  owner: string;
  name: string;
  /** HTTPS remote without credentials, e.g. https://github.com/owner/repo.git */
  httpsUrl: string;
};

const GITHUB_HTTPS_RE =
  /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)\/([a-zA-Z0-9._-]+?)(?:\.git)?\/?$/i;

const GITHUB_SSH_RE =
  /^git@github\.com:([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)\/([a-zA-Z0-9._-]+?)(?:\.git)?$/i;

const SHORT_RE = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)\/([a-zA-Z0-9._-]+)$/i;

export function parseGithubRepo(input: string): ParsedGithubRepo | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let owner: string | undefined;
  let name: string | undefined;

  const https = trimmed.match(GITHUB_HTTPS_RE);
  if (https) {
    owner = https[1];
    name = https[2];
  } else {
    const ssh = trimmed.match(GITHUB_SSH_RE);
    if (ssh) {
      owner = ssh[1];
      name = ssh[2];
    } else {
      const short = trimmed.match(SHORT_RE);
      if (short) {
        owner = short[1];
        name = short[2];
      }
    }
  }

  if (!owner || !name) return null;
  if (name.endsWith(".git")) name = name.slice(0, -4);

  return {
    owner,
    name,
    httpsUrl: `https://github.com/${owner}/${name}.git`,
  };
}

export function authenticatedRemoteUrl(httpsUrl: string, token: string): string {
  const url = new URL(httpsUrl);
  url.username = "x-access-token";
  url.password = token;
  return url.toString();
}
