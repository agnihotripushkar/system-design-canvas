import Anthropic from "@anthropic-ai/sdk";
import { RequirementsSchema, type Requirements } from "@/types/domain";

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

const SYSTEM_PROMPT = `You are an expert system-design coach helping a candidate practice solo.

When given a system design question, return ONLY a JSON object with the following exact shape (no prose, no markdown fences):

{
  "functional": string[],            // 4-8 concrete functional requirements
  "nonFunctional": string[],         // 4-8 non-functional requirements (latency, availability, durability, consistency, security)
  "constraints": string[],           // hard limits the candidate should respect (e.g., budget, regions, compliance)
  "assumptions": string[],           // 3-6 assumptions a candidate would clarify upfront
  "scaleEstimates": {                // back-of-the-envelope numbers, written as short human strings
    "dau": string | null,
    "qps": string | null,
    "storagePerYear": string | null,
    "readWriteRatio": string | null
  }
}

Rules:
- Each list item must be one sentence, action-oriented, concrete.
- Prefer numbers in scaleEstimates ("100M DAU", "~50k QPS", "~5 PB/year", "100:1").
- If a field genuinely does not apply, return an empty array (or null inside scaleEstimates), never omit a key.
- Do NOT wrap the JSON in code fences or commentary. The first character of your response must be "{".`;

export type GenerateRequirementsInput = {
  question: string;
};

class RequirementsParseError extends Error {
  constructor(
    message: string,
    public raw: string,
  ) {
    super(message);
  }
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your .env file before calling /api/requirements.",
    );
  }
  return new Anthropic({ apiKey });
}

function extractText(message: Anthropic.Messages.Message): string {
  return message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
}

function tryParse(raw: string): Requirements {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new RequirementsParseError("LLM response did not contain a JSON object", raw);
  }
  const slice = text.slice(firstBrace, lastBrace + 1);
  let parsed: unknown;
  try {
    parsed = JSON.parse(slice);
  } catch (err) {
    throw new RequirementsParseError(
      `LLM response was not valid JSON: ${(err as Error).message}`,
      raw,
    );
  }
  const result = RequirementsSchema.safeParse(parsed);
  if (!result.success) {
    throw new RequirementsParseError(
      `LLM JSON did not match required schema: ${result.error.message}`,
      raw,
    );
  }
  return result.data;
}

async function callClaude(
  client: Anthropic,
  question: string,
  retryFeedback?: string,
): Promise<string> {
  const userMessage = retryFeedback
    ? `Your previous response could not be parsed: ${retryFeedback}\n\nReturn ONLY valid JSON matching the schema. Question:\n\n${question}`
    : `Generate the requirements JSON for this system design question:\n\n${question}`;

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  return extractText(message);
}

export async function generateRequirements({
  question,
}: GenerateRequirementsInput): Promise<Requirements> {
  const client = getClient();
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("Question must not be empty");
  }

  const firstRaw = await callClaude(client, trimmed);
  try {
    return tryParse(firstRaw);
  } catch (err) {
    if (!(err instanceof RequirementsParseError)) throw err;
    const secondRaw = await callClaude(client, trimmed, err.message);
    return tryParse(secondRaw);
  }
}

export function deriveTitleFromQuestion(question: string): string {
  const trimmed = question.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Untitled session";
  if (trimmed.length <= 80) return trimmed;
  return `${trimmed.slice(0, 77).trimEnd()}...`;
}
