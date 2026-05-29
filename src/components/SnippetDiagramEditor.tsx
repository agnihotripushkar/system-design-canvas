"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { ExcalidrawCanvas } from "@/components/ExcalidrawCanvas";
import { isBuiltinSnippetId } from "@/lib/builtin-snippets/definitions";
import {
  prepareSnippetScene,
  type PreparedSnippetScene,
} from "@/lib/normalize-excalidraw-elements";
import { isSnippetCustomized } from "@/lib/snippet-tags";
import type { ExcalidrawElementLike } from "@/types/domain";

export type SnippetDiagramEditorProps = {
  snippetId: string;
  name: string;
  tags: string;
  initialElements: ExcalidrawElementLike[];
};

export function SnippetDiagramEditor({
  snippetId,
  name,
  tags,
  initialElements,
}: SnippetDiagramEditorProps) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [scene, setScene] = useState<PreparedSnippetScene | null>(null);
  const [sceneKey, setSceneKey] = useState(0);
  const [canvasMounted, setCanvasMounted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [customized, setCustomized] = useState(isSnippetCustomized(tags));
  const builtin = isBuiltinSnippetId(snippetId);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const loadScene = useCallback(async (elements: ExcalidrawElementLike[]) => {
    setLoadError(null);
    try {
      const prepared = await prepareSnippetScene(elements);
      setScene(prepared);
      setSceneKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to prepare snippet scene:", err);
      setLoadError("Could not load the diagram. Try Reset to default or refresh the page.");
      setScene({
        elements,
        appState: { scrollToContent: true },
        files: {},
      });
      setSceneKey((k) => k + 1);
    }
  }, []);

  useEffect(() => {
    void loadScene(initialElements);
  }, [initialElements, loadScene]);

  useEffect(() => {
    setCanvasMounted(false);
  }, [sceneKey]);

  /** After Excalidraw mounts, fit and center the diagram in the viewport. */
  useEffect(() => {
    if (!canvasMounted || !scene) return;
    const api = apiRef.current;
    if (!api) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        api.scrollToContent(api.getSceneElements(), {
          fitToViewport: true,
          viewportZoomFactor: 0.9,
          animate: false,
        });
      } catch {
        // Ignore if Excalidraw is tearing down
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sceneKey, canvasMounted, scene]);

  const handleSave = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;

    setSaving(true);
    try {
      const elements = api.getSceneElements() as unknown as ExcalidrawElementLike[];

      const res = await fetch(`/api/snippets/${snippetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elementsJson: JSON.stringify(elements),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Failed to save");
      }
      setCustomized(true);
      showToast("Snippet diagram saved.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [snippetId, showToast]);

  const handleReset = useCallback(async () => {
    if (!builtin) return;
    if (!window.confirm("Reset this snippet to the default diagram? Your edits will be lost.")) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch(`/api/snippets/${snippetId}/reset`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Failed to reset");
      }
      const { snippet } = (await res.json()) as { snippet: { elementsJson: string } };
      const raw = JSON.parse(snippet.elementsJson) as ExcalidrawElementLike[];
      await loadScene(raw);
      setCustomized(false);
      showToast("Restored default diagram.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reset");
    } finally {
      setResetting(false);
    }
  }, [builtin, snippetId, showToast, loadScene]);

  const handleApi = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api;
    setCanvasMounted(true);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col bg-zinc-100 dark:bg-zinc-950">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <Link
            href="/snippets"
            className="rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← Snippets
          </Link>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{name}</span>
          {customized ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Customized
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {builtin ? (
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting || saving}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {resetting ? "Resetting…" : "Reset to default"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || resetting || !scene}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? "Saving…" : "Save diagram"}
          </button>
        </div>
      </header>
      <p className="shrink-0 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        Edit the diagram below, then save. Changes apply everywhere you drag this snippet onto a
        canvas.
      </p>
      {loadError ? (
        <p className="shrink-0 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {loadError}
        </p>
      ) : null}
      <div className="relative min-h-0 flex-1 bg-white">
        {!scene ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
            Loading diagram…
          </div>
        ) : (
          <ExcalidrawCanvas
            key={sceneKey}
            initialData={{
              elements: scene.elements as never,
              appState: scene.appState as never,
              files: scene.files as never,
            }}
            onApi={handleApi}
          />
        )}
      </div>
      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
