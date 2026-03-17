import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEST_HOME = join(tmpdir(), "cc-prof-test-config-" + process.pid);
const CLAUDE_DIR = join(TEST_HOME, ".claude");

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return {
    ...actual,
    homedir: () => join(actual.tmpdir(), "cc-prof-test-config-" + process.pid),
  };
});

import { parseClaudeConfig, buildSetupChecklist } from "../../src/parsers/config-parser.js";

beforeEach(() => {
  mkdirSync(CLAUDE_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_HOME, { recursive: true, force: true });
});

describe("parseClaudeConfig", () => {
  it("returns defaults when no .claude dir content", () => {
    const config = parseClaudeConfig();
    expect(config.hasGlobalClaudeMd).toBe(false);
    expect(config.pluginCount).toBe(0);
    expect(config.hasCustomHooks).toBe(false);
  });

  it("detects global CLAUDE.md", () => {
    writeFileSync(join(CLAUDE_DIR, "CLAUDE.md"), "# My Config\n\n## Rules\n\nDo stuff\n");
    const config = parseClaudeConfig();
    expect(config.hasGlobalClaudeMd).toBe(true);
  });

  it("detects CLAUDE.md with imports/structure", () => {
    writeFileSync(join(CLAUDE_DIR, "CLAUDE.md"), "# Config\n\n## One\n\ntext\n\n## Two\n\ntext\n\n## Three\n\ntext\n\n## Four\n\ntext\n");
    const config = parseClaudeConfig();
    expect(config.globalClaudeMdHasImports).toBe(true);
  });

  it("reads settings.json plugins", () => {
    writeFileSync(join(CLAUDE_DIR, "settings.json"), JSON.stringify({
      enabledPlugins: { "github@official": true, "lsp@official": true, "disabled@x": false },
      effortLevel: "high",
    }));
    const config = parseClaudeConfig();
    expect(config.pluginCount).toBe(2);
    expect(config.pluginNames).toContain("github@official");
    expect(config.effortLevel).toBe("high");
  });

  it("reads hooks from settings.json", () => {
    writeFileSync(join(CLAUDE_DIR, "settings.json"), JSON.stringify({
      hooks: {
        PreToolUse: [{ matcher: "Write|Edit", hooks: [{ type: "command", command: "node hook.js" }] }],
        Stop: [{ hooks: [{ type: "command", command: "node stop.js" }] }],
      },
    }));
    const config = parseClaudeConfig();
    expect(config.hasCustomHooks).toBe(true);
    expect(config.hookWithMatcherCount).toBe(1);
  });

  it("detects project CLAUDE.md files", () => {
    const projDir = join(CLAUDE_DIR, "projects", "-app-foo");
    mkdirSync(projDir, { recursive: true });
    writeFileSync(join(projDir, "CLAUDE.md"), "# Project config\n");
    const config = parseClaudeConfig();
    expect(config.projectClaudeMdCount).toBe(1);
  });

  it("detects memory files", () => {
    const memDir = join(CLAUDE_DIR, "projects", "-app-foo", "memory");
    mkdirSync(memDir, { recursive: true });
    writeFileSync(join(memDir, "user_role.md"), "---\nname: role\n---\nDeveloper\n");
    writeFileSync(join(memDir, "MEMORY.md"), "index\n"); // should not count
    const config = parseClaudeConfig();
    expect(config.hasMemoryFiles).toBe(true);
    expect(config.memoryFileCount).toBe(1);
    expect(config.activeMemoryFileCount).toBe(1);
  });

  it("detects rules files", () => {
    mkdirSync(join(CLAUDE_DIR, "rules"), { recursive: true });
    writeFileSync(join(CLAUDE_DIR, "rules", "security.md"), "# Security rules\n");
    const config = parseClaudeConfig();
    expect(config.hasRulesFiles).toBe(true);
  });

  it("handles missing settings.json gracefully", () => {
    const config = parseClaudeConfig();
    expect(config.pluginCount).toBe(0);
    expect(config.hasCustomHooks).toBe(false);
  });

  it("handles invalid settings.json gracefully", () => {
    writeFileSync(join(CLAUDE_DIR, "settings.json"), "not json");
    const config = parseClaudeConfig();
    expect(config.pluginCount).toBe(0);
  });
});
