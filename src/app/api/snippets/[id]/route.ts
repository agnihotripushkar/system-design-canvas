import { NextResponse } from "next/server";
import { z } from "zod";
import { isBuiltinSnippetId } from "@/lib/builtin-snippets/definitions";
import { prisma } from "@/lib/db";
import { isSnippetCustomized, tagsWithCustomized } from "@/lib/snippet-tags";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const PatchSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    tags: z.string().max(200).optional(),
    elementsJson: z.string().min(2).optional(),
    thumbnailDataUrl: z.string().nullable().optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.description !== undefined ||
      d.tags !== undefined ||
      d.elementsJson !== undefined ||
      d.thumbnailDataUrl !== undefined,
    { message: "Provide at least one field to update" },
  );

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const snippet = await prisma.snippet.findUnique({ where: { id } });
  if (!snippet) {
    return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
  }
  return NextResponse.json({ snippet });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  const existing = await prisma.snippet.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
  }

  const data: {
    name?: string;
    description?: string | null;
    tags?: string;
    elementsJson?: string;
    thumbnailDataUrl?: string | null;
  } = { ...parsed.data };

  if (parsed.data.elementsJson !== undefined) {
    data.tags = tagsWithCustomized(parsed.data.tags ?? existing.tags);
  }

  try {
    const updated = await prisma.snippet.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        thumbnailDataUrl: true,
        tags: true,
        createdAt: true,
      },
    });
    return NextResponse.json({
      snippet: {
        ...updated,
        customized: isSnippetCustomized(updated.tags),
      },
    });
  } catch {
    return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (isBuiltinSnippetId(id)) {
    return NextResponse.json(
      { error: "Built-in snippets cannot be deleted. Reset to default or edit the diagram instead." },
      { status: 403 },
    );
  }
  try {
    await prisma.snippet.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
  }
}
