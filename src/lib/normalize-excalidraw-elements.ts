import { centerElementsAt } from "@/lib/excalidraw-utils";
import type { ExcalidrawElementLike } from "@/types/domain";

/** Scene-space point used when opening the snippet editor (near canvas origin). */
const SNIPPET_EDITOR_SCENE_CENTER = { x: 0, y: 0 };

export type PreparedSnippetScene = {
  elements: ExcalidrawElementLike[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
};

/** Repair stored snippet elements so Excalidraw can render them (indices, bindings, text size). */
export async function normalizeExcalidrawElements(
  elements: readonly ExcalidrawElementLike[],
): Promise<ExcalidrawElementLike[]> {
  const scene = await prepareSnippetScene(elements);
  return scene.elements;
}

/** Build initialData for Excalidraw (includes scrollToContent; no imperative scrollToContent call). */
export async function prepareSnippetScene(
  elements: readonly ExcalidrawElementLike[],
): Promise<PreparedSnippetScene> {
  if (elements.length === 0) {
    return { elements: [], appState: { scrollToContent: true } as Record<string, unknown>, files: {} };
  }

  const centered = centerElementsAt(
    elements,
    SNIPPET_EDITOR_SCENE_CENTER.x,
    SNIPPET_EDITOR_SCENE_CENTER.y,
  );

  const { restore } = await import("@excalidraw/excalidraw");
  const restored = restore(
    {
      elements: centered as never,
      appState: { scrollToContent: true } as never,
      files: {},
    },
    null,
    null,
    { refreshDimensions: true, repairBindings: true },
  );
  return {
    elements: restored.elements as unknown as ExcalidrawElementLike[],
    appState: restored.appState as unknown as Record<string, unknown>,
    files: restored.files as unknown as Record<string, unknown>,
  };
}
