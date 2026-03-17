import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseHistory } from "../../src/parsers/history-parser.js";

const TEST_DIR = join(tmpdir(), "cc-prof-test-history");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("parseHistory", () => {
  it("parses valid history entries", async () => {
    const historyFile = join(TEST_DIR, "history.jsonl");
    const entries = [
      JSON.stringify({ display: "/model", pastedContents: {}, timestamp: 1773591531085, project: "/app/proj1", sessionId: "s1" }),
      JSON.stringify({ display: "fix the bug", pastedContents: {}, timestamp: 1773591532000, project: "/app/proj1", sessionId: "s1" }),
      JSON.stringify({ display: "/config", pastedContents: { "1": { id: 1, type: "text" } }, timestamp: 1773591533000, project: "/app/proj2", sessionId: "s2" }),
      JSON.stringify({ display: "/plan", pastedContents: {}, timestamp: 1773591534000, project: "/app/proj2", sessionId: "s3" }),
    ];
    writeFileSync(historyFile, entries.join("\n") + "\n");

    const result = await parseHistory(historyFile);

    expect(result.totalEntries).toBe(4);
    expect(result.uniqueProjects.size).toBe(2);
    expect(result.uniqueCommands.has("/model")).toBe(true);
    expect(result.uniqueCommands.has("/config")).toBe(true);
    expect(result.uniqueCommands.has("/plan")).toBe(true);
    expect(result.uniqueCommands.size).toBe(3);
    expect(result.pastedContentCount).toBe(1);
    expect(result.sessionIds.size).toBe(3);
  });

  it("handles empty file", async () => {
    const historyFile = join(TEST_DIR, "empty.jsonl");
    writeFileSync(historyFile, "");

    const result = await parseHistory(historyFile);
    expect(result.totalEntries).toBe(0);
  });

  it("skips malformed lines", async () => {
    const historyFile = join(TEST_DIR, "broken.jsonl");
    writeFileSync(historyFile, "not json\n{invalid\n" + JSON.stringify({ display: "/test", pastedContents: {}, timestamp: 1, project: "/p", sessionId: "s" }) + "\n");

    const result = await parseHistory(historyFile);
    expect(result.totalEntries).toBe(1);
    expect(result.uniqueCommands.has("/test")).toBe(true);
  });

  it("does not count non-command displays as commands", async () => {
    const historyFile = join(TEST_DIR, "nocommands.jsonl");
    writeFileSync(historyFile, JSON.stringify({ display: "just a prompt", pastedContents: {}, timestamp: 1, project: "/p", sessionId: "s" }) + "\n");

    const result = await parseHistory(historyFile);
    expect(result.uniqueCommands.size).toBe(0);
  });
});
