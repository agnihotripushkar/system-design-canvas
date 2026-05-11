import { z } from "zod";

export const RequirementsSchema = z.object({
  functional: z.array(z.string()).min(1),
  nonFunctional: z.array(z.string()).min(1),
  constraints: z.array(z.string()),
  assumptions: z.array(z.string()),
  scaleEstimates: z.object({
    dau: z.string().optional().nullable(),
    qps: z.string().optional().nullable(),
    storagePerYear: z.string().optional().nullable(),
    readWriteRatio: z.string().optional().nullable(),
  }),
});

export type Requirements = z.infer<typeof RequirementsSchema>;

export const SessionSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  question: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SessionSummary = z.infer<typeof SessionSummarySchema>;

export const SnippetSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  thumbnailDataUrl: z.string().nullable(),
  tags: z.string(),
  createdAt: z.string(),
});
export type SnippetSummary = z.infer<typeof SnippetSummarySchema>;

/** Excalidraw element shape — kept loose to avoid coupling to internal types. */
export type ExcalidrawElementLike = {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  groupIds?: string[];
  boundElements?: { id: string; type: string }[] | null;
  startBinding?: { elementId: string; [k: string]: unknown } | null;
  endBinding?: { elementId: string; [k: string]: unknown } | null;
  containerId?: string | null;
  frameId?: string | null;
  [k: string]: unknown;
};

export const DEFAULT_REQUIREMENTS: Requirements = {
  functional: [],
  nonFunctional: [],
  constraints: [],
  assumptions: [],
  scaleEstimates: {
    dau: null,
    qps: null,
    storagePerYear: null,
    readWriteRatio: null,
  },
};
