import { notFound } from "next/navigation";
import { SnippetDiagramEditor } from "@/components/SnippetDiagramEditor";
import { ensureBuiltinSnippets } from "@/lib/builtin-snippets/ensure";
import { prisma } from "@/lib/db";
import type { ExcalidrawElementLike } from "@/types/domain";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function SnippetEditPage({ params }: PageProps) {
  await ensureBuiltinSnippets();
  const { id } = await params;

  const snippet = await prisma.snippet.findUnique({ where: { id } });
  if (!snippet) notFound();

  let elements: ExcalidrawElementLike[];
  try {
    elements = JSON.parse(snippet.elementsJson) as ExcalidrawElementLike[];
  } catch {
    notFound();
  }

  return (
    <SnippetDiagramEditor
      snippetId={snippet.id}
      name={snippet.name}
      tags={snippet.tags}
      initialElements={elements}
    />
  );
}
