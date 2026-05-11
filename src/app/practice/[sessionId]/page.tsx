import { notFound } from "next/navigation";
import { CanvasWorkspace } from "@/components/CanvasWorkspace";
import { prisma } from "@/lib/db";
import { DEFAULT_REQUIREMENTS, RequirementsSchema, type Requirements } from "@/types/domain";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

type Scene = {
  elements: Array<Record<string, unknown> & { id: string; type: string; x: number; y: number }>;
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
};

const EMPTY_SCENE: Scene = { elements: [], appState: {}, files: {} };

function parseRequirements(json: string): Requirements {
  try {
    const parsed = JSON.parse(json);
    const result = RequirementsSchema.safeParse(parsed);
    if (result.success) return result.data;
  } catch {
    // fall through
  }
  return DEFAULT_REQUIREMENTS;
}

function parseScene(json: string): Scene {
  try {
    const parsed = JSON.parse(json) as Partial<Scene>;
    return {
      elements: Array.isArray(parsed.elements) ? (parsed.elements as Scene["elements"]) : [],
      appState: typeof parsed.appState === "object" && parsed.appState ? parsed.appState : {},
      files: typeof parsed.files === "object" && parsed.files ? parsed.files : {},
    };
  } catch {
    return EMPTY_SCENE;
  }
}

export default async function PracticePage({ params }: PageProps) {
  const { sessionId } = await params;
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) notFound();

  const requirements = parseRequirements(session.requirementsJson);
  const scene = parseScene(session.sceneJson);

  return (
    <CanvasWorkspace
      sessionId={session.id}
      title={session.title}
      question={session.question}
      requirements={requirements}
      initialScene={scene}
    />
  );
}
