import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureBuiltinSnippets } from "@/lib/builtin-snippets/ensure";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  elementsJson: z.string().min(2),
  thumbnailDataUrl: z.string().optional().nullable(),
  tags: z.string().max(200).optional().default(""),
});

export async function GET() {
  await ensureBuiltinSnippets();

  const snippets = await prisma.snippet.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      thumbnailDataUrl: true,
      tags: true,
      createdAt: true,
    },
  });

  const sorted = [...snippets].sort((a, b) => {
    const aBuiltin = a.tags.includes("builtin");
    const bBuiltin = b.tags.includes("builtin");
    if (aBuiltin !== bBuiltin) return aBuiltin ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ snippets: sorted });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  const snippet = await prisma.snippet.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      elementsJson: parsed.data.elementsJson,
      thumbnailDataUrl: parsed.data.thumbnailDataUrl ?? null,
      tags: parsed.data.tags ?? "",
    },
    select: {
      id: true,
      name: true,
      description: true,
      thumbnailDataUrl: true,
      tags: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ snippet }, { status: 201 });
}
