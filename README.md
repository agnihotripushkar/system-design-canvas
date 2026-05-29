# System Design Canvas

A solo system-design practice app. Paste a question, get LLM-generated
functional + non-functional requirements, and sketch your design on an
Excalidraw-style canvas. Save reusable snippets (e.g. a "load balancer + 3
app servers" cluster) and drag them onto future questions.

Single-user, runs locally. Designs persist to a local SQLite file. Optional
GitHub sign-in saves each practice session to a repo you choose.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Prisma 7 + SQLite (via `@prisma/adapter-better-sqlite3`)
- [`@excalidraw/excalidraw`](https://www.npmjs.com/package/@excalidraw/excalidraw) embedded as the canvas
- OpenAI (`openai`) for requirement generation
- Zod for API validation

## Setup

1. Install dependencies (this also runs `prisma generate`):

   ```bash
   npm install
   ```

2. Copy the env file and add your keys:

   ```bash
   cp .env.example .env
   ```

   - **OpenAI** — set `OPENAI_API_KEY` ([get a key](https://platform.openai.com/api-keys)).
   - **GitHub (optional)** — create an [OAuth App](https://github.com/settings/developers)
     with callback `http://localhost:3000/api/auth/callback/github`, then set
     `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, and `AUTH_SECRET` (any random string,
     e.g. `openssl rand -base64 32`).

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

   Either path generates requirements via OpenAI and drops you into the
   workspace.
2. OpenAI generates requirements and you land in the practice workspace:
   - **Left pane**: question + tabs for Functional / Non-Functional /
     Constraints / Assumptions / Scale.
   - **Center**: full Excalidraw canvas. Autosaves every ~1.5s.
   - **Right pane**: snippet library. Search and drag onto the canvas.
3. To save a reusable snippet: select elements on the canvas, click
   **Save selection as snippet** in the top toolbar, name it.
4. To reuse a snippet: drag it from the right pane onto the canvas. Element
   IDs are regenerated and the snippet is positioned at the drop point.
5. The snippet library includes **built-in system design shapes** (database
   cylinder, Redis, load balancer, CDN, queues, etc.). Drag them onto any
   canvas. Save your own selections with **Save selection as snippet**.
6. Manage custom snippets (rename, add description, tags, delete) at
   <http://localhost:3000/snippets>.
7. **Save to GitHub** — on the home page, **Sign in with GitHub**, choose a
   repository, and click **Save repo**. Each question you start is written to
   `sessions/<id>.json` in that repo and updated as you draw (~every 12 seconds).

## Scripts

| Script               | What it does                                   |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Start the Next.js dev server                   |
| `npm run build`      | Production build                               |
| `npm run start`      | Run the production build                       |
| `npm run lint`       | Run ESLint                                     |
| `npm run db:push`    | Apply `prisma/schema.prisma` to the SQLite db  |
| `npm run db:seed`    | Insert built-in system design snippets         |
| `npm run db:generate`| Regenerate the Prisma client                   |

## Configuration

`.env` keys:

- `DATABASE_URL` — SQLite path. Default: `file:./dev.db` (project root).
- `OPENAI_API_KEY` — required for `/api/requirements`.
- `OPENAI_MODEL` — optional, defaults to `gpt-4o-mini`.
- `GITHUB_TOKEN` — personal access token with `repo` scope; required for GitHub backup.
- `GITHUB_REPO` — optional default repository (`owner/name` or full GitHub URL).

## Project layout

```
src/
  app/
    page.tsx                       Home: sessions list + new question form
    practice/[sessionId]/page.tsx  Three-pane workspace
    snippets/page.tsx              Manage saved snippets
    api/
      requirements/route.ts        POST { question } -> OpenAI
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
    llm.ts                         OpenAI client + prompt + retry
    excalidraw-utils.ts            id regen, offset, place at anchor
    question-bank.ts               Curated BE / Android / iOS questions
  types/
    domain.ts                      Zod schemas + element type aliases
prisma/
  schema.prisma                    Session, Snippet models
```

## Notes & limitations (v1)

- Single-user. No auth or multi-tab collaboration.
- Snippet library shows name and description (no image preview); use **Edit diagram**
  to see or change the shape.
- Excalidraw's built-in export menu is preserved, so you can still export the
  full canvas to PNG/SVG manually.
- No version history per session beyond the latest autosaved scene.
