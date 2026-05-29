import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { scheduleSessionGithubSync } from "@/lib/github-sync-session";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const PatchSchema = z
  .object({
    title: z.string().min(1).optional(),
    sceneJson: z.string().optional(),
    requirementsJson: z.string().optional(),
  })
  .refine((d) => d.title || d.sceneJson || d.requirementsJson, {
    message: "Provide at least one field to update",
  });

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ session });
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

  try {
    const updated = await prisma.session.update({
      where: { id },
      data: parsed.data,
      select: { id: true, updatedAt: true, githubSyncedAt: true, githubSyncError: true },
    });

    if (parsed.data.sceneJson !== undefined) {
      scheduleSessionGithubSync(id);
    }

    return NextResponse.json({ session: updated });
  } catch {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    await prisma.session.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
}
