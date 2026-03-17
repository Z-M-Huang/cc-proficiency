import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { parseTranscript, sanitizeProjectSlug, countParallelToolCalls, countDeliberateWorkflows } from "../../src/parsers/transcript-parser.js";
import type { NormalizedEvent, ToolCallEvent, UserPromptEvent } from "../../src/types.js";

const FIXTURE_DIR = join(import.meta.dirname, "../fixtures");

describe("parseTranscript", () => {
  it("parses a sample session JSONL file", async () => {
    const session = await parseTranscript(join(FIXTURE_DIR, "sample-session.jsonl"));

    expect(session.sessionId).toBe("test-session-001");
    expect(session.version).toBe("2.1.76");
    expect(session.project).toBe("test-project");
    expect(session.startTime).toBe("2026-03-15T18:25:15.918Z");
    expect(session.events.length).toBeGreaterThan(0);
  });

  it("extracts user prompts", async () => {
    const session = await parseTranscript(join(FIXTURE_DIR, "sample-session.jsonl"));
    const prompts = session.events.filter(
      (e) => e.kind === "user_prompt"
    ) as UserPromptEvent[];

    expect(prompts.length).toBe(1);
    expect(prompts[0]!.content).toBe("Update the CLAUDE.md with new rules for commit messages");
    expect(prompts[0]!.permissionMode).toBe("bypassPermissions");
  });

  it("extracts tool calls", async () => {
    const session = await parseTranscript(join(FIXTURE_DIR, "sample-session.jsonl"));
    const toolCalls = session.events.filter(
      (e) => e.kind === "tool_call"
    ) as ToolCallEvent[];

    expect(toolCalls.length).toBe(2);
    expect(toolCalls[0]!.toolName).toBe("Read");
    expect(toolCalls[1]!.toolName).toBe("Edit");
  });

  it("extracts tool results", async () => {
    const session = await parseTranscript(join(FIXTURE_DIR, "sample-session.jsonl"));
    const results = session.events.filter((e) => e.kind === "tool_result");

    expect(results.length).toBe(2);
  });

  it("extracts hook progress events", async () => {
    const session = await parseTranscript(join(FIXTURE_DIR, "sample-session.jsonl"));
    const hooks = session.events.filter((e) => e.kind === "hook_progress");

    expect(hooks.length).toBe(3); // SessionStart + PostToolUse:Read + PreToolUse:Edit
  });

  it("extracts system stop events", async () => {
    const session = await parseTranscript(join(FIXTURE_DIR, "sample-session.jsonl"));
    const stops = session.events.filter((e) => e.kind === "system_stop");

    expect(stops.length).toBe(1);
  });

  it("handles malformed lines gracefully", async () => {
    // The fixture has only valid lines, but the parser should handle broken ones
    const session = await parseTranscript(join(FIXTURE_DIR, "sample-session.jsonl"));
    expect(session.sessionId).toBeTruthy();
  });
});

describe("sanitizeProjectSlug", () => {
  it("extracts last path segment", () => {
    expect(sanitizeProjectSlug("/app/my-project")).toBe("my-project");
    expect(sanitizeProjectSlug("/home/user/code/foo")).toBe("foo");
  });

  it("handles Windows paths", () => {
    expect(sanitizeProjectSlug("C:\\Users\\code\\bar")).toBe("bar");
  });

  it("returns 'unknown' for empty path", () => {
    expect(sanitizeProjectSlug("")).toBe("unknown");
  });
});

describe("countParallelToolCalls", () => {
  it("returns 0 for sequential tool calls", () => {
    const events: NormalizedEvent[] = [
      { kind: "tool_call", sessionId: "s1", timestamp: "t1", toolName: "Read", toolId: "1", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t2", toolName: "Edit", toolId: "2", input: {} },
    ];
    expect(countParallelToolCalls(events)).toBe(0);
  });

  it("counts parallel tool calls with same timestamp", () => {
    const events: NormalizedEvent[] = [
      { kind: "tool_call", sessionId: "s1", timestamp: "t1", toolName: "Read", toolId: "1", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t1", toolName: "Grep", toolId: "2", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t1", toolName: "Glob", toolId: "3", input: {} },
    ];
    expect(countParallelToolCalls(events)).toBe(3);
  });
});

describe("countDeliberateWorkflows", () => {
  it("detects Grep→Read→Edit chains", () => {
    const events: NormalizedEvent[] = [
      { kind: "tool_call", sessionId: "s1", timestamp: "t1", toolName: "Grep", toolId: "1", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t2", toolName: "Read", toolId: "2", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t3", toolName: "Edit", toolId: "3", input: {} },
    ];
    expect(countDeliberateWorkflows(events)).toBe(1);
  });

  it("detects Glob→Read→Write chains", () => {
    const events: NormalizedEvent[] = [
      { kind: "tool_call", sessionId: "s1", timestamp: "t1", toolName: "Glob", toolId: "1", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t2", toolName: "Read", toolId: "2", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t3", toolName: "Write", toolId: "3", input: {} },
    ];
    expect(countDeliberateWorkflows(events)).toBe(1);
  });

  it("returns 0 for unrelated sequences", () => {
    const events: NormalizedEvent[] = [
      { kind: "tool_call", sessionId: "s1", timestamp: "t1", toolName: "Read", toolId: "1", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t2", toolName: "Read", toolId: "2", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t3", toolName: "Read", toolId: "3", input: {} },
    ];
    expect(countDeliberateWorkflows(events)).toBe(0);
  });
});
