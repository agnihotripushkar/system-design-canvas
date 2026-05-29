import "dotenv/config";
import { ensureBuiltinSnippets } from "../src/lib/builtin-snippets/ensure";
import { BUILTIN_SNIPPET_DEFINITIONS } from "../src/lib/builtin-snippets/definitions";

async function main() {
  await ensureBuiltinSnippets();
  console.log(`Ensured ${BUILTIN_SNIPPET_DEFINITIONS.length} built-in system design snippets.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
