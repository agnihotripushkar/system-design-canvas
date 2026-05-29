import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getGithubSettingsResponse, saveGithubRepoSettings } from "@/lib/github-settings";

export const runtime = "nodejs";

const BodySchema = z.object({
  repo: z.string().min(3),
});

export async function GET() {
  const session = await auth();
  const settings = await getGithubSettingsResponse();
  return NextResponse.json({
    ...settings,
    signedIn: Boolean(session?.user),
    user: session?.user
      ? { name: session.user.name, image: session.user.image, login: session.user.name }
      : null,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Sign in with GitHub first." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  try {
    const saved = await saveGithubRepoSettings(parsed.data.repo);
    return NextResponse.json({
      ok: true,
      repo: `${saved.owner}/${saved.name}`,
      branch: saved.branch,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save settings" },
      { status: 400 },
    );
  }
}
