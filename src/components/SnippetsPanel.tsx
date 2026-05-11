"use client";

import { useMemo, useState, type DragEvent } from "react";
import type { SnippetSummary } from "@/types/domain";

export type SnippetsPanelProps = {
  snippets: SnippetSummary[];
  loading?: boolean;
  onRefresh: () => void;
  onDelete: (id: string) => void;
};

export function SnippetsPanel({ snippets, loading, onRefresh, onDelete }: SnippetsPanelProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return snippets;
    return snippets.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        s.tags.toLowerCase().includes(q),
    );
  }, [snippets, query]);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, snippet: SnippetSummary) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/x-snippet-id", snippet.id);
    e.dataTransfer.setData("text/plain", snippet.name);
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Snippets</h2>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Refresh
        </button>
      </header>

      <div className="px-4 py-2">
        <input
          type="search"
          placeholder="Search snippets..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-4">
        {loading ? (
          <p className="px-1 py-4 text-xs text-zinc-500">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="px-1 py-4 text-xs text-zinc-500">
            {snippets.length === 0
              ? "No snippets yet. Select elements on the canvas and click \"Save selection as snippet\"."
              : "No snippets match your search."}
          </p>
        ) : (
          filtered.map((snippet) => (
            <div
              key={snippet.id}
              draggable
              onDragStart={(e) => handleDragStart(e, snippet)}
              className="group cursor-grab rounded-lg border border-zinc-200 bg-white p-2 shadow-sm transition hover:border-zinc-400 hover:shadow active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
              title="Drag onto canvas"
            >
              {snippet.thumbnailDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={snippet.thumbnailDataUrl}
                  alt={snippet.name}
                  draggable={false}
                  className="pointer-events-none h-24 w-full rounded bg-white object-contain"
                />
              ) : (
                <div className="flex h-24 w-full items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400 dark:bg-zinc-800">
                  No preview
                </div>
              )}
              <div className="mt-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {snippet.name}
                  </p>
                  {snippet.description ? (
                    <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {snippet.description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(snippet.id)}
                  className="opacity-0 transition group-hover:opacity-100 text-xs text-zinc-400 hover:text-red-500"
                  aria-label={`Delete ${snippet.name}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
