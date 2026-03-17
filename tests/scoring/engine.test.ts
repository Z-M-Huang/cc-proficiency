import { describe, it, expect } from "vitest";
import { getPhase, getConfidence, getRecencyWeight, computeProficiency } from "../../src/scoring/engine.js";
import type { ParsedSession, SetupChecklist, NormalizedEvent } from "../../src/types.js";
import type { ConfigSignals } from "../../src/parsers/config-parser.js";

const emptyConfig: ConfigSignals = {
  hasGlobalClaudeMd: false, globalClaudeMdHasImports: false, projectClaudeMdCount: 0,
  hasCustomHooks: false, hookWithMatcherCount: 0, pluginCount: 0, pluginNames: [],
  hasRulesFiles: false, hasMcpServers: false, hasMemoryFiles: false,
  memoryFileCount: 0, activeMemoryFileCount: 0, effortLevel: "",
};
const emptyChecklist: SetupChecklist = {
  hasClaudeMd: false, hasHooks: false, hasPlugins: false, hasMcpServers: false, hasMemory: false, hasRules: false,
};

function makeSession(events: NormalizedEvent[] = [], id = "s1"): ParsedSession {
  return { sessionId: id, startTime: "2026-03-15T10:00:00Z", endTime: "2026-03-15T11:00:00Z", project: "test", events, version: "2.1.76" };
}

describe("getPhase", () => {
  it("calibrating < 3, early 3-9, full 10+", () => {
    expect(getPhase(0)).toBe("calibrating");
    expect(getPhase(2)).toBe("calibrating");
    expect(getPhase(3)).toBe("early");
    expect(getPhase(9)).toBe("early");
    expect(getPhase(10)).toBe("full");
  });
});

describe("getConfidence", () => {
  it("low < 10, medium 10-49, high 50+", () => {
    expect(getConfidence(5)).toBe("low");
    expect(getConfidence(25)).toBe("medium");
    expect(getConfidence(50)).toBe("high");
  });
});

describe("getRecencyWeight", () => {
  const now = new Date("2026-03-16T12:00:00Z").getTime();
  it("1.0 for 7 days, 0.7 for 30, 0.4 for 90, 0.2 for older", () => {
    expect(getRecencyWeight("2026-03-14T12:00:00Z", now)).toBe(1.0);
    expect(getRecencyWeight("2026-03-02T12:00:00Z", now)).toBe(0.7);
    expect(getRecencyWeight("2026-01-16T12:00:00Z", now)).toBe(0.4);
    expect(getRecencyWeight("2025-09-16T12:00:00Z", now)).toBe(0.2);
  });
  it("0.2 for invalid", () => {
    expect(getRecencyWeight("not-a-date", now)).toBe(0.2);
  });
});

describe("computeProficiency (rule engine)", () => {
  it("returns 5 domains", () => {
    const result = computeProficiency([makeSession()], emptyConfig, "testuser", emptyChecklist);
    expect(result.domains).toHaveLength(5);
    expect(result.domains.map((d) => d.id)).toEqual([
      "cc-mastery", "tool-mcp", "agentic", "prompt-craft", "context-mgmt",
    ]);
  });

  it("includes feature inventory", () => {
    const result = computeProficiency([makeSession()], emptyConfig, "testuser", emptyChecklist);
    expect(result.features).toBeDefined();
    expect(result.features.hooks).toBeDefined();
    expect(result.features.topTools).toBeDefined();
  });

  it("config-based rules fire without transcripts", () => {
    const richConfig = {
      ...emptyConfig,
      hasGlobalClaudeMd: true, globalClaudeMdHasImports: true,
      hasCustomHooks: true, hookWithMatcherCount: 4,
      pluginCount: 12, hasRulesFiles: true,
      hasMcpServers: true, hasMemoryFiles: true,
      activeMemoryFileCount: 3, memoryFileCount: 5,
      effortLevel: "high",
    };
    const result = computeProficiency([], richConfig, "testuser", emptyChecklist);
    // Config rules should fire even with 0 sessions
    const ccScore = result.domains.find((d) => d.id === "cc-mastery")!.score;
    expect(ccScore).toBeGreaterThan(0);
  });

  it("behavior rules increase scores", () => {
    const events: NormalizedEvent[] = [
      { kind: "tool_call", sessionId: "s1", timestamp: "t1", toolName: "Grep", toolId: "1", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t2", toolName: "Read", toolId: "2", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t3", toolName: "Edit", toolId: "3", input: { replace_all: false, old_string: "some long old string here" } },
      { kind: "user_prompt", sessionId: "s1", timestamp: "t0", content: "- Fix bug\n- Add test\n- Update docs", permissionMode: "default" },
    ];
    const emptyResult = computeProficiency([makeSession()], emptyConfig, "u", emptyChecklist);
    const richResult = computeProficiency([makeSession(events)], emptyConfig, "u", emptyChecklist);

    const emptyTool = emptyResult.domains.find((d) => d.id === "tool-mcp")!.score;
    const richTool = richResult.domains.find((d) => d.id === "tool-mcp")!.score;
    expect(richTool).toBeGreaterThan(emptyTool);
  });

  it("no domain exceeds 100", () => {
    const richConfig = {
      ...emptyConfig,
      hasGlobalClaudeMd: true, globalClaudeMdHasImports: true,
      hasCustomHooks: true, hookWithMatcherCount: 10,
      pluginCount: 20, hasRulesFiles: true,
      hasMcpServers: true, hasMemoryFiles: true,
      activeMemoryFileCount: 10, memoryFileCount: 10,
      effortLevel: "high", projectClaudeMdCount: 5,
      pluginNames: [],
    };
    const events: NormalizedEvent[] = [
      { kind: "tool_call", sessionId: "s1", timestamp: "t1", toolName: "Grep", toolId: "1", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t2", toolName: "Read", toolId: "2", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t3", toolName: "Edit", toolId: "3", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t4", toolName: "Bash", toolId: "4", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t5", toolName: "Agent", toolId: "5", input: { subagent_type: "Explore", prompt: "x".repeat(200) } },
      { kind: "tool_call", sessionId: "s1", timestamp: "t5", toolName: "Agent", toolId: "6", input: { subagent_type: "Plan", prompt: "y".repeat(200) } },
      { kind: "tool_call", sessionId: "s1", timestamp: "t6", toolName: "Skill", toolId: "7", input: { skill: "commit" } },
      { kind: "user_prompt", sessionId: "s1", timestamp: "t0", content: "- Fix\n- Test", permissionMode: "plan" },
      { kind: "hook_progress", sessionId: "s1", timestamp: "t7", hookEvent: "PreToolUse", hookName: "PreToolUse:Edit", command: "node h.js" },
      { kind: "hook_progress", sessionId: "s1", timestamp: "t8", hookEvent: "PostToolUse", hookName: "PostToolUse:Write", command: "node h.js" },
      { kind: "hook_progress", sessionId: "s1", timestamp: "t9", hookEvent: "Stop", hookName: "Stop:check", command: "node h.js" },
    ];
    const sessions = Array.from({ length: 20 }, (_, i) => makeSession(events, `s${i}`));
    const result = computeProficiency(sessions, richConfig, "u", emptyChecklist);
    for (const d of result.domains) {
      expect(d.score).toBeLessThanOrEqual(100);
      expect(d.score).toBeGreaterThanOrEqual(0);
    }
  });
});
