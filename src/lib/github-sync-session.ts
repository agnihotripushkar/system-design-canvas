import { auth } from "@/auth";
import { putFileInRepo } from "@/lib/github-contents";
import { getGithubRepoSettings } from "@/lib/github-settings";
import { prisma } from "@/lib/db";

const DEBOUNCE_MS = 12_000;
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function sessionFilePath(sessionId: string): string {
  return `sessions/${sessionId}.json`;
}

function buildSessionPayload(session: {
  id: string;
  title: string;
  question: string;
  requirementsJson: string;
  sceneJson: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: session.id,
    title: session.title,
    question: session.question,
    requirements: JSON.parse(session.requirementsJson),
    scene: JSON.parse(session.sceneJson),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    exportedFrom: "system-design-canvas",
  };
}

export async function syncSessionToGithubNow(sessionId: string): Promise<{
  ok: boolean;
  error?: string;
  skipped?: string;
}> {
  const authSession = await auth();
  const accessToken = authSession?.accessToken;
  if (!accessToken) {
    return { ok: false, skipped: "Not signed in with GitHub" };
  }

  const repo = await getGithubRepoSettings();
  if (!repo) {
    return { ok: false, skipped: "No GitHub repository configured" };
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) {
    return { ok: false, error: "Session not found" };
  }

  try {
    const content = JSON.stringify(buildSessionPayload(session), null, 2);
    const path = sessionFilePath(sessionId);
    await putFileInRepo(
      accessToken,
      repo,
      path,
      content,
      `Update practice session: ${session.title}`,
    );

    await prisma.session.update({
      where: { id: sessionId },
      data: { githubSyncedAt: new Date(), githubSyncError: null },
    });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await prisma.session.update({
      where: { id: sessionId },
      data: { githubSyncError: message },
    });
    return { ok: false, error: message };
  }
}

/** Debounced sync while the user is actively solving on the canvas. */
export function scheduleSessionGithubSync(sessionId: string): void {
  const existing = pendingTimers.get(sessionId);
  if (existing) clearTimeout(existing);

  pendingTimers.set(
    sessionId,
    setTimeout(() => {
      pendingTimers.delete(sessionId);
      void syncSessionToGithubNow(sessionId);
    }, DEBOUNCE_MS),
  );
}
