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
} from "../../src/store/local-store.js";
import type { ExtractedSignals, SessionSnapshot } from "../../src/types.js";

const STORE_DIR = join(TEST_HOME, ".cc-proficiency");

const emptySignals: ExtractedSignals = {
  ccMastery: { hasGlobalClaudeMd: false, globalClaudeMdHasImports: false, projectClaudeMdCount: 0, hasCustomHooks: false, hookWithMatcherCount: 0, pluginCount: 0, pluginsUsedInTranscripts: 0, uniqueSkillsUsed: 0, usedPlanMode: false, hasRulesFiles: false },
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
