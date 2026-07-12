import { describe, it, expect, vi, beforeEach } from "vitest";

const generateRequirementsMock = vi.fn();

vi.mock("@/lib/llm", () => ({
  generateRequirements: generateRequirementsMock,
}));

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/requirements", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/requirements", () => {
  beforeEach(() => {
    generateRequirementsMock.mockReset();
  });

  it("returns 400 for a non-JSON body", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/requirements", {
      method: "POST",
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when the question is too short", async () => {
    const { POST } = await import("./route");
    const response = await POST(jsonRequest({ question: "hi" }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/at least 3 characters/);
  });

  it("returns generated requirements on success", async () => {
    const requirements = { functional: ["a"], nonFunctional: ["b"] };
    generateRequirementsMock.mockResolvedValueOnce(requirements);
    const { POST } = await import("./route");
    const response = await POST(jsonRequest({ question: "Design a URL shortener" }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.requirements).toEqual(requirements);
  });

  it("returns 502 when the LLM call fails", async () => {
    generateRequirementsMock.mockRejectedValueOnce(new Error("boom"));
    const { POST } = await import("./route");
    const response = await POST(jsonRequest({ question: "Design a URL shortener" }));
    expect(response.status).toBe(502);
  });

  it("returns 500 when OPENAI_API_KEY is missing", async () => {
    generateRequirementsMock.mockRejectedValueOnce(new Error("OPENAI_API_KEY is not set"));
    const { POST } = await import("./route");
    const response = await POST(jsonRequest({ question: "Design a URL shortener" }));
    expect(response.status).toBe(500);
  });
});
