import { prisma } from "@/lib/db";
import { isSnippetCustomized } from "@/lib/snippet-tags";
import {
  BUILTIN_SNIPPET_DEFINITIONS,
  builtinSlugFromId,
  builtinSnippetId,
} from "@/lib/builtin-snippets/definitions";

/** Insert missing built-ins; refresh diagram for non-customized built-ins. */
export async function ensureBuiltinSnippets(): Promise<void> {
  for (const def of BUILTIN_SNIPPET_DEFINITIONS) {
    const id = builtinSnippetId(def.slug);
    const elementsJson = JSON.stringify(def.build());
    const existing = await prisma.snippet.findUnique({ where: { id } });

    if (!existing) {
      await prisma.snippet.create({
        data: {
          id,
          name: def.name,
          description: def.description,
          elementsJson,
          tags: def.tags,
          thumbnailDataUrl: null,
        },
      });
      continue;
    }

    if (isSnippetCustomized(existing.tags)) continue;

    await prisma.snippet.update({
      where: { id },
      data: {
        name: def.name,
        description: def.description,
        elementsJson,
        tags: def.tags,
        thumbnailDataUrl: null,
      },
    });
  }
}

export async function resetBuiltinSnippet(id: string): Promise<boolean> {
  const slug = builtinSlugFromId(id);
  if (!slug) return false;
  const def = BUILTIN_SNIPPET_DEFINITIONS.find((d) => d.slug === slug);
  if (!def) return false;

  await prisma.snippet.update({
    where: { id },
    data: {
      name: def.name,
      description: def.description,
      elementsJson: JSON.stringify(def.build()),
      tags: def.tags,
      thumbnailDataUrl: null,
    },
  });
  return true;
}
