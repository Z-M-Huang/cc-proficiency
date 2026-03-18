import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEST_HOME = join(tmpdir(), "cc-prof-test-config-" + process.pid);
const CLAUDE_DIR = join(TEST_HOME, ".claude");
const TEST_CWD = join(tmpdir(), "cc-prof-test-cwd-" + process.pid);

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
  mkdirSync(TEST_CWD, { recursive: true });
  vi.spyOn(process, "cwd").mockReturnValue(TEST_CWD);
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(TEST_HOME, { recursive: true, force: true });
  rmSync(TEST_CWD, { recursive: true, force: true });
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

  it("detects global rules files", () => {
    mkdirSync(join(CLAUDE_DIR, "rules"), { recursive: true });
    writeFileSync(join(CLAUDE_DIR, "rules", "security.md"), "# Security rules\n");
    const config = parseClaudeConfig();
    expect(config.hasRulesFiles).toBe(true);
    expect(config.rulesFileCount).toBe(1);
  });

  it("detects project-level rules files", () => {
    const projectRulesDir = join(TEST_CWD, ".claude", "rules");
    mkdirSync(projectRulesDir, { recursive: true });
    writeFileSync(join(projectRulesDir, "architecture.md"), "# Arch rules\n");
    const config = parseClaudeConfig();
    expect(config.hasRulesFiles).toBe(true);
    expect(config.rulesFileCount).toBe(1);
  });

  it("counts rules files across both dirs", () => {
    mkdirSync(join(CLAUDE_DIR, "rules"), { recursive: true });
    writeFileSync(join(CLAUDE_DIR, "rules", "global.md"), "# Global\n");
    const projectRulesDir = join(TEST_CWD, ".claude", "rules");
    mkdirSync(projectRulesDir, { recursive: true });
    writeFileSync(join(projectRulesDir, "a.md"), "# A\n");
    writeFileSync(join(projectRulesDir, "b.md"), "# B\n");
    const config = parseClaudeConfig();
    expect(config.rulesFileCount).toBe(3);
  });

  it("detects project-level plugins from .claude/settings.json", () => {
    const projectSettings = join(TEST_CWD, ".claude", "settings.json");
    mkdirSync(join(TEST_CWD, ".claude"), { recursive: true });
    writeFileSync(projectSettings, JSON.stringify({
      enabledPlugins: { "project-plugin@test": true },
    }));
    const config = parseClaudeConfig();
    expect(config.pluginCount).toBe(1);
    expect(config.pluginNames).toContain("project-plugin@test");
  });

  it("detects cwd/CLAUDE.md in projectClaudeMdCount", () => {
    writeFileSync(join(TEST_CWD, "CLAUDE.md"), "# Project config\n");
    const config = parseClaudeConfig();
    expect(config.projectClaudeMdCount).toBe(1);
  });

  it("detects cwd/.claude/CLAUDE.md in projectClaudeMdCount", () => {
    mkdirSync(join(TEST_CWD, ".claude"), { recursive: true });
    writeFileSync(join(TEST_CWD, ".claude", "CLAUDE.md"), "# Project config\n");
    const config = parseClaudeConfig();
    expect(config.projectClaudeMdCount).toBe(1);
  });

  it("scans agent-memory dirs for memory files", () => {
    const agentMemDir = join(TEST_CWD, ".claude", "agent-memory", "reviewer");
    mkdirSync(agentMemDir, { recursive: true });
    writeFileSync(join(agentMemDir, "patterns.md"), "# Patterns\n");
    const config = parseClaudeConfig();
    expect(config.hasMemoryFiles).toBe(true);
    expect(config.memoryFileCount).toBe(1);
  });

  it("detects custom agents from global dir", () => {
    mkdirSync(join(CLAUDE_DIR, "agents"), { recursive: true });
    writeFileSync(join(CLAUDE_DIR, "agents", "reviewer.md"), "---\nname: reviewer\n---\n");
    const config = parseClaudeConfig();
    expect(config.hasCustomAgents).toBe(true);
  });

  it("detects custom agents from project dir", () => {
    const agentsDir = join(TEST_CWD, ".claude", "agents");
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(join(agentsDir, "planner.md"), "---\nname: planner\n---\n");
    const config = parseClaudeConfig();
    expect(config.hasCustomAgents).toBe(true);
  });

  it("detects custom skills with SKILL.md", () => {
    const skillDir = join(TEST_CWD, ".claude", "skills", "deploy");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), "# Deploy skill\n");
    const config = parseClaudeConfig();
    expect(config.hasCustomSkills).toBe(true);
  });

  it("ignores skill dirs without SKILL.md", () => {
    const skillDir = join(TEST_CWD, ".claude", "skills", "empty");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "notes.txt"), "not a skill\n");
    const config = parseClaudeConfig();
    expect(config.hasCustomSkills).toBe(false);
  });

  it("returns false for new signals when dirs are empty", () => {
    const config = parseClaudeConfig();
    expect(config.hasCustomAgents).toBe(false);
    expect(config.hasCustomSkills).toBe(false);
    expect(config.projectClaudeMdCount).toBe(0);
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

  it("merges config across multiple project cwds", () => {
    // Project A has rules
    const projA = join(TEST_CWD, "proj-a");
    mkdirSync(join(projA, ".claude", "rules"), { recursive: true });
    writeFileSync(join(projA, ".claude", "rules", "sec.md"), "# Security\n");

    // Project B has skills but no rules
    const projB = join(TEST_CWD, "proj-b");
    mkdirSync(join(projB, ".claude", "skills", "deploy"), { recursive: true });
    writeFileSync(join(projB, ".claude", "skills", "deploy", "SKILL.md"), "# Deploy\n");

    const config = parseClaudeConfig([projA, projB]);
    expect(config.hasRulesFiles).toBe(true);
    expect(config.rulesFileCount).toBe(1);
    expect(config.hasCustomSkills).toBe(true);
  });

  it("deduplicates plugins across project cwds", () => {
    const projA = join(TEST_CWD, "proj-a");
    mkdirSync(join(projA, ".claude"), { recursive: true });
    writeFileSync(join(projA, ".claude", "settings.json"), JSON.stringify({
      enabledPlugins: { "github@official": true, "context7@official": true },
    }));

    const projB = join(TEST_CWD, "proj-b");
    mkdirSync(join(projB, ".claude"), { recursive: true });
    writeFileSync(join(projB, ".claude", "settings.json"), JSON.stringify({
      enabledPlugins: { "github@official": true, "vcp@vcp": true },
    }));

    const config = parseClaudeConfig([projA, projB]);
    expect(config.pluginCount).toBe(3); // github, context7, vcp (deduped)
  });
});
