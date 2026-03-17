import { describe, it, expect } from "vitest";
import { getRecencyWeight } from "../../src/scoring/engine.js";

describe("getRecencyWeight", () => {
  const now = new Date("2026-03-16T12:00:00Z").getTime();

  it("returns 1.0 for sessions within 7 days", () => {
    const recent = new Date("2026-03-14T12:00:00Z").toISOString(); // 2 days ago
    expect(getRecencyWeight(recent, now)).toBe(1.0);
  });

  it("returns 1.0 for sessions exactly 7 days old", () => {
    const sevenDays = new Date("2026-03-09T12:00:00Z").toISOString();
    expect(getRecencyWeight(sevenDays, now)).toBe(1.0);
  });

  it("returns 0.7 for sessions 8-30 days old", () => {
    const twoWeeks = new Date("2026-03-02T12:00:00Z").toISOString(); // 14 days
    expect(getRecencyWeight(twoWeeks, now)).toBe(0.7);
  });

  it("returns 0.4 for sessions 31-90 days old", () => {
    const twoMonths = new Date("2026-01-16T12:00:00Z").toISOString(); // ~60 days
    expect(getRecencyWeight(twoMonths, now)).toBe(0.4);
  });

  it("returns 0.2 for sessions >90 days old", () => {
    const sixMonths = new Date("2025-09-16T12:00:00Z").toISOString(); // ~180 days
    expect(getRecencyWeight(sixMonths, now)).toBe(0.2);
  });

  it("returns 0.2 for invalid timestamps", () => {
    expect(getRecencyWeight("not-a-date", now)).toBe(0.2);
  });

  it("returns 1.0 for current timestamp", () => {
    expect(getRecencyWeight(new Date(now).toISOString(), now)).toBe(1.0);
  });
});
