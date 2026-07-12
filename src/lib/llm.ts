import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { RequirementsSchema, type Requirements } from "@/types/domain";

const DEFAULT_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are an expert system-design coach helping a candidate practice solo.

Given a system design question, produce:
- functional: 4-8 concrete functional requirements
- nonFunctional: 4-8 non-functional requirements (latency, availability, durability, consistency, security)
- constraints: hard limits the candidate should respect (e.g., budget, regions, compliance)
- assumptions: 3-6 assumptions a candidate would clarify upfront
- scaleEstimates: back-of-the-envelope numbers, written as short human strings (e.g. "100M DAU", "~50k QPS", "~5 PB/year", "100:1"), or null if a field genuinely does not apply

Each list item must be one sentence, action-oriented, concrete.`;

// Schema handed to OpenAI's structured-output mode. Kept free of refinements
// (.min(), etc.) since strict JSON-schema mode only supports plain shapes;
// the stricter app-level RequirementsSchema is validated separately below.
const WireRequirementsSchema = z.object({
  functional: z.array(z.string()),
  nonFunctional: z.array(z.string()),
  constraints: z.array(z.string()),
  assumptions: z.array(z.string()),
  scaleEstimates: z.object({
    dau: z.string().nullable(),
    qps: z.string().nullable(),
    storagePerYear: z.string().nullable(),
    readWriteRatio: z.string().nullable(),
  }),
});

export type GenerateRequirementsInput = {
  question: string;
};

class RequirementsParseError extends Error {}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to your .env file before calling /api/requirements.",
    );
  }
  return new OpenAI({ apiKey });
}

function validate(parsed: unknown): Requirements {
  const result = RequirementsSchema.safeParse(parsed);
  if (!result.success) {
    throw new RequirementsParseError(
      `LLM JSON did not match required schema: ${result.error.message}`,
    );
  }
  return result.data;
}

async function callOpenAI(
  client: OpenAI,
  question: string,
  retryFeedback?: string,
): Promise<unknown> {
  const userMessage = retryFeedback
    ? `Your previous response could not be used: ${retryFeedback}\n\nQuestion:\n\n${question}`
    : `Generate the requirements for this system design question:\n\n${question}`;

  const completion = await client.chat.completions.parse({
    model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
    max_tokens: 1500,
    response_format: zodResponseFormat(WireRequirementsSchema, "requirements"),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const message = completion.choices[0]?.message;
  if (message?.refusal) {
    throw new Error(`OpenAI refused the request: ${message.refusal}`);
  }
  if (!message?.parsed) {
    throw new Error("OpenAI returned an empty response");
  }
  return message.parsed;
}

export async function generateRequirements({
  question,
}: GenerateRequirementsInput): Promise<Requirements> {
  const client = getClient();
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("Question must not be empty");
  }

  const first = await callOpenAI(client, trimmed);
  try {
    return validate(first);
  } catch (err) {
    if (!(err instanceof RequirementsParseError)) throw err;
    const second = await callOpenAI(client, trimmed, err.message);
    return validate(second);
  }
}

export function deriveTitleFromQuestion(question: string): string {
  const trimmed = question.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Untitled session";
  if (trimmed.length <= 80) return trimmed;
  return `${trimmed.slice(0, 77).trimEnd()}...`;
}
