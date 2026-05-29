import { NextResponse } from "next/server";
import { isBuiltinSnippetId } from "@/lib/builtin-snippets/definitions";
import { resetBuiltinSnippet } from "@/lib/builtin-snippets/ensure";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  if (!isBuiltinSnippetId(id)) {
    return NextResponse.json(
      { error: "Only built-in snippets can be reset to the default diagram." },
      { status: 400 },
    );
  }

  const ok = await resetBuiltinSnippet(id);
  if (!ok) {
    return NextResponse.json({ error: "Unknown built-in snippet" }, { status: 404 });
  }

  const snippet = await prisma.snippet.findUnique({ where: { id } });
  if (!snippet) {
    return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
  }

  return NextResponse.json({ snippet });
}
