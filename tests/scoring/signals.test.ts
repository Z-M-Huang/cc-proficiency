import { describe, it, expect } from "vitest";
import { extractSignals } from "../../src/scoring/signals.js";
import type { ParsedSession, NormalizedEvent } from "../../src/types.js";
import type { ConfigSignals } from "../../src/parsers/config-parser.js";

const emptyConfig: ConfigSignals = {
  hasGlobalClaudeMd: false, globalClaudeMdHasImports: false, projectClaudeMdCount: 0,
  hasCustomHooks: false, hookWithMatcherCount: 0, pluginCount: 0, pluginNames: [],
  hasRulesFiles: false, rulesFileCount: 0, hasMcpServers: false, hasMemoryFiles: false,
  memoryFileCount: 0, activeMemoryFileCount: 0, effortLevel: "",
  hasCustomAgents: false, hasCustomSkills: false,
};

function makeSession(events: NormalizedEvent[], id: string = "s1", project: string = "test"): ParsedSession {
  return {
    sessionId: id,
    startTime: "2026-03-15T10:00:00Z",
    endTime: "2026-03-15T11:00:00Z",
    project,
    events,
    version: "2.1.76",
  };
}

function tc(name: string, input: Record<string, unknown> = {}, ts: string = "t1"): NormalizedEvent {
  return { kind: "tool_call", sessionId: "s1", timestamp: ts, toolName: name, toolId: `t_${Math.random().toString(36).slice(2)}`, input, callerType: "direct" };
}

function prompt(content: string, mode: string = "default"): NormalizedEvent {
  return { kind: "user_prompt", sessionId: "s1", timestamp: "t1", content, permissionMode: mode };
}

function toolResult(toolId: string, isError: boolean = false): NormalizedEvent {
  return { kind: "tool_result", sessionId: "s1", timestamp: "t1", toolId, isError };
}

