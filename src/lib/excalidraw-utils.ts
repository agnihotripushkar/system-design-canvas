import type { ExcalidrawElementLike } from "@/types/domain";

/**
 * Generates a fresh, sufficiently-random id similar in shape to Excalidraw's
 * own ids. We don't need cryptographic strength - just collision avoidance
 * within a single scene.
 */
function freshId(): string {
  const rnd = () => Math.random().toString(36).slice(2, 10);
  return `${rnd()}${rnd()}`.slice(0, 16);
}

/**
 * Regenerates ids for a list of elements while preserving any internal
 * references (`groupIds`, `boundElements`, `containerId`, `frameId`,
 * `startBinding.elementId`, `endBinding.elementId`).
 *
 * This lets us paste the same snippet onto a canvas multiple times without
 * id collisions.
 */
export function regenerateIds<T extends ExcalidrawElementLike>(elements: readonly T[]): T[] {
  const idMap = new Map<string, string>();
  for (const el of elements) {
    idMap.set(el.id, freshId());
  }

  const groupIdMap = new Map<string, string>();
  const remapGroup = (gid: string): string => {
    let next = groupIdMap.get(gid);
    if (!next) {
      next = freshId();
      groupIdMap.set(gid, next);
    }
    return next;
  };

  const remapId = (id: string): string => idMap.get(id) ?? id;

  return elements.map((el) => {
    const next: ExcalidrawElementLike = { ...el, id: remapId(el.id) };

    if (Array.isArray(el.groupIds) && el.groupIds.length > 0) {
      next.groupIds = el.groupIds.map(remapGroup);
    }

    if (Array.isArray(el.boundElements)) {
      next.boundElements = el.boundElements.map((b) => ({ ...b, id: remapId(b.id) }));
    }

    if (el.containerId) {
      next.containerId = remapId(el.containerId);
    }
    if (el.frameId) {
      next.frameId = remapId(el.frameId);
    }
    if (el.startBinding && typeof el.startBinding.elementId === "string") {
      next.startBinding = { ...el.startBinding, elementId: remapId(el.startBinding.elementId) };
    }
    if (el.endBinding && typeof el.endBinding.elementId === "string") {
      next.endBinding = { ...el.endBinding, elementId: remapId(el.endBinding.elementId) };
    }

    return next as T;
  });
}

/** Translates every element by (dx, dy) without mutating inputs. */
export function offsetElements<T extends ExcalidrawElementLike>(
  elements: readonly T[],
  dx: number,
  dy: number,
): T[] {
  return elements.map((el) => ({ ...el, x: el.x + dx, y: el.y + dy }));
}

/** Returns the axis-aligned bounding box of a list of elements. */
export function boundingBox(
  elements: readonly ExcalidrawElementLike[],
): { x: number; y: number; width: number; height: number } | null {
  if (elements.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    const w = typeof el.width === "number" ? el.width : 0;
    const h = typeof el.height === "number" ? el.height : 0;
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + w);
    maxY = Math.max(maxY, el.y + h);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Given a list of elements and a target world-space anchor point (where the
 * user dropped the snippet), returns the elements translated so that their
 * top-left bounding box corner sits at the anchor.
 */
export function placeAtAnchor<T extends ExcalidrawElementLike>(
  elements: readonly T[],
  anchorX: number,
  anchorY: number,
): T[] {
  const bbox = boundingBox(elements);
  if (!bbox) return [...elements];
  const dx = anchorX - bbox.x;
  const dy = anchorY - bbox.y;
  return offsetElements(elements, dx, dy);
}

/** Move elements so the bounding-box center sits at (centerX, centerY). */
export function centerElementsAt<T extends ExcalidrawElementLike>(
  elements: readonly T[],
  centerX: number,
  centerY: number,
): T[] {
  const bbox = boundingBox(elements);
  if (!bbox) return [...elements];
  const dx = centerX - (bbox.x + bbox.width / 2);
  const dy = centerY - (bbox.y + bbox.height / 2);
  return offsetElements(elements, dx, dy);
}

/** Pulls only the currently-selected elements out of a scene. */
export function extractSelected<T extends ExcalidrawElementLike>(
  elements: readonly T[],
  selectedIds: Readonly<Record<string, true>>,
): T[] {
  return elements.filter((el) => selectedIds[el.id]);
}
