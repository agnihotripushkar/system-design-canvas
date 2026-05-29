import { NextResponse } from "next/server";
import { z } from "zod";
import { generateRequirements } from "@/lib/llm";

export const runtime = "nodejs";

const RequestSchema = z.object({
  question: z.string().min(3, "Question must be at least 3 characters"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  try {
    const requirements = await generateRequirements({ question: parsed.data.question });
    return NextResponse.json({ requirements });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("OPENAI_API_KEY") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
