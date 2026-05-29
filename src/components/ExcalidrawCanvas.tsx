"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useRef, type DragEvent } from "react";
import "@excalidraw/excalidraw/index.css";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-white text-sm text-zinc-500">
        Loading canvas...
      </div>
    ),
  },
);

export type SceneSnapshot = {
  elements: readonly OrderedExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
};

export type CanvasDropPayload = {
  dataTransfer: DataTransfer;
  sceneX: number;
  sceneY: number;
  api: ExcalidrawImperativeAPI;
};

export type ExcalidrawCanvasProps = {
  initialData?: ExcalidrawInitialDataState | null;
  onApi?: (api: ExcalidrawImperativeAPI) => void;
  /** Debounced (default 1500ms) snapshot of the latest scene state. */
  onSceneChange?: (snapshot: SceneSnapshot) => void;
  debounceMs?: number;
  /** Fired when an external draggable is dropped over the canvas. */
  onCanvasDrop?: (payload: CanvasDropPayload) => void;
};

export const ExcalidrawCanvas = memo(function ExcalidrawCanvas({
  initialData,
  onApi,
  onSceneChange,
  debounceMs = 1500,
  onCanvasDrop,
}: ExcalidrawCanvasProps) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSnapshot = useRef<SceneSnapshot | null>(null);
  const onSceneChangeRef = useRef(onSceneChange);
  const onCanvasDropRef = useRef(onCanvasDrop);

  useEffect(() => {
    onSceneChangeRef.current = onSceneChange;
  }, [onSceneChange]);

  useEffect(() => {
    onCanvasDropRef.current = onCanvasDrop;
  }, [onCanvasDrop]);

  const handleChange = useCallback(
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      latestSnapshot.current = { elements, appState, files };
      const cb = onSceneChangeRef.current;
      if (!cb) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        if (latestSnapshot.current) cb(latestSnapshot.current);
      }, debounceMs);
    },
    [debounceMs],
  );

  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    },
    [],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes("application/x-snippet-id")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDrop = useCallback(async (event: DragEvent<HTMLDivElement>) => {
    const cb = onCanvasDropRef.current;
    const api = apiRef.current;
    const container = containerRef.current;
    if (!cb || !api || !container) return;
    if (!event.dataTransfer.types.includes("application/x-snippet-id")) return;
    event.preventDefault();

    const { viewportCoordsToSceneCoords } = await import("@excalidraw/excalidraw");
    const rect = container.getBoundingClientRect();
    const appState = api.getAppState();
    const { x: sceneX, y: sceneY } = viewportCoordsToSceneCoords(
      { clientX: event.clientX, clientY: event.clientY },
      {
        zoom: appState.zoom,
        offsetLeft: rect.left,
        offsetTop: rect.top,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
      },
    );
    cb({ dataTransfer: event.dataTransfer, sceneX, sceneY, api });
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Excalidraw
        initialData={initialData ?? undefined}
        excalidrawAPI={(api) => {
          apiRef.current = api;
          onApi?.(api);
        }}
        onChange={handleChange}
      />
    </div>
  );
});
