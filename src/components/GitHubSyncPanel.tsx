"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type RepoOption = { fullName: string; private: boolean };

export function GitHubSyncPanel() {
  const { data: authSession, status } = useSession();
  const [repo, setRepo] = useState("");
  const [savedRepo, setSavedRepo] = useState<string | null>(null);
  const [repos, setRepos] = useState<RepoOption[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/github/settings");
    if (!res.ok) return;
    const json = (await res.json()) as { repo?: string | null; configured?: boolean };
    if (json.repo) {
      setRepo(json.repo);
      setSavedRepo(json.repo);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings, authSession]);

  const loadRepos = useCallback(async () => {
    setLoadingRepos(true);
    setError(null);
    try {
      const res = await fetch("/api/github/repos");
      const json = (await res.json()) as { repos?: RepoOption[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load repos");
      setRepos(json.repos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load repos");
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  useEffect(() => {
    if (authSession?.user) void loadRepos();
  }, [authSession?.user, loadRepos]);

  const handleSaveRepo = useCallback(async () => {
    const target = repo.trim();
    if (!target) {
      setError("Choose or enter a repository.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/github/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: target }),
      });
      const json = (await res.json()) as { ok?: boolean; repo?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      setSavedRepo(json.repo ?? target);
      setMessage(
        `Sessions will save to ${json.repo ?? target} as you practice (one JSON file per question).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [repo]);

  if (status === "loading") {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        Loading GitHub…
      </section>
    );
  }

  if (!authSession?.user) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Save to GitHub
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Sign in with GitHub, pick a repository, and each practice session is saved as its own
          file while you work.
        </p>
        <button
          type="button"
          onClick={() => signIn("github")}
          className="mt-3 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Sign in with GitHub
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Save to GitHub
        </h2>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {authSession.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={authSession.user.image}
              alt=""
              className="size-6 rounded-full"
            />
          ) : null}
          <span>{authSession.user.name ?? "Signed in"}</span>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-zinc-400 underline hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            Sign out
          </button>
        </div>
      </div>

      <p className="mt-1 text-xs text-zinc-500">
        Choose a repo you own. Each question you solve is written to{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">sessions/&lt;id&gt;.json</code>{" "}
        and updated as you draw (about every 12 seconds).
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Repository
          </span>
          <input
            type="text"
            list="github-repo-list"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="your-username/design-practice"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <datalist id="github-repo-list">
            {repos.map((r) => (
              <option key={r.fullName} value={r.fullName} />
            ))}
          </datalist>
        </label>
        <button
          type="button"
          onClick={handleSaveRepo}
          disabled={saving}
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? "Saving…" : "Save repo"}
        </button>
      </div>

      {savedRepo ? (
        <p className="mt-2 text-xs text-green-700 dark:text-green-400">
          Active: <span className="font-mono">{savedRepo}</span>
        </p>
      ) : (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          Pick a repository and click Save repo before starting a session.
        </p>
      )}

      {loadingRepos ? (
        <p className="mt-1 text-[10px] text-zinc-400">Loading your repositories…</p>
      ) : null}

      {message ? (
        <p className="mt-2 rounded-md bg-green-50 px-2 py-1.5 text-xs text-green-800 dark:bg-green-950 dark:text-green-200">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}
    </section>
  );
}
