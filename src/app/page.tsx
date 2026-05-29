import Link from "next/link";
import { GitHubSyncPanel } from "@/components/GitHubSyncPanel";
import { StartSessionPanel } from "@/components/StartSessionPanel";
import { prisma } from "@/lib/db";
import { QUESTION_BANK } from "@/lib/question-bank";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sessions = await prisma.session.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      question: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-12">
      <header className="flex items-end justify-between border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            System Design Canvas
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Paste a system design question, get the requirements, and sketch your
            answer on an Excalidraw-style canvas. Sign in with GitHub to save each
            session to your repo as you solve it.
          </p>
        </div>
        <Link
          href="/snippets"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Snippet library
        </Link>
      </header>

      <GitHubSyncPanel />

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Start a new practice session
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Pick from the curated bank or paste your own question. Either way,
          OpenAI generates the requirements before you start sketching.
        </p>
        <div className="mt-3">
          <StartSessionPanel bank={QUESTION_BANK} />
        </div>
      </section>

      <section className="flex-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Past sessions
        </h2>
        {sessions.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
            No sessions yet. Start one above.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/practice/${s.id}`}
                  className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {s.title}
                    </p>
                    <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {s.question}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-zinc-400">
                    {new Date(s.updatedAt).toLocaleString()}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
