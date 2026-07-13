import { describe, it, expect, vi, beforeEach } from "vitest";
import { deriveTitleFromQuestion } from "./llm";

const parseMock = vi.fn();

vi.mock("openai", () => {
  return {
    default: class {
      chat = {
        completions: {
          parse: parseMock,
        },
      };
    },
  };
});

vi.mock("openai/helpers/zod", () => ({
  zodResponseFormat: () => ({ type: "json_schema" }),
}));

function completionWith(parsed: unknown, refusal: string | null = null) {
  return { choices: [{ message: { parsed, refusal } }] };
}

describe("deriveTitleFromQuestion", () => {
  it("returns the trimmed question when short", () => {
    expect(deriveTitleFromQuestion("  Design a URL shortener  ")).toBe(
      "Design a URL shortener",
    );
  });

  it("collapses internal whitespace", () => {
    expect(deriveTitleFromQuestion("Design   a\n\nchat app")).toBe(
      "Design a chat app",
    );
  });

  it("truncates long questions to 80 chars with ellipsis", () => {
    const long = "a".repeat(200);
    const title = deriveTitleFromQuestion(long);
    expect(title.length).toBe(80);
    expect(title.endsWith("...")).toBe(true);
  });

  it("returns a fallback for an empty question", () => {
    expect(deriveTitleFromQuestion("   ")).toBe("Untitled session");
  });
});

describe("generateRequirements", () => {
  const validPayload = {
    functional: ["Users can shorten a URL"],
    nonFunctional: ["p99 latency under 100ms"],
    constraints: [],
    assumptions: [],
    scaleEstimates: { dau: null, qps: null, storagePerYear: null, readWriteRatio: null },
  };
  // Matches the wire schema shape but violates the app-level RequirementsSchema
  // (functional/nonFunctional must be non-empty) to exercise the retry path.
  const invalidPayload = {
    functional: [],
    nonFunctional: [],
    constraints: [],
    assumptions: [],
    scaleEstimates: { dau: null, qps: null, storagePerYear: null, readWriteRatio: null },
  };

  beforeEach(() => {
    parseMock.mockReset();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("returns the parsed response from the model", async () => {
    parseMock.mockResolvedValueOnce(completionWith(validPayload));
    const { generateRequirements } = await import("./llm");
    const result = await generateRequirements({ question: "Design a URL shortener" });
    expect(result).toEqual(validPayload);
    expect(parseMock).toHaveBeenCalledTimes(1);
  });

  it("retries once when the first response fails app-level validation, then succeeds", async () => {
    parseMock
      .mockResolvedValueOnce(completionWith(invalidPayload))
      .mockResolvedValueOnce(completionWith(validPayload));
    const { generateRequirements } = await import("./llm");
    const result = await generateRequirements({ question: "Design a URL shortener" });
    expect(result).toEqual(validPayload);
    expect(parseMock).toHaveBeenCalledTimes(2);
  });

  it("throws if both attempts fail app-level validation", async () => {
    parseMock
      .mockResolvedValueOnce(completionWith(invalidPayload))
      .mockResolvedValueOnce(completionWith(invalidPayload));
    const { generateRequirements } = await import("./llm");
    await expect(
      generateRequirements({ question: "Design a URL shortener" }),
    ).rejects.toThrow();
    expect(parseMock).toHaveBeenCalledTimes(2);
  });

  it("throws immediately (no retry) when the model refuses", async () => {
    parseMock.mockResolvedValueOnce(completionWith(null, "unsafe content"));
    const { generateRequirements } = await import("./llm");
    await expect(
      generateRequirements({ question: "Design a URL shortener" }),
    ).rejects.toThrow(/refused/);
    expect(parseMock).toHaveBeenCalledTimes(1);
  });

  it("throws when OPENAI_API_KEY is not set", async () => {
    delete process.env.OPENAI_API_KEY;
    const { generateRequirements } = await import("./llm");
    await expect(
      generateRequirements({ question: "Design a URL shortener" }),
    ).rejects.toThrow(/OPENAI_API_KEY/);
  });

  it("rejects an empty question", async () => {
    const { generateRequirements } = await import("./llm");
    await expect(generateRequirements({ question: "   " })).rejects.toThrow(
      /must not be empty/,
    );
  });
});
