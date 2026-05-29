import type { ExcalidrawElementLike } from "@/types/domain";

const FONT_VIRGIL = 1;
const ROUNDNESS_PROPORTIONAL = 2;

type BoxOpts = {
  x?: number;
  y?: number;
  width: number;
  height: number;
  strokeColor?: string;
  backgroundColor?: string;
};

function base(partial: ExcalidrawElementLike): ExcalidrawElementLike {
  return {
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    angle: 0,
    seed: Math.floor(Math.random() * 2_147_483_647),
    version: 1,
    versionNonce: Math.floor(Math.random() * 2_147_483_647),
    index: null,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    roundness: null,
    ...partial,
  };
}

function fontSizeForLabel(text: string): number {
  if (text.length <= 6) return 22;
  if (text.length <= 12) return 18;
  return 15;
}

/** Shape with centered label bound inside (Excalidraw container text). */
export function shapeWithLabel(
  shapeId: string,
  textId: string,
  shape: ExcalidrawElementLike,
  text: string,
): ExcalidrawElementLike[] {
  const fontSize = fontSizeForLabel(text);
  const shapeEl = base({
    ...shape,
    id: shapeId,
    boundElements: [{ id: textId, type: "text" }],
  });
  const textEl = base({
    id: textId,
    type: "text",
    x: shapeEl.x as number,
    y: shapeEl.y as number,
    width: shapeEl.width as number,
    height: shapeEl.height as number,
    text,
    originalText: text,
    fontSize,
    fontFamily: FONT_VIRGIL,
    textAlign: "center",
    verticalAlign: "middle",
    containerId: shapeId,
    autoResize: false,
    lineHeight: 1.2,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
  });
  return [shapeEl, textEl];
}

export function rect(id: string, opts: BoxOpts): ExcalidrawElementLike {
  return base({
    id,
    type: "rectangle",
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    width: opts.width,
    height: opts.height,
    strokeColor: opts.strokeColor ?? "#1e1e1e",
    backgroundColor: opts.backgroundColor ?? "#ffffff",
    roundness: { type: ROUNDNESS_PROPORTIONAL },
  });
}

export function ellipse(id: string, opts: BoxOpts): ExcalidrawElementLike {
  return base({
    id,
    type: "ellipse",
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    width: opts.width,
    height: opts.height,
    strokeColor: opts.strokeColor ?? "#1e1e1e",
    backgroundColor: opts.backgroundColor ?? "#ffffff",
  });
}

export function diamond(id: string, opts: BoxOpts): ExcalidrawElementLike {
  return base({
    id,
    type: "diamond",
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    width: opts.width,
    height: opts.height,
    strokeColor: opts.strokeColor ?? "#1e1e1e",
    backgroundColor: opts.backgroundColor ?? "#ffffff",
  });
}

export function boxWithLabel(
  slug: string,
  labelText: string,
  opts: {
    width?: number;
    height?: number;
    strokeColor?: string;
    backgroundColor?: string;
    shape?: "rectangle" | "diamond";
  } = {},
): ExcalidrawElementLike[] {
  const w = opts.width ?? 200;
  const h = opts.height ?? 88;
  const shapeId = `${slug}-shape`;
  const textId = `${slug}-label`;
  const shape =
    opts.shape === "diamond"
      ? diamond(shapeId, {
          x: 0,
          y: 0,
          width: w,
          height: h,
          strokeColor: opts.strokeColor,
          backgroundColor: opts.backgroundColor,
        })
      : rect(shapeId, {
          x: 0,
          y: 0,
          width: w,
          height: h,
          strokeColor: opts.strokeColor,
          backgroundColor: opts.backgroundColor,
        });

  return shapeWithLabel(shapeId, textId, shape, labelText);
}

/** Classic system-design cylinder; label sits on the body rectangle. */
export function cylinder(
  prefix: string,
  opts: {
    x?: number;
    y?: number;
    width: number;
    height: number;
    strokeColor?: string;
    backgroundColor?: string;
    label: string;
  },
): ExcalidrawElementLike[] {
  const x = opts.x ?? 0;
  const y = opts.y ?? 0;
  const capH = Math.max(22, Math.round(opts.height * 0.16));
  const bodyH = opts.height - capH;
  const stroke = opts.strokeColor ?? "#1971c2";
  const fill = opts.backgroundColor ?? "#d0ebff";
  const bodyId = `${prefix}-body`;
  const labelId = `${prefix}-label`;

  const top = ellipse(`${prefix}-top`, {
    x,
    y,
    width: opts.width,
    height: capH,
    strokeColor: stroke,
    backgroundColor: fill,
  });
  const bodyShape = rect(bodyId, {
    x,
    y: y + capH / 2,
    width: opts.width,
    height: bodyH,
    strokeColor: stroke,
    backgroundColor: fill,
  });
  const bottom = ellipse(`${prefix}-bottom`, {
    x,
    y: y + bodyH - capH / 2,
    width: opts.width,
    height: capH,
    strokeColor: stroke,
    backgroundColor: fill,
  });
  const [body, labelEl] = shapeWithLabel(bodyId, labelId, bodyShape, opts.label);

  return [top, body, bottom, labelEl];
}

export function groupElements(
  slug: string,
  elements: ExcalidrawElementLike[],
): ExcalidrawElementLike[] {
  const groupId = `builtin-grp-${slug}`;
  return elements.map((el) => ({ ...el, groupIds: [groupId] }));
}
