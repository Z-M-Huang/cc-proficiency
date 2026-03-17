import { describe, it, expect } from "vitest";
import { logCurve, cappedRatio, binary, ratioToScore, weightedSum } from "../../src/scoring/curves.js";

describe("logCurve", () => {
  it("returns 0 for value <= 0", () => {
    expect(logCurve(0, 1, 50)).toBe(0);
    expect(logCurve(-5, 1, 50)).toBe(0);
  });

  it("increases with value", () => {
    const a = logCurve(1, 1, 50);
    const b = logCurve(5, 1, 50);
    const c = logCurve(20, 1, 50);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it("saturates at 100", () => {
    expect(logCurve(1000000, 1, 50)).toBe(100);
  });

  it("grows slowly for large values (anti-gaming)", () => {
    const at10 = logCurve(10, 5, 35);
    const at100 = logCurve(100, 5, 35);
    const at1000 = logCurve(1000, 5, 35);
    // The difference between 100 and 1000 should be much smaller than 10 and 100
    expect(at1000 - at100).toBeLessThan(at100 - at10);
  });
});

describe("cappedRatio", () => {
  it("returns 0 for 0 value", () => {
    expect(cappedRatio(0, 10)).toBe(0);
  });

  it("returns 50 for half of cap", () => {
    expect(cappedRatio(5, 10)).toBe(50);
  });

  it("caps at 100", () => {
    expect(cappedRatio(20, 10)).toBe(100);
  });
});

describe("binary", () => {
  it("returns score when present", () => {
    expect(binary(true, 80)).toBe(80);
  });

  it("returns 0 when absent", () => {
    expect(binary(false, 80)).toBe(0);
  });
});

describe("ratioToScore", () => {
  it("converts 0-1 ratio to 0-100", () => {
    expect(ratioToScore(0)).toBe(0);
    expect(ratioToScore(0.5)).toBe(50);
    expect(ratioToScore(1)).toBe(100);
  });

  it("clamps to 0-100", () => {
    expect(ratioToScore(-0.5)).toBe(0);
    expect(ratioToScore(1.5)).toBe(100);
  });
});

describe("weightedSum", () => {
  it("computes weighted average", () => {
    const result = weightedSum([
      { score: 100, weight: 0.5 },
      { score: 0, weight: 0.5 },
    ]);
    expect(result).toBe(50);
  });

  it("returns 0 for empty components", () => {
    expect(weightedSum([])).toBe(0);
  });

  it("caps at 100", () => {
    const result = weightedSum([
      { score: 200, weight: 1 },
    ]);
    expect(result).toBe(100);
  });
});
