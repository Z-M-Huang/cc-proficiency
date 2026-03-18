import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ConfigSignals } from "./config-parser.js";

const CLAUDE_DIR = join(homedir(), ".claude");

export function parseGlobalClaudeMd(result: ConfigSignals): void {
  const globalClaudeMd = join(CLAUDE_DIR, "CLAUDE.md");
  if (!existsSync(globalClaudeMd)) return;

  result.hasGlobalClaudeMd = true;
  try {
    const content = readFileSync(globalClaudeMd, "utf-8");
    result.globalClaudeMdHasImports =
      content.includes("@import") ||
      content.includes("<!-- import") ||
      content.includes("## ") && content.split("## ").length > 3;
  } catch {
    // can't read — still counts as existing
  }
}

export function parseSettings(result: ConfigSignals): void {
  const settingsPath = join(CLAUDE_DIR, "settings.json");
  if (!existsSync(settingsPath)) return;

  try {
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));

    if (settings.enabledPlugins) {
      const names = Object.keys(settings.enabledPlugins).filter(
        (k) => settings.enabledPlugins[k] === true
      );
      result.pluginCount = names.length;
      result.pluginNames = names;
    }

    result.effortLevel = settings.effortLevel ?? "";

    if (settings.hooks) {
      const allHooks = Object.values(settings.hooks) as unknown[][];
      let totalHooks = 0;
      let matcherHooks = 0;
      for (const eventHooks of allHooks) {
        if (!Array.isArray(eventHooks)) continue;
        for (const hookGroup of eventHooks) {
          const group = hookGroup as { matcher?: string; hooks?: unknown[] };
          if (group.hooks) {
            totalHooks += group.hooks.length;
            if (group.matcher) matcherHooks += group.hooks.length;
          }
        }
      }
      result.hasCustomHooks = totalHooks > 0;
      result.hookWithMatcherCount = matcherHooks;
    }
  } catch {
    // settings unreadable
  }
}

export function parsePluginHooks(result: ConfigSignals): void {
  const pluginCacheDir = join(CLAUDE_DIR, "plugins", "cache");
  if (!existsSync(pluginCacheDir)) return;

  try {
    for (const marketplace of readdirSync(pluginCacheDir)) {
      const marketDir = join(pluginCacheDir, marketplace);
      if (!statSync(marketDir).isDirectory()) continue;
      for (const plugin of readdirSync(marketDir)) {
        const pluginDir = join(marketDir, plugin);
        if (!statSync(pluginDir).isDirectory()) continue;
        const candidates = [join(pluginDir, "hooks", "hooks.json")];
        try {
          for (const sub of readdirSync(pluginDir)) {
            const subHooks = join(pluginDir, sub, "hooks", "hooks.json");
            if (existsSync(subHooks)) candidates.push(subHooks);
          }
        } catch { /* skip */ }
        for (const hooksPath of candidates) {
          if (!existsSync(hooksPath)) continue;
          try {
            const hooksConfig = JSON.parse(readFileSync(hooksPath, "utf-8"));
            if (hooksConfig.hooks) {
              for (const eventHooks of Object.values(hooksConfig.hooks) as unknown[][]) {
                if (!Array.isArray(eventHooks)) continue;
                for (const hookGroup of eventHooks) {
                  const group = hookGroup as { matcher?: string; hooks?: unknown[] };
                  if (group.hooks) {
                    result.hasCustomHooks = true;
                    if (group.matcher) result.hookWithMatcherCount += group.hooks.length;
                  }
                }
              }
            }
          } catch { /* skip */ }
        }
      }
    }
  } catch { /* skip */ }
}

function scanMemoryDir(memoryDir: string, result: ConfigSignals): void {
  if (!existsSync(memoryDir) || !statSync(memoryDir).isDirectory()) return;
  try {
    const memFiles = readdirSync(memoryDir).filter(
      (f) => f.endsWith(".md") && f !== "MEMORY.md"
    );
    result.memoryFileCount += memFiles.length;
    if (memFiles.length > 0) result.hasMemoryFiles = true;

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const f of memFiles) {
      try {
        const stat = statSync(join(memoryDir, f));
        if (stat.mtimeMs > thirtyDaysAgo) {
          result.activeMemoryFileCount++;
        }
      } catch {
        // skip
      }
    }
  } catch {
    // can't read memory dir
  }
}

