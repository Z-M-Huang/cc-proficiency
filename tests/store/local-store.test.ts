import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEST_HOME = join(tmpdir(), "cc-prof-test-store-" + process.pid);

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return {
    ...actual,
    homedir: () => join(actual.tmpdir(), "cc-prof-test-store-" + process.pid),
  };
});

import {
  loadStore, saveStore, isSessionProcessed, addSnapshot,
  loadConfig, saveConfig, saveBadge, getBadgePath, logError, getStoreDir,
  upsertTokenLog, computeTokenWindows,
} from "../../src/store/local-store.js";
import type { ExtractedSignals, SessionSnapshot, TokenLogEntry } from "../../src/types.js";

const STORE_DIR = join(TEST_HOME, ".cc-proficiency");

const emptySignals: ExtractedSignals = {
  ccMastery: { hasGlobalClaudeMd: false, globalClaudeMdHasImports: false, projectClaudeMdCount: 0, hasCustomHooks: false, hookWithMatcherCount: 0, pluginCount: 0, pluginsUsedInTranscripts: 0, uniqueSkillsUsed: 0, usedPlanMode: false, hasRulesFiles: false, hasCustomAgents: false, hasCustomSkills: false },
  toolMcp: { uniqueToolsUsed: 0, uniqueMcpServersUsed: 0, lspToolCallCount: 0, deliberateWorkflowCount: 0, editSuccessRate: 0.5, totalToolCalls: 0 },
  agentic: { uniqueSubagentTypes: 0, totalSubagentCalls: 0, parallelToolCallCount: 0, usedWorktree: false, multiSessionProjectCount: 0, usedTaskManagement: false },
  promptCraft: { structuredPromptRatio: 0, iterativeRefinementCount: 0, uniqueCommandsUsed: 0, contextProvisionCount: 0, totalPrompts: 0 },
  contextMgmt: { memoryFileCount: 0, activeMemoryFiles: 0, projectCount: 0, sessionCount: 0, sessionDurations: [] },
  outcomes: { editAcceptanceRate: 0.5, permissionModeProgression: 0, errorRecoveryRate: 0.5, repeatFailureRate: 0 },
};

beforeEach(() => {
  mkdirSync(TEST_HOME, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_HOME, { recursive: true, force: true });
});

describe("loadStore / saveStore", () => {
  it("returns empty store when no file", () => {
    const store = loadStore();
    expect(store.processedSessionIds).toEqual([]);
    expect(store.snapshots).toEqual([]);
  });

  it("saves and loads round-trip", () => {
    const store = loadStore();
    store.processedSessionIds.push("s1");
    saveStore(store);
    const loaded = loadStore();
    expect(loaded.processedSessionIds).toContain("s1");
    expect(loaded.lastUpdated).toBeTruthy();
  });

  it("prunes >90 day old snapshots", () => {
    const store = loadStore();
    store.snapshots.push(
      { sessionId: "old", timestamp: new Date(Date.now() - 100 * 86400000).toISOString(), project: "p", signals: emptySignals, scoringVersion: "1.0.0" },
      { sessionId: "new", timestamp: new Date().toISOString(), project: "p", signals: emptySignals, scoringVersion: "1.0.0" },
    );
    saveStore(store);
    expect(loadStore().snapshots).toHaveLength(1);
  });
});

describe("isSessionProcessed / addSnapshot", () => {
  it("tracks processed sessions", () => {
    const store = loadStore();
    expect(isSessionProcessed(store, "s1")).toBe(false);
    addSnapshot(store, { sessionId: "s1", timestamp: new Date().toISOString(), project: "p", signals: emptySignals, scoringVersion: "1.0.0" });
    expect(isSessionProcessed(store, "s1")).toBe(true);
  });
});

describe("config", () => {
  it("returns defaults when no config", () => {
    const config = loadConfig();
    expect(config.autoUpload).toBe(true);
    expect(config.public).toBe(false);
  });

  it("saves and loads", () => {
    saveConfig({ autoUpload: false, public: true, username: "u", gistId: "g" });
    const c = loadConfig();
    expect(c.username).toBe("u");
    expect(c.gistId).toBe("g");
  });
});

