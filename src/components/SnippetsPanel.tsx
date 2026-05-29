"use client";

import Link from "next/link";
import { useMemo, useState, type DragEvent } from "react";
import { isBuiltinSnippetId } from "@/lib/builtin-snippets/definitions";
import { isSnippetCustomized } from "@/lib/snippet-tags";
import type { SnippetSummary } from "@/types/domain";

export type SnippetsPanelProps = {
  snippets: SnippetSummary[];
  loading?: boolean;
  onRefresh: () => void;
  onDelete: (id: string) => void;
  /** Replace snippet diagram with current canvas selection. */
  onApplyFromCanvas?: (id: string) => void;
  onClose?: () => void;
};

function matchesQuery(snippet: SnippetSummary, q: string): boolean {
  return (
    snippet.name.toLowerCase().includes(q) ||
    (snippet.description ?? "").toLowerCase().includes(q) ||
    snippet.tags.toLowerCase().includes(q)
  );
}

export function SnippetsPanel({
  snippets,
  loading,
  onRefresh,
  onDelete,
  onApplyFromCanvas,
  onClose,
}: SnippetsPanelProps) {
  const [query, setQuery] = useState("");

  const { builtin, custom } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const builtinAll = snippets.filter((s) => isBuiltinSnippetId(s.id));
    const customAll = snippets.filter((s) => !isBuiltinSnippetId(s.id));
    if (!q) {
      return { builtin: builtinAll, custom: customAll };
    }
    return {
      builtin: builtinAll.filter((s) => matchesQuery(s, q)),
      custom: customAll.filter((s) => matchesQuery(s, q)),
    };
  }, [snippets, query]);

  const filteredCount = builtin.length + custom.length;

  const handleDragStart = (e: DragEvent<HTMLDivElement>, snippet: SnippetSummary) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/x-snippet-id", snippet.id);
    e.dataTransfer.setData("text/plain", snippet.name);
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Snippets</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Refresh
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label="Close snippets panel"
              title="Close panel"
            >
              ×
            </button>
          ) : null}
        </div>
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

      <div className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {loading ? (
          <p className="px-1 py-4 text-xs text-zinc-500">Loading...</p>
        ) : filteredCount === 0 ? (
          <p className="px-1 py-4 text-xs text-zinc-500">
            {snippets.length === 0
              ? "No snippets yet. Built-in components load automatically; save your own from the canvas toolbar."
              : "No snippets match your search."}
          </p>
        ) : (
          <>
            {builtin.length > 0 ? (
              <SnippetSection
                title="System design"
                hint="Drag onto canvas · Edit or override from selection"
                snippets={builtin}
                onDragStart={handleDragStart}
                onApplyFromCanvas={onApplyFromCanvas}
              />
            ) : null}
            {custom.length > 0 ? (
              <SnippetSection
                title="Your snippets"
                snippets={custom}
                onDragStart={handleDragStart}
                onDelete={onDelete}
                onApplyFromCanvas={onApplyFromCanvas}
              />
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}

function SnippetSection({
  title,
  hint,
  snippets,
  onDragStart,
  onDelete,
  onApplyFromCanvas,
}: {
  title: string;
  hint?: string;
  snippets: SnippetSummary[];
  onDragStart: (e: DragEvent<HTMLDivElement>, snippet: SnippetSummary) => void;
  onDelete?: (id: string) => void;
  onApplyFromCanvas?: (id: string) => void;
}) {
  return (
    <section>
      <div className="mb-2 px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {title}
        </h3>
        {hint ? <p className="mt-0.5 text-[10px] text-zinc-400">{hint}</p> : null}
      </div>
      <div className="space-y-2">
        {snippets.map((snippet) => (
          <SnippetCard
            key={snippet.id}
            snippet={snippet}
            onDragStart={onDragStart}
            onDelete={onDelete}
            onApplyFromCanvas={onApplyFromCanvas}
            builtin={isBuiltinSnippetId(snippet.id)}
            customized={isSnippetCustomized(snippet.tags)}
          />
        ))}
      </div>
    </section>
  );
}

function SnippetCard({
  snippet,
  onDragStart,
  onDelete,
  onApplyFromCanvas,
  builtin,
  customized,
}: {
  snippet: SnippetSummary;
  onDragStart: (e: DragEvent<HTMLDivElement>, snippet: SnippetSummary) => void;
  onDelete?: (id: string) => void;
  onApplyFromCanvas?: (id: string) => void;
  builtin?: boolean;
  customized?: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, snippet)}
      className="group cursor-grab rounded-lg border border-zinc-200 bg-white p-2.5 shadow-sm transition hover:border-zinc-400 hover:shadow active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
      title="Drag onto canvas"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {snippet.name}
            </p>
            {builtin ? (
              <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {customized ? "Customized" : "Built-in"}
              </span>
            ) : null}
          </div>
          {snippet.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
              {snippet.description}
            </p>
          ) : null}
        </div>
        {onDelete && !builtin ? (
          <button
            type="button"
            onClick={() => onDelete(snippet.id)}
            className="shrink-0 text-xs text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
            aria-label={`Delete ${snippet.name}`}
          >
            Delete
          </button>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Link
          href={`/snippets/${snippet.id}/edit`}
          className="rounded border border-zinc-300 px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          onClick={(e) => e.stopPropagation()}
        >
          Edit diagram
        </Link>
        {onApplyFromCanvas ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onApplyFromCanvas(snippet.id);
            }}
            className="rounded border border-zinc-300 px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Use selection
          </button>
        ) : null}
      </div>
    </div>
  );
}
