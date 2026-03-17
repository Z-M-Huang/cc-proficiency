import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// We can't easily mock homedir, so test the buildSetupChecklist and
// the parsing logic via direct function calls with controlled inputs.
import { buildSetupChecklist } from "../../src/parsers/config-parser.js";
import type { ConfigSignals } from "../../src/parsers/config-parser.js";

describe("buildSetupChecklist", () => {
  it("returns all false for empty config", () => {
    const config: ConfigSignals = {
      hasGlobalClaudeMd: false,
      globalClaudeMdHasImports: false,
      projectClaudeMdCount: 0,
      hasCustomHooks: false,
      hookWithMatcherCount: 0,
      pluginCount: 0,
      pluginNames: [],
      hasRulesFiles: false,
      hasMcpServers: false,
      hasMemoryFiles: false,
      memoryFileCount: 0,
      activeMemoryFileCount: 0,
      effortLevel: "",
    };

    const cl = buildSetupChecklist(config);
    expect(cl.hasClaudeMd).toBe(false);
    expect(cl.hasHooks).toBe(false);
    expect(cl.hasPlugins).toBe(false);
    expect(cl.hasMcpServers).toBe(false);
    expect(cl.hasMemory).toBe(false);
    expect(cl.hasRules).toBe(false);
  });

  it("returns all true for fully configured", () => {
    const config: ConfigSignals = {
      hasGlobalClaudeMd: true,
      globalClaudeMdHasImports: true,
      projectClaudeMdCount: 3,
      hasCustomHooks: true,
      hookWithMatcherCount: 5,
      pluginCount: 8,
      pluginNames: ["a@x", "b@y"],
      hasRulesFiles: true,
      hasMcpServers: true,
      hasMemoryFiles: true,
      memoryFileCount: 5,
      activeMemoryFileCount: 3,
      effortLevel: "high",
    };

    const cl = buildSetupChecklist(config);
    expect(cl.hasClaudeMd).toBe(true);
    expect(cl.hasHooks).toBe(true);
    expect(cl.hasPlugins).toBe(true);
    expect(cl.hasMcpServers).toBe(true);
    expect(cl.hasMemory).toBe(true);
    expect(cl.hasRules).toBe(true);
  });

  it("returns partial results for partial config", () => {
    const config: ConfigSignals = {
      hasGlobalClaudeMd: true,
      globalClaudeMdHasImports: false,
      projectClaudeMdCount: 0,
      hasCustomHooks: true,
      hookWithMatcherCount: 1,
      pluginCount: 2,
      pluginNames: ["a@x"],
      hasRulesFiles: false,
      hasMcpServers: false,
      hasMemoryFiles: false,
      memoryFileCount: 0,
      activeMemoryFileCount: 0,
      effortLevel: "normal",
    };

    const cl = buildSetupChecklist(config);
    expect(cl.hasClaudeMd).toBe(true);
    expect(cl.hasHooks).toBe(true);
    expect(cl.hasPlugins).toBe(true);
    expect(cl.hasMcpServers).toBe(false);
    expect(cl.hasMemory).toBe(false);
    expect(cl.hasRules).toBe(false);
  });
});