describe("saveBadge / getBadgePath", () => {
  it("saves SVG and returns path", () => {
    const p = saveBadge("<svg>t</svg>");
    expect(existsSync(p)).toBe(true);
    expect(readFileSync(p, "utf-8")).toBe("<svg>t</svg>");
    expect(getBadgePath()).toBe(p);
  });
});

describe("upsertTokenLog", () => {
  it("inserts new entries", () => {
    const store = loadStore();
    upsertTokenLog(store, [
      { sessionId: "s1", timestamp: "2026-03-19T10:00:00Z", tokens: 5000 },
      { sessionId: "s2", timestamp: "2026-03-19T11:00:00Z", tokens: 3000 },
    ]);
    expect(store.tokenLog).toHaveLength(2);
    expect(store.tokenLog![0]!.tokens).toBe(5000);
  });

  it("updates existing entries by sessionId", () => {
    const store = loadStore();
    upsertTokenLog(store, [{ sessionId: "s1", timestamp: "2026-03-19T10:00:00Z", tokens: 5000 }]);
    upsertTokenLog(store, [{ sessionId: "s1", timestamp: "2026-03-19T10:00:00Z", tokens: 8000 }]);
    expect(store.tokenLog).toHaveLength(1);
    expect(store.tokenLog![0]!.tokens).toBe(8000);
  });
});

describe("computeTokenWindows", () => {
  it("returns zeros for undefined tokenLog", () => {
    expect(computeTokenWindows(undefined)).toEqual({ tokens24h: 0, tokens30d: 0 });
  });

  it("returns zeros for empty tokenLog", () => {
    expect(computeTokenWindows([])).toEqual({ tokens24h: 0, tokens30d: 0 });
  });

  it("computes 24h and 30d windows correctly", () => {
    const now = Date.now();
    const entries: TokenLogEntry[] = [
      { sessionId: "s1", timestamp: new Date(now - 2 * 3600_000).toISOString(), tokens: 1000 },   // 2h ago → in 24h + 30d
      { sessionId: "s2", timestamp: new Date(now - 48 * 3600_000).toISOString(), tokens: 2000 },  // 2d ago → in 30d only
      { sessionId: "s3", timestamp: new Date(now - 40 * 86400_000).toISOString(), tokens: 3000 }, // 40d ago → neither
    ];
    const result = computeTokenWindows(entries);
    expect(result.tokens24h).toBe(1000);
    expect(result.tokens30d).toBe(3000); // 1000 + 2000
  });

  it("skips entries with invalid timestamps", () => {
    const entries: TokenLogEntry[] = [
      { sessionId: "s1", timestamp: "invalid", tokens: 5000 },
      { sessionId: "s2", timestamp: new Date().toISOString(), tokens: 1000 },
    ];
    const result = computeTokenWindows(entries);
    expect(result.tokens24h).toBe(1000);
    expect(result.tokens30d).toBe(1000);
  });
});

describe("saveStore token log pruning", () => {
  it("prunes >90 day old token log entries", () => {
    const store = loadStore();
    store.tokenLog = [
      { sessionId: "old", timestamp: new Date(Date.now() - 100 * 86400_000).toISOString(), tokens: 1000 },
      { sessionId: "new", timestamp: new Date().toISOString(), tokens: 2000 },
    ];
    saveStore(store);
    const loaded = loadStore();
    expect(loaded.tokenLog).toHaveLength(1);
    expect(loaded.tokenLog![0]!.sessionId).toBe("new");
  });
});

describe("logError", () => {
  it("writes to error log", () => {
    logError("test error");
    const log = join(STORE_DIR, "error.log");
    expect(existsSync(log)).toBe(true);
    expect(readFileSync(log, "utf-8")).toContain("test error");
  });

  it("truncates large logs", () => {
    mkdirSync(STORE_DIR, { recursive: true });
    writeFileSync(join(STORE_DIR, "error.log"), "x".repeat(1_100_000));
    logError("new entry");
    expect(readFileSync(join(STORE_DIR, "error.log"), "utf-8").length).toBeLessThan(1_100_000);
  });
});