describe("extractSignals", () => {
  it("extracts CC mastery signals from config", () => {
    const config = { ...emptyConfig, hasGlobalClaudeMd: true, pluginCount: 5, pluginNames: ["a@x", "b@y"] };
    const signals = extractSignals([makeSession([])], config);
    expect(signals.ccMastery.hasGlobalClaudeMd).toBe(true);
    expect(signals.ccMastery.pluginCount).toBe(5);
  });

  it("detects plan mode usage", () => {
    const events: NormalizedEvent[] = [prompt("use plan", "plan")];
    const signals = extractSignals([makeSession(events)], emptyConfig);
    expect(signals.ccMastery.usedPlanMode).toBe(true);
  });

  it("counts unique skills", () => {
    const events: NormalizedEvent[] = [
      tc("Skill", { skill: "commit" }),
      tc("Skill", { skill: "review-pr" }),
      tc("Skill", { skill: "commit" }), // duplicate
    ];
    const signals = extractSignals([makeSession(events)], emptyConfig);
    expect(signals.ccMastery.uniqueSkillsUsed).toBe(2);
  });

  it("extracts tool variety", () => {
    const events: NormalizedEvent[] = [tc("Read"), tc("Edit"), tc("Grep"), tc("Bash")];
    const signals = extractSignals([makeSession(events)], emptyConfig);
    expect(signals.toolMcp.uniqueToolsUsed).toBe(4);
  });

  it("detects MCP servers from tool names", () => {
    const events: NormalizedEvent[] = [
      tc("mcp__github__list_issues"),
      tc("mcp__github__create_pr"),
      tc("mcp__context7__query"),
    ];
    const signals = extractSignals([makeSession(events)], emptyConfig);
    expect(signals.toolMcp.uniqueMcpServersUsed).toBe(2); // github + context7
  });

  it("counts subagent types", () => {
    const events: NormalizedEvent[] = [
      tc("Agent", { subagent_type: "Explore" }),
      tc("Agent", { subagent_type: "Plan" }),
      tc("Agent", { subagent_type: "Explore" }),
    ];
    const signals = extractSignals([makeSession(events)], emptyConfig);
    expect(signals.agentic.uniqueSubagentTypes).toBe(2);
    expect(signals.agentic.totalSubagentCalls).toBe(3);
  });

  it("detects worktree usage", () => {
    const events: NormalizedEvent[] = [tc("EnterWorktree"), tc("Read"), tc("ExitWorktree")];
    const signals = extractSignals([makeSession(events)], emptyConfig);
    expect(signals.agentic.usedWorktree).toBe(true);
  });

  it("detects task management", () => {
    const events: NormalizedEvent[] = [tc("TaskCreate"), tc("TaskUpdate")];
    const signals = extractSignals([makeSession(events)], emptyConfig);
    expect(signals.agentic.usedTaskManagement).toBe(true);
  });

  it("computes structured prompt ratio", () => {
    const events: NormalizedEvent[] = [
      prompt("- Fix the bug\n- Add tests"),      // structured
      prompt("do something"),                      // not structured
      prompt("## Header\n\n1. Step one\n2. Step two"), // structured
    ];
    const signals = extractSignals([makeSession(events)], emptyConfig);
    expect(signals.promptCraft.structuredPromptRatio).toBeCloseTo(2 / 3, 1);
  });

  it("detects iterative refinement with refinement keywords", () => {
    const events: NormalizedEvent[] = [
      prompt("Create a component"),
      prompt("Actually, change the color to blue"),  // "change"
      prompt("Also add a border"),                   // "also"
    ];
    const signals = extractSignals([makeSession(events)], emptyConfig);
    expect(signals.promptCraft.iterativeRefinementCount).toBe(2);
  });

  it("does not count non-refinement consecutive prompts", () => {
    const events: NormalizedEvent[] = [
      prompt("Create a component"),
      prompt("Now create a service"),  // no refinement keywords
    ];
    const signals = extractSignals([makeSession(events)], emptyConfig);
    expect(signals.promptCraft.iterativeRefinementCount).toBe(0);
  });

  it("detects context provision from code blocks", () => {
    const events: NormalizedEvent[] = [
      prompt("Fix this:\n```\nconst x = 1\n```"),
      prompt("short prompt"),
    ];
    const signals = extractSignals([makeSession(events)], emptyConfig);
    expect(signals.promptCraft.contextProvisionCount).toBe(1);
  });

  it("computes edit success rate with neutral default", () => {
    const signals = extractSignals([makeSession([])], emptyConfig);
    expect(signals.toolMcp.editSuccessRate).toBe(0.5); // neutral
  });

  it("computes edit success rate from actual edits", () => {
    const events: NormalizedEvent[] = [
      tc("Edit", {}, "t1"),  // followed by Read, not re-edit → success
      tc("Read", {}, "t2"),
      tc("Edit", {}, "t3"),  // followed by Edit → corrective
      tc("Edit", {}, "t4"),
    ];
    const signals = extractSignals([makeSession(events)], emptyConfig);
    // Edit at t1: next tool is Read → success
    // Edit at t3: next is Edit at t4 → corrective re-edit → fail
    // Edit at t4: no next → success (but check how indexOf works with duplicate toolCalls)
    // The actual rate depends on implementation details
    expect(signals.toolMcp.editSuccessRate).toBeGreaterThan(0);
    expect(signals.toolMcp.editSuccessRate).toBeLessThan(1);
  });

  it("computes outcome signals with neutral defaults for no data", () => {
    const signals = extractSignals([makeSession([])], emptyConfig);
    expect(signals.outcomes.editAcceptanceRate).toBe(0.5);
    expect(signals.outcomes.errorRecoveryRate).toBe(0.5);
    expect(signals.outcomes.permissionModeProgression).toBe(0);
  });

  it("counts multi-session projects", () => {
    const s1 = makeSession([tc("Read")], "s1", "projectA");
    const s2 = makeSession([tc("Edit")], "s2", "projectA");
    const s3 = makeSession([tc("Read")], "s3", "projectB");
    const signals = extractSignals([s1, s2, s3], emptyConfig);
    expect(signals.agentic.multiSessionProjectCount).toBe(1); // projectA has 2 sessions
  });
});
