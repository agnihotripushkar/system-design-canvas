# System Design Canvas

A solo system-design practice app. Paste a question, get LLM-generated
functional + non-functional requirements, and sketch your design on an
Excalidraw-style canvas. Save reusable snippets (e.g. a "load balancer + 3
app servers" cluster) and drag them onto future questions.

Single-user, runs locally. No login. Designs persist to a local SQLite file.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Prisma 7 + SQLite (via `@prisma/adapter-better-sqlite3`)
- [`@excalidraw/excalidraw`](https://www.npmjs.com/package/@excalidraw/excalidraw) embedded as the canvas
- Anthropic Claude (`@anthropic-ai/sdk`) for requirement generation
- Zod for API validation

## Setup

1. Install dependencies (this also runs `prisma generate`):

   ```bash
   npm install
   ```

2. Copy the env file and add your Anthropic API key:

   ```bash
   cp .env.example .env
   # then edit .env and set ANTHROPIC_API_KEY
   ```

   Get a key at <https://console.anthropic.com/>.

3. Create the local SQLite database:

   ```bash
   npm run db:push
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

## Usage

1. On the home page you have two options:
   - **Question bank** — pick a curated question from the **Backend**,
     **Mobile · Android**, or **Mobile · iOS** track. Each card has a
     "Start" button (use as-is) or "Edit before starting" (drop the prompt
     into the custom editor first).
   - **Start your own** — paste any system-design question.

   Either path generates requirements via Claude and drops you into the
   workspace.
2. Claude generates requirements and you land in the practice workspace:
   - **Left pane**: question + tabs for Functional / Non-Functional /
     Constraints / Assumptions / Scale.
   - **Center**: full Excalidraw canvas. Autosaves every ~1.5s.
   - **Right pane**: snippet library. Search and drag onto the canvas.
3. To save a reusable snippet: select elements on the canvas, click
   **Save selection as snippet** in the top toolbar, name it.
4. To reuse a snippet: drag it from the right pane onto the canvas. Element
   IDs are regenerated and the snippet is positioned at the drop point.
5. Manage snippets (rename, add description, tags, delete) at
   <http://localhost:3000/snippets>.

## Scripts

| Script               | What it does                                   |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Start the Next.js dev server                   |
| `npm run build`      | Production build                               |
| `npm run start`      | Run the production build                       |
| `npm run lint`       | Run ESLint                                     |
| `npm run db:push`    | Apply `prisma/schema.prisma` to the SQLite db  |
| `npm run db:generate`| Regenerate the Prisma client                   |

## Configuration

`.env` keys:

- `DATABASE_URL` — SQLite path. Default: `file:./dev.db` (project root).
- `ANTHROPIC_API_KEY` — required for `/api/requirements`.
- `ANTHROPIC_MODEL` — optional, defaults to `claude-sonnet-4-5-20250929`.

## Project layout

```
src/
  app/
    page.tsx                       Home: sessions list + new question form
    practice/[sessionId]/page.tsx  Three-pane workspace
    snippets/page.tsx              Manage saved snippets
    api/
      requirements/route.ts        POST { question } -> Claude
      sessions/route.ts            GET list, POST create
      sessions/[id]/route.ts       GET, PATCH (autosave), DELETE
      snippets/route.ts            GET list, POST create
      snippets/[id]/route.ts       GET, PATCH, DELETE
  components/
    CanvasWorkspace.tsx            Top-level practice workspace
    ExcalidrawCanvas.tsx           SSR-off Excalidraw wrapper
    QuestionPanel.tsx              Left pane (requirements tabs)
    SnippetsPanel.tsx              Right pane (drag source)
    StartSessionPanel.tsx          Home page tabs: bank vs custom
    SnippetsManager.tsx            /snippets list editor
  lib/
    db.ts                          Prisma client singleton (better-sqlite3)
    llm.ts                         Anthropic client + prompt + retry
    excalidraw-utils.ts            id regen, offset, place at anchor
    question-bank.ts               Curated BE / Android / iOS questions
  types/
    domain.ts                      Zod schemas + element type aliases
prisma/
  schema.prisma                    Session, Snippet models
```

## Notes & limitations (v1)

- Single-user. No auth or multi-tab collaboration.
- Snippet thumbnails use the canvas' current background and are best-effort;
  if generation fails, the snippet still saves without a preview.
- Excalidraw's built-in export menu is preserved, so you can still export the
  full canvas to PNG/SVG manually.
- No version history per session beyond the latest autosaved scene.
