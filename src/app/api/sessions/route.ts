import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateRequirements, deriveTitleFromQuestion } from "@/lib/llm";
import { DEFAULT_REQUIREMENTS } from "@/types/domain";

export const runtime = "nodejs";

const CreateSchema = z.object({
  question: z.string().min(3),
  generateRequirements: z.boolean().optional().default(true),
});

export async function GET() {
  const sessions = await prisma.session.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      question: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  const { question } = parsed.data;
  const title = deriveTitleFromQuestion(question);

  let requirements = DEFAULT_REQUIREMENTS;
  if (parsed.data.generateRequirements) {
    try {
      requirements = await generateRequirements({ question });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json(
        { error: `Failed to generate requirements: ${message}` },
        { status: 502 },
      );
    }
  }

  const session = await prisma.session.create({
    data: {
      title,
      question,
      requirementsJson: JSON.stringify(requirements),
      sceneJson: JSON.stringify({ elements: [], appState: {}, files: {} }),
    },
  });

  return NextResponse.json({ session: { id: session.id } }, { status: 201 });
}
