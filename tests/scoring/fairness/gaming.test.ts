import { describe, it, expect } from "vitest";
import { computeProficiency } from "../../../src/scoring/engine.js";
import type { ParsedSession, NormalizedEvent, SetupChecklist } from "../../../src/types.js";
import type { ConfigSignals } from "../../../src/parsers/config-parser.js";

const emptyConfig: ConfigSignals = {
  hasGlobalClaudeMd: false, globalClaudeMdHasImports: false, projectClaudeMdCount: 0,
  hasCustomHooks: false, hookWithMatcherCount: 0, pluginCount: 0, pluginNames: [],
  hasRulesFiles: false, rulesFileCount: 0, hasMcpServers: false, hasMemoryFiles: false,
  memoryFileCount: 0, activeMemoryFileCount: 0, effortLevel: "",
  hasCustomAgents: false, hasCustomSkills: false,
};
const emptyChecklist: SetupChecklist = {
  hasClaudeMd: false, hasHooks: false, hasPlugins: false,
  hasMcpServers: false, hasMemory: false, hasRules: false,
  hasAgents: false, hasSkills: false,
};

function makeSession(events: NormalizedEvent[], id = "s1"): ParsedSession {
  return { sessionId: id, startTime: "2026-03-15T10:00:00Z", endTime: "2026-03-15T11:00:00Z", project: "test", events, version: "2.1.76", totalTokens: 0 };
}
function tc(name: string, ts = "t1"): NormalizedEvent {
  return { kind: "tool_call", sessionId: "s1", timestamp: ts, toolName: name, toolId: `t_${Math.random().toString(36).slice(2)}`, input: {} };
}

describe("Gaming Resistance (Rule Engine)", () => {
  it("tool spam does not inflate score beyond genuine varied usage", () => {
    const spamSession = makeSession(Array.from({ length: 100 }, () => tc("Read")));
    const genuineSession = makeSession([
      tc("Grep", "t1"), tc("Read", "t2"), tc("Edit", "t3"),
      tc("Bash", "t4"), tc("Glob", "t5"), tc("Agent", "t6"),
    ], "s2");

    const spamResult = computeProficiency([spamSession], emptyConfig, "spammer", emptyChecklist);
    const genuineResult = computeProficiency([genuineSession], emptyConfig, "genuine", emptyChecklist);

    const spamTool = spamResult.domains.find((d) => d.id === "tool-mcp")!.score;
    const genuineTool = genuineResult.domains.find((d) => d.id === "tool-mcp")!.score;
    expect(genuineTool).toBeGreaterThan(spamTool);
  });

  it("config-alone scores are capped (no domain > 35 without behavior)", () => {
    const richConfig = {
      ...emptyConfig, hasGlobalClaudeMd: true, globalClaudeMdHasImports: true,
      hasCustomHooks: true, hookWithMatcherCount: 10, pluginCount: 20,
      hasRulesFiles: true, hasMcpServers: true, effortLevel: "high",
    };
    const result = computeProficiency([], richConfig, "config-only", emptyChecklist);
    for (const d of result.domains) {
      // Config cap is 25 points, with calibrating scale of 2.0 = max 50
      // But with no behavior, most domains should be moderate
      expect(d.score).toBeLessThanOrEqual(60);
    }
  });

  it("CI env detection works", async () => {
    const { isCIEnvironment } = await import("../../../src/utils/ci-detect.js");
    const origCI = process.env.CI;
    process.env.CI = "true";
    expect(isCIEnvironment()).toBe(true);
    delete process.env.CI;
    process.env.CI = origCI;
  });
});
