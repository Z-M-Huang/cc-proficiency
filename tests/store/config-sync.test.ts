import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEST_HOME = join(tmpdir(), "cc-prof-test-sync-" + process.pid);

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return {
    ...actual,
    homedir: () => join(actual.tmpdir(), "cc-prof-test-sync-" + process.pid),
  };
});

vi.mock("../../src/gist/uploader.js", () => ({
  readGistFile: vi.fn(() => null),
  isGhAuthenticated: vi.fn(() => false),
}));

import {
  getMachineId,
  toSyncable,
  mergeConfigSignals,
  buildSnapshotPayload,
  parseSnapshotsFile,
  downloadRemoteSnapshots,
  mergeRemoteConfig,
} from "../../src/store/config-sync.js";
import { readGistFile } from "../../src/gist/uploader.js";
import type { ConfigSignals } from "../../src/parsers/config-parser.js";
import type { ConfigSnapshot, ConfigSnapshotsFile } from "../../src/types.js";

function makeConfig(overrides: Partial<ConfigSignals> = {}): ConfigSignals {
  return {
    hasGlobalClaudeMd: false,
    globalClaudeMdHasImports: false,
    projectClaudeMdCount: 0,
    hasCustomHooks: false,
    hookWithMatcherCount: 0,
    pluginCount: 0,
    pluginNames: [],
    hasRulesFiles: false,
    rulesFileCount: 0,
    hasMcpServers: false,
    hasMemoryFiles: false,
    memoryFileCount: 0,
    activeMemoryFileCount: 0,
    effortLevel: "",
    hasCustomAgents: false,
    hasCustomSkills: false,
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<ConfigSnapshot> = {}): ConfigSnapshot {
  return {
    timestamp: new Date().toISOString(),
    signals: {
      hasGlobalClaudeMd: false,
      globalClaudeMdHasImports: false,
      projectClaudeMdCount: 0,
      hasCustomHooks: false,
      hookWithMatcherCount: 0,
      pluginCount: 0,
      hasRulesFiles: false,
      rulesFileCount: 0,
      hasMcpServers: false,
      hasMemoryFiles: false,
      memoryFileCount: 0,
      activeMemoryFileCount: 0,
      effortLevel: "",
      hasCustomAgents: false,
      hasCustomSkills: false,
    },
    ...overrides,
  };
}

beforeEach(() => {
  mkdirSync(TEST_HOME, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_HOME, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ── getMachineId ──

describe("getMachineId", () => {
  it("returns 8-char hex string", () => {
    const id = getMachineId();
    expect(id).toMatch(/^[0-9a-f]{8}$/);
  });

  it("returns stable value across calls", () => {
    const id1 = getMachineId();
    const id2 = getMachineId();
    expect(id1).toBe(id2);
  });

  it("persists to machine-id file", () => {
    const id = getMachineId();
    const file = join(TEST_HOME, ".cc-proficiency", "machine-id");
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf-8")).toBe(id);
  });
});

// ── toSyncable ──

describe("toSyncable", () => {
  it("strips pluginNames", () => {
    const config = makeConfig({ pluginNames: ["a", "b"], pluginCount: 2, hasRulesFiles: true });
    const result = toSyncable(config);
    expect("pluginNames" in result).toBe(false);
    expect(result.pluginCount).toBe(2);
    expect(result.hasRulesFiles).toBe(true);
  });

  it("preserves all other fields", () => {
    const config = makeConfig({
      hasGlobalClaudeMd: true,
      rulesFileCount: 5,
      effortLevel: "high",
    });
    const result = toSyncable(config);
    expect(result.hasGlobalClaudeMd).toBe(true);
    expect(result.rulesFileCount).toBe(5);
    expect(result.effortLevel).toBe("high");
  });
});

// ── mergeConfigSignals ──

describe("mergeConfigSignals", () => {
  it("returns local unchanged for empty snapshots", () => {
    const local = makeConfig({ hasRulesFiles: true, rulesFileCount: 3 });
    const result = mergeConfigSignals(local, []);
    expect(result).toEqual(local);
  });

  it("ORs booleans across snapshots", () => {
    const local = makeConfig({ hasCustomHooks: false, hasRulesFiles: true });
    const remote = makeSnapshot({
      signals: {
        ...makeSnapshot().signals,
        hasCustomHooks: true,
        hasRulesFiles: false,
      },
    });
    const result = mergeConfigSignals(local, [remote]);
    expect(result.hasCustomHooks).toBe(true);
    expect(result.hasRulesFiles).toBe(true);
  });

  it("takes MAX of counts", () => {
    const local = makeConfig({ rulesFileCount: 3, pluginCount: 10 });
    const remote = makeSnapshot({
      signals: { ...makeSnapshot().signals, rulesFileCount: 7, pluginCount: 5 },
    });
    const result = mergeConfigSignals(local, [remote]);
    expect(result.rulesFileCount).toBe(7);
    expect(result.pluginCount).toBe(10);
  });

  it("preserves local pluginNames", () => {
    const local = makeConfig({ pluginNames: ["my-plugin"] });
    const remote = makeSnapshot();
    const result = mergeConfigSignals(local, [remote]);
    expect(result.pluginNames).toEqual(["my-plugin"]);
  });

  it("handles multiple remote snapshots", () => {
    const local = makeConfig({ rulesFileCount: 1, hasCustomHooks: false });
    const remote1 = makeSnapshot({
      signals: { ...makeSnapshot().signals, rulesFileCount: 5, hasCustomAgents: true },
    });
    const remote2 = makeSnapshot({
      signals: { ...makeSnapshot().signals, rulesFileCount: 3, hasCustomHooks: true },
    });
    const result = mergeConfigSignals(local, [remote1, remote2]);
    expect(result.rulesFileCount).toBe(5);
    expect(result.hasCustomAgents).toBe(true);
    expect(result.hasCustomHooks).toBe(true);
  });

  it("prefers highest effortLevel", () => {
    const local = makeConfig({ effortLevel: "" });
    const remote1 = makeSnapshot({
      signals: { ...makeSnapshot().signals, effortLevel: "normal" },
    });
    const remote2 = makeSnapshot({
      signals: { ...makeSnapshot().signals, effortLevel: "high" },
    });
    const result = mergeConfigSignals(local, [remote1, remote2]);
    expect(result.effortLevel).toBe("high");
  });

  it("does not downgrade effortLevel from local", () => {
    const local = makeConfig({ effortLevel: "high" });
    const remote = makeSnapshot({
      signals: { ...makeSnapshot().signals, effortLevel: "normal" },
    });
    const result = mergeConfigSignals(local, [remote]);
    expect(result.effortLevel).toBe("high");
  });
});

// ── buildSnapshotPayload ──

describe("buildSnapshotPayload", () => {
  it("creates new file when none exists", () => {
    const config = makeConfig({ hasRulesFiles: true, rulesFileCount: 3 });
    const result = buildSnapshotPayload(null, config);
    expect(result.version).toBe("1.0.0");
    const snapshots = Object.values(result.snapshots);
    expect(snapshots.length).toBe(1);
    expect(snapshots[0]!.signals.hasRulesFiles).toBe(true);
    expect(snapshots[0]!.signals.rulesFileCount).toBe(3);
  });

  it("upserts existing machine snapshot", () => {
    const machineId = getMachineId();
    const existing: ConfigSnapshotsFile = {
      version: "1.0.0",
      snapshots: {
        [machineId]: {
          timestamp: new Date(Date.now() - 1000).toISOString(),
          signals: makeSnapshot().signals,
        },
      },
    };
    const config = makeConfig({ pluginCount: 99 });
    const result = buildSnapshotPayload(existing, config);
    expect(Object.keys(result.snapshots).length).toBe(1);
    expect(result.snapshots[machineId]!.signals.pluginCount).toBe(99);
  });

  it("preserves other machines snapshots", () => {
    const existing: ConfigSnapshotsFile = {
      version: "1.0.0",
      snapshots: {
        othermac: {
          timestamp: new Date().toISOString(),
          signals: makeSnapshot().signals,
        },
      },
    };
    const config = makeConfig();
    const result = buildSnapshotPayload(existing, config);
    expect(result.snapshots["othermac"]).toBeDefined();
    expect(Object.keys(result.snapshots).length).toBe(2);
  });

  it("prunes stale snapshots (>30 days)", () => {
    const staleDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const existing: ConfigSnapshotsFile = {
      version: "1.0.0",
      snapshots: {
        staleone: {
          timestamp: staleDate,
          signals: makeSnapshot().signals,
        },
        freshone: {
          timestamp: new Date().toISOString(),
          signals: makeSnapshot().signals,
        },
      },
    };
    const config = makeConfig();
    const result = buildSnapshotPayload(existing, config);
    expect(result.snapshots["staleone"]).toBeUndefined();
    expect(result.snapshots["freshone"]).toBeDefined();
  });

  it("strips pluginNames from snapshot signals", () => {
    const config = makeConfig({ pluginNames: ["secret-plugin"] });
    const result = buildSnapshotPayload(null, config);
    const snapshot = Object.values(result.snapshots)[0]!;
    expect("pluginNames" in snapshot.signals).toBe(false);
  });
});

// ── parseSnapshotsFile ──

describe("parseSnapshotsFile", () => {
  it("returns null for invalid JSON", () => {
    expect(parseSnapshotsFile("not json")).toBeNull();
  });

  it("returns null for wrong version", () => {
    expect(parseSnapshotsFile('{"version":"2.0.0","snapshots":{}}')).toBeNull();
  });

  it("returns null for missing snapshots", () => {
    expect(parseSnapshotsFile('{"version":"1.0.0"}')).toBeNull();
  });

  it("parses valid file", () => {
    const file: ConfigSnapshotsFile = { version: "1.0.0", snapshots: {} };
    const result = parseSnapshotsFile(JSON.stringify(file));
    expect(result).toEqual(file);
  });
});

// ── downloadRemoteSnapshots ──

describe("downloadRemoteSnapshots", () => {
  it("returns [] when gist file does not exist", () => {
    vi.mocked(readGistFile).mockReturnValue(null);
    expect(downloadRemoteSnapshots("gist123")).toEqual([]);
  });

  it("returns [] for malformed JSON", () => {
    vi.mocked(readGistFile).mockReturnValue("not json");
    expect(downloadRemoteSnapshots("gist123")).toEqual([]);
  });

  it("excludes current machine snapshot", () => {
    const machineId = getMachineId();
    const file: ConfigSnapshotsFile = {
      version: "1.0.0",
      snapshots: {
        [machineId]: { timestamp: new Date().toISOString(), signals: makeSnapshot().signals },
        othermac: { timestamp: new Date().toISOString(), signals: makeSnapshot().signals },
      },
    };
    vi.mocked(readGistFile).mockReturnValue(JSON.stringify(file));
    const result = downloadRemoteSnapshots("gist123");
    expect(result.length).toBe(1);
  });

  it("excludes stale snapshots", () => {
    const staleDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const file: ConfigSnapshotsFile = {
      version: "1.0.0",
      snapshots: {
        staleone: { timestamp: staleDate, signals: makeSnapshot().signals },
      },
    };
    vi.mocked(readGistFile).mockReturnValue(JSON.stringify(file));
    expect(downloadRemoteSnapshots("gist123")).toEqual([]);
  });
});

// ── mergeRemoteConfig ──

describe("mergeRemoteConfig", () => {
  it("returns local config on gist failure", () => {
    vi.mocked(readGistFile).mockReturnValue(null);
    const local = makeConfig({ hasRulesFiles: true });
    const result = mergeRemoteConfig(local, "gist123");
    expect(result).toEqual(local);
  });

  it("merges remote snapshots on success", () => {
    const file: ConfigSnapshotsFile = {
      version: "1.0.0",
      snapshots: {
        othermac: {
          timestamp: new Date().toISOString(),
          signals: { ...makeSnapshot().signals, hasCustomHooks: true, rulesFileCount: 10 },
        },
      },
    };
    vi.mocked(readGistFile).mockReturnValue(JSON.stringify(file));
    const local = makeConfig({ rulesFileCount: 3 });
    const result = mergeRemoteConfig(local, "gist123");
    expect(result.hasCustomHooks).toBe(true);
    expect(result.rulesFileCount).toBe(10);
  });
});
