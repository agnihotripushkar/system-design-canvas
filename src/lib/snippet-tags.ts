export const SNIPPET_CUSTOMIZED_TAG = "customized";

export function isSnippetCustomized(tags: string): boolean {
  return tags
    .split(",")
    .map((t) => t.trim())
    .includes(SNIPPET_CUSTOMIZED_TAG);
}

export function tagsWithCustomized(tags: string): string {
  if (isSnippetCustomized(tags)) return tags;
  const trimmed = tags.trim();
  return trimmed ? `${trimmed},${SNIPPET_CUSTOMIZED_TAG}` : SNIPPET_CUSTOMIZED_TAG;
}

export function tagsWithoutCustomized(tags: string): string {
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t && t !== SNIPPET_CUSTOMIZED_TAG)
    .join(",");
}
