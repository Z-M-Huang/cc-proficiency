import { describe, it, expect } from "vitest";
import type { LeaderboardRegistry } from "../../src/types.js";

describe("LeaderboardRegistry", () => {
  it("validates registry schema", () => {
    const valid: LeaderboardRegistry = {
      version: "1.0.0",
      entries: [
        { username: "alice", publicGistId: "abc123def456", joinedAt: "2026-03-17T00:00:00Z" },
      ],
    };
    expect(valid.version).toBe("1.0.0");
    expect(valid.entries).toHaveLength(1);
    expect(valid.entries[0]!.username).toBe("alice");
  });

  it("handles empty registry", () => {
    const empty: LeaderboardRegistry = { version: "1.0.0", entries: [] };
    expect(empty.entries).toHaveLength(0);
  });

  it("rejects wrong version", () => {
    const json = '{"version":"2.0.0","entries":[]}';
    const data = JSON.parse(json);
    expect(data.version).not.toBe("1.0.0");
  });

  it("validates entry structure", () => {
    const entry = { username: "bob", publicGistId: "hex123", joinedAt: "2026-03-17T00:00:00Z" };
    expect(typeof entry.username).toBe("string");
    expect(typeof entry.publicGistId).toBe("string");
    expect(!isNaN(Date.parse(entry.joinedAt))).toBe(true);
  });
});