export function parseProjectsAndMemory(result: ConfigSignals): void {
  // Scan ~/.claude/projects/*/CLAUDE.md and */memory/
  const projectsDir = join(CLAUDE_DIR, "projects");
  if (existsSync(projectsDir)) {
    try {
      const projects = readdirSync(projectsDir);
      for (const proj of projects) {
        const projDir = join(projectsDir, proj);
        if (!statSync(projDir).isDirectory()) continue;

        if (existsSync(join(projDir, "CLAUDE.md"))) {
          result.projectClaudeMdCount++;
        }

        scanMemoryDir(join(projDir, "memory"), result);
      }
    } catch {
      // can't read projects dir
    }
  }

  // Detect cwd project-level CLAUDE.md
  const cwd = process.cwd();
  if (existsSync(join(cwd, "CLAUDE.md"))) result.projectClaudeMdCount++;
  if (existsSync(join(cwd, ".claude", "CLAUDE.md"))) result.projectClaudeMdCount++;

  // Scan agent-memory dirs (user + project level)
  const agentMemoryDirs = [
    join(CLAUDE_DIR, "agent-memory"),
    join(cwd, ".claude", "agent-memory"),
  ];
  for (const dir of agentMemoryDirs) {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    try {
      for (const sub of readdirSync(dir)) {
        scanMemoryDir(join(dir, sub), result);
      }
    } catch {
      // skip
    }
  }
}

export function parseRulesFiles(result: ConfigSignals): void {
  const dirs = [
    join(CLAUDE_DIR, "rules"),
    join(process.cwd(), ".claude", "rules"),
  ];
  for (const rulesDir of dirs) {
    if (!existsSync(rulesDir)) continue;
    try {
      const rules = readdirSync(rulesDir).filter((f) => f.endsWith(".md"));
      if (rules.length > 0) {
        result.hasRulesFiles = true;
        return;
      }
    } catch {
      // can't read
    }
  }
}

export function parseMcpServers(result: ConfigSignals): void {
  const mcpPaths = [
    join(CLAUDE_DIR, ".mcp.json"),
    join(CLAUDE_DIR, "mcp.json"),
    join(process.cwd(), ".mcp.json"),
    join(process.cwd(), "mcp.json"),
  ];
  for (const mcpPath of mcpPaths) {
    if (existsSync(mcpPath)) {
      try {
        const mcp = JSON.parse(readFileSync(mcpPath, "utf-8"));
        if (mcp.mcpServers && Object.keys(mcp.mcpServers).length > 0) {
          result.hasMcpServers = true;
        }
      } catch {
        // invalid JSON
      }
    }
  }

  const pluginCacheDir = join(CLAUDE_DIR, "plugins", "cache");
  if (!existsSync(pluginCacheDir)) return;

  try {
    for (const marketplace of readdirSync(pluginCacheDir)) {
      const marketDir = join(pluginCacheDir, marketplace);
      if (!statSync(marketDir).isDirectory()) continue;
      for (const plugin of readdirSync(marketDir)) {
        const pluginDir = join(marketDir, plugin);
        if (!statSync(pluginDir).isDirectory()) continue;
        const mcpCandidates = [join(pluginDir, ".mcp.json")];
        try {
          for (const sub of readdirSync(pluginDir)) {
            const subMcp = join(pluginDir, sub, ".mcp.json");
            if (existsSync(subMcp)) mcpCandidates.push(subMcp);
          }
        } catch { /* skip */ }
        for (const mcpFile of mcpCandidates) {
          if (!existsSync(mcpFile)) continue;
          try {
            const mcp = JSON.parse(readFileSync(mcpFile, "utf-8"));
            if (mcp.mcpServers && Object.keys(mcp.mcpServers).length > 0) {
              result.hasMcpServers = true;
            } else if (Object.keys(mcp).some((k) => typeof mcp[k] === "object" && mcp[k]?.command)) {
              result.hasMcpServers = true;
            }
          } catch { /* skip */ }
        }
      }
    }
  } catch { /* skip */ }
}

export function parseCustomAgents(result: ConfigSignals): void {
  const dirs = [
    join(CLAUDE_DIR, "agents"),
    join(process.cwd(), ".claude", "agents"),
  ];
  for (const agentsDir of dirs) {
    if (!existsSync(agentsDir)) continue;
    try {
      const agents = readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
      if (agents.length > 0) {
        result.hasCustomAgents = true;
        return;
      }
    } catch {
      // can't read
    }
  }
}

export function parseCustomSkills(result: ConfigSignals): void {
  const dirs = [
    join(CLAUDE_DIR, "skills"),
    join(process.cwd(), ".claude", "skills"),
  ];
  for (const skillsDir of dirs) {
    if (!existsSync(skillsDir)) continue;
    try {
      for (const entry of readdirSync(skillsDir)) {
        const entryPath = join(skillsDir, entry);
        if (!statSync(entryPath).isDirectory()) continue;
        if (existsSync(join(entryPath, "SKILL.md"))) {
          result.hasCustomSkills = true;
          return;
        }
      }
    } catch {
      // can't read
    }
  }
}
