import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listUserRepos } from "@/lib/github-contents";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Sign in with GitHub first." }, { status: 401 });
  }

  try {
    const repos = await listUserRepos(session.accessToken);
    return NextResponse.json({ repos });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list repositories" },
      { status: 502 },
    );
  }
}
