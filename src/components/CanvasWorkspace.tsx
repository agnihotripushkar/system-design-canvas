"use client";

import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { ExcalidrawCanvas, type SceneSnapshot } from "@/components/ExcalidrawCanvas";
import { QuestionPanel } from "@/components/QuestionPanel";
import { SnippetsPanel } from "@/components/SnippetsPanel";
import { extractSelected, placeAtAnchor, regenerateIds } from "@/lib/excalidraw-utils";
import { normalizeExcalidrawElements } from "@/lib/normalize-excalidraw-elements";
import type {
  ExcalidrawElementLike,
  Requirements,
  SnippetSummary,
} from "@/types/domain";

type SaveStatus = "idle" | "saving" | "saved" | "error";

const LEFT_PANEL_WIDTH = 320;
const RIGHT_PANEL_WIDTH = 300;

type GithubSyncState = "idle" | "pending" | "synced" | "error";

export type CanvasWorkspaceProps = {
  sessionId: string;
  title: string;
  question: string;
  requirements: Requirements;
  initialScene: { elements: ExcalidrawElementLike[]; appState: Record<string, unknown>; files: Record<string, unknown> };
  initialGithubSyncedAt?: string | null;
  initialGithubSyncError?: string | null;
};

export function CanvasWorkspace({
  sessionId,
  title,
  question,
  requirements,
  initialScene,
  initialGithubSyncedAt,
  initialGithubSyncError,
}: CanvasWorkspaceProps) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [snippets, setSnippets] = useState<SnippetSummary[]>([]);
  const [snippetsLoading, setSnippetsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [toast, setToast] = useState<string | null>(null);
  const [snippetsRefreshTick, setSnippetsRefreshTick] = useState(0);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [githubSync, setGithubSync] = useState<GithubSyncState>(() => {
    if (initialGithubSyncError) return "error";
    if (initialGithubSyncedAt) return "synced";
    return "idle";
  });
  const [githubSyncError, setGithubSyncError] = useState<string | null>(
    initialGithubSyncError ?? null,
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  }, []);

  const refreshSnippets = useCallback(() => {
    setSnippetsRefreshTick((n) => n + 1);
  }, []);

  const snippetsRef = useRef(snippets);
  snippetsRef.current = snippets;

  useEffect(() => {
    let cancelled = false;
    const showLoading = snippetsRef.current.length === 0;
    (async () => {
      if (cancelled) return;
      if (showLoading) setSnippetsLoading(true);
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

  const pollGithubSync = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        session?: { githubSyncedAt?: string | null; githubSyncError?: string | null };
      };
      const s = json.session;
      if (!s) return;
      if (s.githubSyncError) {
        setGithubSync("error");
        setGithubSyncError(s.githubSyncError);
        return;
      }
      if (s.githubSyncedAt) {
        setGithubSync("synced");
        setGithubSyncError(null);
      }
    } catch {
      // ignore poll errors
    }
  }, [sessionId]);

  useEffect(() => {
    if (githubSync !== "pending") return;
    const interval = setInterval(() => void pollGithubSync(), 4000);
    const stop = setTimeout(() => clearInterval(interval), 45_000);
    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [githubSync, pollGithubSync]);

  const handleSceneChange = useCallback(
    async (snapshot: SceneSnapshot) => {
      setSaveStatus((prev) => (prev === "error" ? "error" : "saving"));
      setGithubSync((prev) => (prev === "error" ? "error" : "pending"));
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
        void pollGithubSync();
      } catch (err) {
        setSaveStatus("error");
        showToast(err instanceof Error ? err.message : "Failed to save");
      }
    },
    [sessionId, showToast, pollGithubSync],
  );

  const handleApi = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api;
  }, []);

  const handleSaveSelectionAsSnippet = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    const elements = api.getSceneElements() as unknown as ExcalidrawElementLike[];
    const selectedIds = api.getAppState().selectedElementIds ?? {};
    const selected = extractSelected(elements, selectedIds as Record<string, true>);
    if (selected.length === 0) {
      showToast("Select something on the canvas first.");
      return;
    }

    const name = window.prompt("Snippet name?");
    if (!name || !name.trim()) return;

    try {
      const res = await fetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          elementsJson: JSON.stringify(selected),
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

  const handleOverrideSnippet = useCallback(
    async (snippetId: string) => {
      const api = apiRef.current;
      if (!api) return;
      const elements = api.getSceneElements() as unknown as ExcalidrawElementLike[];
      const selectedIds = api.getAppState().selectedElementIds ?? {};
      const selected = extractSelected(elements, selectedIds as Record<string, true>);
      if (selected.length === 0) {
        showToast("Select elements on the canvas to use as the new diagram.");
        return;
      }

      const snippet = snippets.find((s) => s.id === snippetId);
      if (
        !window.confirm(
          `Replace "${snippet?.name ?? "snippet"}" with the current selection? This updates the snippet everywhere.`,
        )
      ) {
        return;
      }

      try {
        const res = await fetch(`/api/snippets/${snippetId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            elementsJson: JSON.stringify(selected),
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? "Failed to update snippet");
        }
        showToast(`Updated "${snippet?.name ?? "snippet"}"`);
        refreshSnippets();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to update snippet");
      }
    },
    [refreshSnippets, showToast, snippets],
  );

  const handleDeleteSnippet = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this snippet?")) return;
      try {
        const res = await fetch(`/api/snippets/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? "Failed to delete");
        }
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
        const normalized = await normalizeExcalidrawElements(positioned);
        const current = api.getSceneElements() as unknown as ExcalidrawElementLike[];
        api.updateScene({
          elements: [...current, ...normalized] as never,
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
          <div className="ml-1 hidden h-4 w-px bg-zinc-200 dark:bg-zinc-700 sm:block" />
          <PanelHeaderToggle
            label="Requirements"
            open={leftPanelOpen}
            onClick={() => setLeftPanelOpen((o) => !o)}
          />
          <PanelHeaderToggle
            label="Snippets"
            open={rightPanelOpen}
            onClick={() => setRightPanelOpen((o) => !o)}
          />
        </div>
        <WorkspaceHeaderActions
          saveStatus={saveStatus}
          githubSync={githubSync}
          githubSyncError={githubSyncError}
          onSaveSelectionAsSnippet={handleSaveSelectionAsSnippet}
        />
      </header>
      <main
        className="grid min-h-0 transition-[grid-template-columns] duration-200 ease-out"
        style={{
          gridTemplateColumns: `${leftPanelOpen ? LEFT_PANEL_WIDTH : 0}px minmax(0, 1fr) ${rightPanelOpen ? RIGHT_PANEL_WIDTH : 0}px`,
        }}
      >
        <CollapsibleSidePanel
          side="left"
          open={leftPanelOpen}
          width={LEFT_PANEL_WIDTH}
        >
          <QuestionPanel
            title={title}
            question={question}
            requirements={requirements}
            onClose={() => setLeftPanelOpen(false)}
          />
        </CollapsibleSidePanel>
        <div className="relative min-h-0 bg-white">
          {!leftPanelOpen ? (
            <PanelEdgeTab
              side="left"
              label="Requirements"
              onClick={() => setLeftPanelOpen(true)}
            />
          ) : null}
          {!rightPanelOpen ? (
            <PanelEdgeTab
              side="right"
              label="Snippets"
              onClick={() => setRightPanelOpen(true)}
            />
          ) : null}
          <ExcalidrawCanvas
            initialData={{
              elements: initialScene.elements as never,
              appState: initialScene.appState as never,
              files: initialScene.files as never,
            }}
            onApi={handleApi}
            onSceneChange={handleSceneChange}
            onCanvasDrop={handleCanvasDrop}
          />
        </div>
        <CollapsibleSidePanel
          side="right"
          open={rightPanelOpen}
          width={RIGHT_PANEL_WIDTH}
        >
          <SnippetsPanel
            snippets={snippets}
            loading={snippetsLoading}
            onRefresh={refreshSnippets}
            onDelete={handleDeleteSnippet}
            onApplyFromCanvas={handleOverrideSnippet}
            onClose={() => setRightPanelOpen(false)}
          />
        </CollapsibleSidePanel>
      </main>
      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function CollapsibleSidePanel({
  side,
  open,
  width,
  children,
}: {
  side: "left" | "right";
  open: boolean;
  width: number;
  children: ReactNode;
}) {
  return (
    <div
      className={`min-h-0 overflow-hidden ${
        side === "left"
          ? "border-r border-zinc-200 dark:border-zinc-800"
          : "border-l border-zinc-200 dark:border-zinc-800"
      }`}
      style={{ width: open ? width : 0 }}
      aria-hidden={!open}
    >
      <div className="h-full" style={{ width }}>
        {children}
      </div>
    </div>
  );
}

function PanelHeaderToggle({
  label,
  open,
  onClick,
}: {
  label: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={open}
      className={`hidden rounded-md px-2 py-1 text-xs font-medium transition sm:inline-block ${
        open
          ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
          : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      }`}
    >
      {label}
    </button>
  );
}

function PanelEdgeTab({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-0.5 border border-zinc-200 bg-white px-1.5 py-2.5 text-[10px] font-medium leading-tight text-zinc-700 shadow-md hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 ${
        side === "left" ? "left-0 rounded-r-md border-l-0" : "right-0 rounded-l-md border-r-0"
      }`}
      aria-label={`Open ${label} panel`}
      title={`Open ${label}`}
    >
      <span className="text-sm text-zinc-400">{side === "left" ? "›" : "‹"}</span>
      <span className="max-w-[3rem] text-center">{label}</span>
    </button>
  );
}

const WorkspaceHeaderActions = memo(function WorkspaceHeaderActions({
  saveStatus,
  githubSync,
  githubSyncError,
  onSaveSelectionAsSnippet,
}: {
  saveStatus: SaveStatus;
  githubSync: GithubSyncState;
  githubSyncError: string | null;
  onSaveSelectionAsSnippet: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <button
        type="button"
        onClick={onSaveSelectionAsSnippet}
        className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Save selection as snippet
      </button>
      <GithubSyncIndicator status={githubSync} error={githubSyncError} />
      <SaveIndicator status={saveStatus} />
    </div>
  );
});

function GithubSyncIndicator({
  status,
  error,
}: {
  status: GithubSyncState;
  error: string | null;
}) {
  if (status === "idle") return null;
  const label =
    status === "pending"
      ? "GitHub…"
      : status === "synced"
        ? "On GitHub"
        : "GitHub failed";
  const cls =
    status === "error"
      ? "text-red-500"
      : status === "pending"
        ? "text-amber-600 dark:text-amber-400"
        : "text-green-600 dark:text-green-400";
  return (
    <span
      className={`inline-block w-[5.5rem] shrink-0 text-right text-xs tabular-nums ${cls}`}
      title={error ?? undefined}
      aria-live="polite"
    >
      {label}
    </span>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const label =
    status === "saving"
      ? "Saving…"
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
  // Fixed width so label changes don't shift the snippet button (layout flicker).
  return (
    <span
      className={`inline-block w-[5.5rem] shrink-0 text-right text-xs tabular-nums ${cls}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {label}
    </span>
  );
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

