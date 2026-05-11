"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { ExcalidrawCanvas, type SceneSnapshot } from "@/components/ExcalidrawCanvas";
import { QuestionPanel } from "@/components/QuestionPanel";
import { SnippetsPanel } from "@/components/SnippetsPanel";
import { extractSelected, placeAtAnchor, regenerateIds } from "@/lib/excalidraw-utils";
import type {
  ExcalidrawElementLike,
  Requirements,
  SnippetSummary,
} from "@/types/domain";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export type CanvasWorkspaceProps = {
  sessionId: string;
  title: string;
  question: string;
  requirements: Requirements;
  initialScene: { elements: ExcalidrawElementLike[]; appState: Record<string, unknown>; files: Record<string, unknown> };
};

export function CanvasWorkspace({
  sessionId,
  title,
  question,
  requirements,
  initialScene,
}: CanvasWorkspaceProps) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [snippets, setSnippets] = useState<SnippetSummary[]>([]);
  const [snippetsLoading, setSnippetsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [toast, setToast] = useState<string | null>(null);
  const [snippetsRefreshTick, setSnippetsRefreshTick] = useState(0);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  }, []);

  const refreshSnippets = useCallback(() => {
    setSnippetsRefreshTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      setSnippetsLoading(true);
      try {
        const res = await fetch("/api/snippets", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load snippets");
        const json = (await res.json()) as { snippets: SnippetSummary[] };
        if (!cancelled) setSnippets(json.snippets);
      } catch (err) {
        if (!cancelled) {
          showToast(err instanceof Error ? err.message : "Failed to load snippets");
        }
      } finally {
        if (!cancelled) setSnippetsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [snippetsRefreshTick, showToast]);

  const handleSceneChange = useCallback(
    async (snapshot: SceneSnapshot) => {
      setSaveStatus("saving");
      try {
        const sceneJson = JSON.stringify({
          elements: snapshot.elements,
          appState: stripVolatileAppState(snapshot.appState as unknown as Record<string, unknown>),
          files: snapshot.files,
        });
        const res = await fetch(`/api/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sceneJson }),
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("error");
        showToast(err instanceof Error ? err.message : "Failed to save");
      }
    },
    [sessionId, showToast],
  );

  const handleSaveSelectionAsSnippet = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    const elements = api.getSceneElements() as unknown as ExcalidrawElementLike[];
    const appState = api.getAppState();
    const files = api.getFiles();
    const selectedIds = appState.selectedElementIds ?? {};
    const selected = extractSelected(elements, selectedIds as Record<string, true>);
    if (selected.length === 0) {
      showToast("Select something on the canvas first.");
      return;
    }

    const name = window.prompt("Snippet name?");
    if (!name || !name.trim()) return;

    let thumbnailDataUrl: string | null = null;
    try {
      const { exportToCanvas } = await import("@excalidraw/excalidraw");
      const canvas = await exportToCanvas(
        selected as never,
        appState,
        files,
        {
          exportBackground: true,
          viewBackgroundColor: "#ffffff",
          exportPadding: 16,
        },
      );
      thumbnailDataUrl = downscaleDataUrl(canvas, 320, 200);
    } catch {
      // Thumbnail is optional - continue without it.
    }

    try {
      const res = await fetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          elementsJson: JSON.stringify(selected),
          thumbnailDataUrl,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Failed to save snippet");
      }
      showToast(`Saved "${name.trim()}" to snippets`);
      refreshSnippets();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save snippet");
    }
  }, [refreshSnippets, showToast]);

  const handleDeleteSnippet = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this snippet?")) return;
      try {
        const res = await fetch(`/api/snippets/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete");
        setSnippets((prev) => prev.filter((s) => s.id !== id));
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to delete snippet");
      }
    },
    [showToast],
  );

  const handleCanvasDrop = useCallback(
    async ({
      dataTransfer,
      sceneX,
      sceneY,
      api,
    }: {
      dataTransfer: DataTransfer;
      sceneX: number;
      sceneY: number;
      api: ExcalidrawImperativeAPI;
    }) => {
      const snippetId = dataTransfer.getData("application/x-snippet-id");
      if (!snippetId) return;

      try {
        const res = await fetch(`/api/snippets/${snippetId}`);
        if (!res.ok) throw new Error("Failed to load snippet");
        const { snippet } = (await res.json()) as {
          snippet: { id: string; name: string; elementsJson: string };
        };
        const raw = JSON.parse(snippet.elementsJson) as ExcalidrawElementLike[];
        const positioned = placeAtAnchor(regenerateIds(raw), sceneX, sceneY);
        const current = api.getSceneElements() as unknown as ExcalidrawElementLike[];
        api.updateScene({
          elements: [...current, ...positioned] as never,
        });
        showToast(`Inserted "${snippet.name}"`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to insert snippet");
      }
    },
    [showToast],
  );

  return (
    <div className="fixed inset-0 grid grid-rows-[auto_1fr] bg-zinc-100 dark:bg-zinc-950">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← Sessions
          </Link>
          <Link
            href="/snippets"
            className="rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Snippets
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveSelectionAsSnippet}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Save selection as snippet
          </button>
          <SaveIndicator status={saveStatus} />
        </div>
      </header>
      <main className="grid min-h-0 grid-cols-[320px_1fr_300px]">
        <div className="min-h-0 border-r border-zinc-200 dark:border-zinc-800">
          <QuestionPanel title={title} question={question} requirements={requirements} />
        </div>
        <div className="min-h-0 bg-white">
          <ExcalidrawCanvas
            initialData={{
              elements: initialScene.elements as never,
              appState: initialScene.appState as never,
              files: initialScene.files as never,
            }}
            onApi={(api) => {
              apiRef.current = api;
            }}
            onSceneChange={handleSceneChange}
            onCanvasDrop={handleCanvasDrop}
          />
        </div>
        <div className="min-h-0 border-l border-zinc-200 dark:border-zinc-800">
          <SnippetsPanel
            snippets={snippets}
            loading={snippetsLoading}
            onRefresh={refreshSnippets}
            onDelete={handleDeleteSnippet}
          />
        </div>
      </main>
      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const label =
    status === "saving"
      ? "Saving..."
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "Save failed"
          : "Autosave on";
  const cls =
    status === "error"
      ? "text-red-500"
      : status === "saving"
        ? "text-amber-600 dark:text-amber-400"
        : "text-zinc-500";
  return <span className={`text-xs ${cls}`}>{label}</span>;
}

/** Strip out fields we don't want persisted (e.g., transient UI state). */
const VOLATILE_APP_STATE_KEYS = new Set([
  "collaborators",
  "selectedElementIds",
  "selectedGroupIds",
  "editingElement",
  "pasteDialog",
]);

function stripVolatileAppState(appState: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(appState)) {
    if (!VOLATILE_APP_STATE_KEYS.has(key)) out[key] = value;
  }
  return out;
}

function downscaleDataUrl(canvas: HTMLCanvasElement, maxW: number, maxH: number): string {
  const ratio = Math.min(maxW / canvas.width, maxH / canvas.height, 1);
  if (ratio >= 1) return canvas.toDataURL("image/png");
  const target = document.createElement("canvas");
  target.width = Math.max(1, Math.round(canvas.width * ratio));
  target.height = Math.max(1, Math.round(canvas.height * ratio));
  const ctx = target.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");
  ctx.drawImage(canvas, 0, 0, target.width, target.height);
  return target.toDataURL("image/png");
}
