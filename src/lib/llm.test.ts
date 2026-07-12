import { describe, it, expect, vi, beforeEach } from "vitest";
import { deriveTitleFromQuestion } from "./llm";

const createMock = vi.fn();

vi.mock("openai", () => {
  return {
    default: class {
      chat = {
        completions: {
          create: createMock,
        },
      };
    },
  };
});

function completionWith(content: string) {
  return { choices: [{ message: { content } }] };
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

  beforeEach(() => {
    createMock.mockReset();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("parses a valid JSON response from the model", async () => {
    createMock.mockResolvedValueOnce(completionWith(JSON.stringify(validPayload)));
    const { generateRequirements } = await import("./llm");
    const result = await generateRequirements({ question: "Design a URL shortener" });
    expect(result).toEqual(validPayload);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("strips markdown code fences before parsing", async () => {
    createMock.mockResolvedValueOnce(
      completionWith("```json\n" + JSON.stringify(validPayload) + "\n```"),
    );
    const { generateRequirements } = await import("./llm");
    const result = await generateRequirements({ question: "Design a URL shortener" });
    expect(result).toEqual(validPayload);
  });

  it("retries once when the first response fails schema validation, then succeeds", async () => {
    createMock
      .mockResolvedValueOnce(completionWith("not json at all"))
      .mockResolvedValueOnce(completionWith(JSON.stringify(validPayload)));
    const { generateRequirements } = await import("./llm");
    const result = await generateRequirements({ question: "Design a URL shortener" });
    expect(result).toEqual(validPayload);
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("throws if both attempts fail to produce valid JSON", async () => {
    createMock
      .mockResolvedValueOnce(completionWith("nope"))
      .mockResolvedValueOnce(completionWith("still nope"));
    const { generateRequirements } = await import("./llm");
    await expect(
      generateRequirements({ question: "Design a URL shortener" }),
    ).rejects.toThrow();
    expect(createMock).toHaveBeenCalledTimes(2);
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
