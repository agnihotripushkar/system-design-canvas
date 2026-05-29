import Link from "next/link";
import { ensureBuiltinSnippets } from "@/lib/builtin-snippets/ensure";
import { prisma } from "@/lib/db";
import { SnippetsManager } from "@/components/SnippetsManager";

export const dynamic = "force-dynamic";

export default async function SnippetsPage() {
  await ensureBuiltinSnippets();

  const snippets = await prisma.snippet.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      thumbnailDataUrl: true,
      tags: true,
      createdAt: true,
    },
  });

  const initial = snippets.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex items-end justify-between border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Snippet library
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Reusable building blocks. Open <strong>Edit diagram</strong> to change
            any snippet (including built-ins), or use <strong>Use selection</strong> on
            a practice session to override from the canvas. Built-ins can be reset
            to defaults but not deleted.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          ← Back to sessions
        </Link>
      </header>

      <SnippetsManager initial={initial} />
    </div>
  );
}
