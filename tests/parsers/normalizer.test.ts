import { describe, it, expect } from "vitest";
import { normalizeEntry } from "../../src/parsers/normalizer.js";
import type { RawTranscriptEntry } from "../../src/types.js";

describe("normalizeEntry", () => {
  it("normalizes user prompt entries", () => {
    const raw: RawTranscriptEntry = {
      parentUuid: null,
      isSidechain: false,
      type: "user",
      uuid: "u1",
      timestamp: "2026-03-15T10:00:00Z",
      sessionId: "s1",
      cwd: "/app/test",
      version: "2.1.76",
      permissionMode: "plan",
      message: { role: "user", content: "Fix the bug" },
    };

    const events = normalizeEntry(raw);
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe("user_prompt");
    if (events[0]!.kind === "user_prompt") {
      expect(events[0]!.content).toBe("Fix the bug");
      expect(events[0]!.permissionMode).toBe("plan");
    }
  });

  it("normalizes tool result entries", () => {
    const raw: RawTranscriptEntry = {
      parentUuid: null,
      isSidechain: false,
      type: "user",
      uuid: "u2",
      timestamp: "2026-03-15T10:00:00Z",
      sessionId: "s1",
      cwd: "/app/test",
      version: "2.1.76",
      message: {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "t1", content: "ok", is_error: false },
          { type: "tool_result", tool_use_id: "t2", content: "fail", is_error: true },
        ],
      },
    };

    const events = normalizeEntry(raw);
    expect(events).toHaveLength(2);
    expect(events[0]!.kind).toBe("tool_result");
    expect(events[1]!.kind).toBe("tool_result");
    if (events[1]!.kind === "tool_result") {
      expect(events[1]!.isError).toBe(true);
    }
  });

  it("normalizes assistant tool_use entries", () => {
    const raw: RawTranscriptEntry = {
      parentUuid: null,
      isSidechain: false,
      type: "assistant",
      uuid: "a1",
      timestamp: "2026-03-15T10:00:00Z",
      sessionId: "s1",
      cwd: "/app/test",
      version: "2.1.76",
      message: {
        role: "assistant",
        content: [
          { type: "tool_use", id: "t1", name: "Read", input: { file_path: "/test" }, caller: { type: "direct" } },
          { type: "text", text: "Reading the file..." },
        ],
      },
    };

    const events = normalizeEntry(raw);
    expect(events).toHaveLength(1); // only tool_use, not text
    expect(events[0]!.kind).toBe("tool_call");
    if (events[0]!.kind === "tool_call") {
      expect(events[0]!.toolName).toBe("Read");
      expect(events[0]!.callerType).toBe("direct");
    }
  });

  it("normalizes hook progress events", () => {
    const raw: RawTranscriptEntry = {
      parentUuid: null,
      isSidechain: false,
      type: "progress",
      uuid: "p1",
      timestamp: "2026-03-15T10:00:00Z",
      sessionId: "s1",
      cwd: "/app/test",
      version: "2.1.76",
      data: { type: "hook_progress", hookEvent: "PreToolUse", hookName: "PreToolUse:Edit", command: "node hook.js" },
    };

    const events = normalizeEntry(raw);
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe("hook_progress");
  });

  it("normalizes system stop events", () => {
    const raw: RawTranscriptEntry = {
      parentUuid: null,
      isSidechain: false,
      type: "system",
      uuid: "sys1",
      timestamp: "2026-03-15T10:00:00Z",
      sessionId: "s1",
      cwd: "/app/test",
      version: "2.1.76",
      subtype: "stop_hook_summary",
      hookCount: 2,
      preventedContinuation: false,
    };

    const events = normalizeEntry(raw);
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe("system_stop");
  });

  it("normalizes file-history-snapshot events", () => {
    const raw: RawTranscriptEntry = {
      parentUuid: null,
      isSidechain: false,
      type: "file-history-snapshot",
      uuid: "fh1",
      timestamp: "2026-03-15T10:00:00Z",
      sessionId: "s1",
      cwd: "/app/test",
      version: "2.1.76",
    };

    const events = normalizeEntry(raw);
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe("file_snapshot");
  });

  it("returns unknown event for unrecognized types", () => {
    const raw: RawTranscriptEntry = {
      parentUuid: null,
      isSidechain: false,
      type: "future_type",
      uuid: "f1",
      timestamp: "2026-03-15T10:00:00Z",
      sessionId: "s1",
      cwd: "/app/test",
      version: "3.0.0",
    };

    const events = normalizeEntry(raw);
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe("unknown");
    if (events[0]!.kind === "unknown") {
      expect(events[0]!.rawType).toBe("future_type");
    }
  });

  it("returns unknown for non-hook progress", () => {
    const raw: RawTranscriptEntry = {
      parentUuid: null,
      isSidechain: false,
      type: "progress",
      uuid: "p2",
      timestamp: "2026-03-15T10:00:00Z",
      sessionId: "s1",
      cwd: "/app/test",
      version: "2.1.76",
      data: { type: "agent_progress", prompt: "test" },
    };

    const events = normalizeEntry(raw);
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe("unknown");
  });

  it("returns unknown for non-stop system events", () => {
    const raw: RawTranscriptEntry = {
      parentUuid: null,
      isSidechain: false,
      type: "system",
      uuid: "sys2",
      timestamp: "2026-03-15T10:00:00Z",
      sessionId: "s1",
      cwd: "/app/test",
      version: "2.1.76",
      subtype: "some_other_system_event",
    };

    const events = normalizeEntry(raw);
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe("unknown");
  });

  it("handles missing message gracefully", () => {
    const raw: RawTranscriptEntry = {
      parentUuid: null,
      isSidechain: false,
      type: "user",
      uuid: "u3",
      timestamp: "2026-03-15T10:00:00Z",
      sessionId: "s1",
      cwd: "/app/test",
      version: "2.1.76",
    };

    const events = normalizeEntry(raw);
    expect(events).toHaveLength(0);
  });

  it("handles missing data in progress events", () => {
    const raw: RawTranscriptEntry = {
      parentUuid: null,
      isSidechain: false,
      type: "progress",
      uuid: "p3",
      timestamp: "2026-03-15T10:00:00Z",
      sessionId: "s1",
      cwd: "/app/test",
      version: "2.1.76",
    };

    const events = normalizeEntry(raw);
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe("unknown");
  });
});
