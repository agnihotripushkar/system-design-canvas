"use client";

import Link from "next/link";
import { useState } from "react";
import { isBuiltinSnippetId } from "@/lib/builtin-snippets/definitions";
import { isSnippetCustomized } from "@/lib/snippet-tags";
import type { SnippetSummary } from "@/types/domain";

export function SnippetsManager({ initial }: { initial: SnippetSummary[] }) {
  const [snippets, setSnippets] = useState<SnippetSummary[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (isBuiltinSnippetId(id)) {
      setError("Built-in snippets cannot be deleted.");
      return;
    }
    if (!window.confirm("Delete this snippet?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/snippets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Failed to delete");
      }
      setSnippets((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleResetBuiltin = async (id: string) => {
    if (!window.confirm("Reset this built-in snippet to the default diagram?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/snippets/${id}/reset`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Failed to reset");
      }
      const json = (await res.json()) as { snippet: SnippetSummary & { createdAt: string } };
      setSnippets((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                ...json.snippet,
                createdAt:
                  typeof json.snippet.createdAt === "string"
                    ? json.snippet.createdAt
                    : s.createdAt,
              }
            : s,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset");
    }
  };

  const handleSave = async (
    id: string,
    next: { name: string; description: string; tags: string },
  ) => {
    setError(null);
    try {
      const res = await fetch(`/api/snippets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: next.name.trim(),
          description: next.description.trim() || null,
          tags: next.tags.trim(),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Failed to update");
      }
      const json = (await res.json()) as { snippet: SnippetSummary };
      setSnippets((prev) => prev.map((s) => (s.id === id ? { ...s, ...json.snippet } : s)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  if (snippets.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        No snippets yet. Open a practice session, select elements, and click
        &quot;Save selection as snippet&quot;.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {snippets.map((s) =>
          editingId === s.id ? (
            <SnippetEditor
              key={s.id}
              snippet={s}
              onCancel={() => setEditingId(null)}
              onSave={(next) => handleSave(s.id, next)}
            />
          ) : (
            <SnippetCard
              key={s.id}
              snippet={s}
              onEdit={() => setEditingId(s.id)}
              onDelete={() => handleDelete(s.id)}
              onResetBuiltin={
                isBuiltinSnippetId(s.id) ? () => handleResetBuiltin(s.id) : undefined
              }
            />
          ),
        )}
      </ul>
    </div>
  );
}

function SnippetCard({
  snippet,
  onEdit,
  onDelete,
  onResetBuiltin,
}: {
  snippet: SnippetSummary;
  onEdit: () => void;
  onDelete: () => void;
  onResetBuiltin?: () => void;
}) {
  const displayTags = snippet.tags
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t && t !== "builtin" && t !== "customized");

  return (
    <li className="flex flex-col rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{snippet.name}</p>
          {isBuiltinSnippetId(snippet.id) ? (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {isSnippetCustomized(snippet.tags) ? "Customized" : "Built-in"}
            </span>
          ) : null}
        </div>
        {snippet.description ? (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{snippet.description}</p>
        ) : null}
        {displayTags.length > 0 ? (
          <p className="mt-1 text-[11px] text-zinc-400">{displayTags.join(" · ")}</p>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2 text-xs">
        <Link
          href={`/snippets/${snippet.id}/edit`}
          className="rounded border border-zinc-300 px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Edit diagram
        </Link>
        <button
          type="button"
          onClick={onEdit}
          className="rounded border border-zinc-300 px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Edit details
        </button>
        {isBuiltinSnippetId(snippet.id) && isSnippetCustomized(snippet.tags) ? (
          <span className="self-center text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Customized
          </span>
        ) : null}
        {onResetBuiltin ? (
          <button
            type="button"
            onClick={onResetBuiltin}
            className="rounded border border-zinc-300 px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Reset default
          </button>
        ) : null}
        {!isBuiltinSnippetId(snippet.id) ? (
          <button
            type="button"
            onClick={onDelete}
            className="rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
          >
            Delete
          </button>
        ) : null}
      </div>
    </li>
  );
}

function SnippetEditor({
  snippet,
  onCancel,
  onSave,
}: {
  snippet: SnippetSummary;
  onCancel: () => void;
  onSave: (next: { name: string; description: string; tags: string }) => void;
}) {
  const [name, setName] = useState(snippet.name);
  const [description, setDescription] = useState(snippet.description ?? "");
  const [tags, setTags] = useState(snippet.tags);

  return (
    <li className="flex flex-col rounded-lg border border-zinc-300 bg-white p-3 shadow dark:border-zinc-700 dark:bg-zinc-900">
      <label className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      <label className="mt-2 mb-1 text-xs uppercase tracking-wide text-zinc-500">Description</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className="resize-none rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      <label className="mt-2 mb-1 text-xs uppercase tracking-wide text-zinc-500">Tags (comma-separated)</label>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      <div className="mt-3 flex justify-end gap-2 text-xs">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-zinc-300 px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => onSave({ name, description, tags })}
          className="rounded bg-zinc-900 px-2 py-1 text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Save
        </button>
      </div>
    </li>
  );
}
