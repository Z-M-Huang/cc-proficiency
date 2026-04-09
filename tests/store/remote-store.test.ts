import { describe, it, expect } from "vitest";
import { emptyRemoteStore, mergeIntoRemote } from "../../src/store/remote-store.js";
import type { ProficiencyResult } from "../../src/types.js";

function daysAgoDate(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function daysAgoTimestamp(days: number, hour: number): string {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

function makeResult(): ProficiencyResult {
  return {
    username: "testuser",
    timestamp: new Date().toISOString(),
    domains: [
      { id: "cc-mastery", label: "CC Mastery", score: 80, maxPossible: 100, percentage: 80, weight: 0.2, confidence: "high", dataPoints: 10 },
      { id: "tool-mcp", label: "Tool/MCP", score: 75, maxPossible: 100, percentage: 75, weight: 0.2, confidence: "high", dataPoints: 10 },
      { id: "agentic", label: "Agentic", score: 70, maxPossible: 100, percentage: 70, weight: 0.2, confidence: "medium", dataPoints: 10 },
      { id: "prompt-craft", label: "Prompt Craft", score: 85, maxPossible: 100, percentage: 85, weight: 0.2, confidence: "high", dataPoints: 10 },
      { id: "context-mgmt", label: "Context", score: 78, maxPossible: 100, percentage: 78, weight: 0.2, confidence: "medium", dataPoints: 10 },
    ],
    features: {
      hooks: [],
      skills: [],
      mcpServers: [],
      topTools: [],
      totalToolCalls: 0,
      uniqueToolCount: 0,
      usedPlanMode: false,
      hasMemory: false,
      hasRules: false,
      hasAgents: false,
      hasSkills: false,
      totalHours: 4,
    },
    sessionCount: 1,
    projectCount: 1,
    phase: "full",
    setupChecklist: {
      hasClaudeMd: false,
      hasHooks: false,
      hasPlugins: false,
      hasMcpServers: false,
      hasMemory: false,
      hasRules: false,
      hasAgents: false,
      hasSkills: false,
    },
  };
}

describe("mergeIntoRemote", () => {
  it("repairs existing session dates from validated local dates", () => {
    const remote = emptyRemoteStore("testuser");
    remote.recentSessions = [
      { id: "s1", date: daysAgoDate(1), hours: 2 },
    ];

    const correctedDate = daysAgoDate(10);
    const merged = mergeIntoRemote(
      remote,
      [{ id: "s1", date: correctedDate, hours: 2 }],
      makeResult(),
    );

    expect(merged.recentSessions).toHaveLength(1);
    expect(merged.recentSessions[0]!.date).toBe(correctedDate);
  });

  it("keeps endTimestamp while repairing an existing date", () => {
    const remote = emptyRemoteStore("testuser");
    remote.recentSessions = [
      { id: "s1", date: daysAgoDate(1), hours: 2 },
    ];

    const correctedTimestamp = daysAgoTimestamp(3, 5);
    const correctedDate = correctedTimestamp.slice(0, 10);
    const merged = mergeIntoRemote(
      remote,
      [{ id: "s1", date: correctedDate, hours: 2, endTimestamp: correctedTimestamp, tokens: 1234 }],
      makeResult(),
    );

    expect(merged.recentSessions[0]!.date).toBe(correctedDate);
    expect(merged.recentSessions[0]!.endTimestamp).toBe(correctedTimestamp);
    expect(merged.recentSessions[0]!.tokens).toBe(1234);
  });
});
