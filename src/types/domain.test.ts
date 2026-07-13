import { describe, it, expect } from "vitest";
import { RequirementsSchema } from "./domain";

describe("RequirementsSchema", () => {
  const base = {
    functional: ["Users can sign up"],
    nonFunctional: ["99.9% uptime"],
    constraints: [],
    assumptions: [],
    scaleEstimates: { dau: null, qps: null, storagePerYear: null, readWriteRatio: null },
  };

  it("accepts a well-formed payload", () => {
    expect(RequirementsSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an empty functional list", () => {
    const result = RequirementsSchema.safeParse({ ...base, functional: [] });
    expect(result.success).toBe(false);
  });

  it("rejects an empty nonFunctional list", () => {
    const result = RequirementsSchema.safeParse({ ...base, nonFunctional: [] });
    expect(result.success).toBe(false);
  });

  it("allows scaleEstimates fields to be omitted entirely", () => {
    const result = RequirementsSchema.safeParse({
      ...base,
      scaleEstimates: {},
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing top-level key", () => {
    const { constraints: _constraints, ...rest } = base;
    const result = RequirementsSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
