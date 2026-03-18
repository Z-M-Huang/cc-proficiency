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

function parseSettingsFile(
  settingsPath: string,
  result: ConfigSignals,
  pluginNames: Set<string>
): void {
  if (!existsSync(settingsPath)) return;
  try {
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));

    if (settings.enabledPlugins) {
      for (const k of Object.keys(settings.enabledPlugins)) {
        if (settings.enabledPlugins[k] === true) pluginNames.add(k);
      }
    }

    if (settings.effortLevel) {
      result.effortLevel = settings.effortLevel;
    }

    if (settings.hooks) {
      const allHooks = Object.values(settings.hooks) as unknown[][];
      for (const eventHooks of allHooks) {
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
  } catch {
    // settings unreadable
  }
}

/** Parse global ~/.claude/settings.json (called once). */
export function parseGlobalSettings(result: ConfigSignals): void {
  const pluginNames = new Set(result.pluginNames);
  parseSettingsFile(join(CLAUDE_DIR, "settings.json"), result, pluginNames);
  result.pluginCount = pluginNames.size;
  result.pluginNames = [...pluginNames];
}

/** Parse project-level .claude/settings.json (called per project cwd). */
export function parseSettings(result: ConfigSignals, cwd: string): void {
  const pluginNames = new Set(result.pluginNames);
  parseSettingsFile(join(cwd, ".claude", "settings.json"), result, pluginNames);
  result.pluginCount = pluginNames.size;
  result.pluginNames = [...pluginNames];
}

/** Parse plugin hooks from global cache. Global-only: plugins install to ~/.claude/plugins/cache/. */
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

/** Scan global ~/.claude/projects/ for CLAUDE.md and memory. */
export function parseProjectsAndMemory(result: ConfigSignals): void {
  const projectsDir = join(CLAUDE_DIR, "projects");
  if (!existsSync(projectsDir)) return;

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

  // Global agent-memory
  const globalAgentMem = join(CLAUDE_DIR, "agent-memory");
  if (existsSync(globalAgentMem) && statSync(globalAgentMem).isDirectory()) {
    try {
      for (const sub of readdirSync(globalAgentMem)) {
        scanMemoryDir(join(globalAgentMem, sub), result);
      }
    } catch { /* skip */ }
  }
}

/** Scan a project cwd for CLAUDE.md (per project cwd). */
export function parseProjectClaudeMd(result: ConfigSignals, cwd: string): void {
  if (existsSync(join(cwd, "CLAUDE.md"))) result.projectClaudeMdCount++;
  if (existsSync(join(cwd, ".claude", "CLAUDE.md"))) result.projectClaudeMdCount++;
}

/** Scan a project cwd for agent-memory (per project cwd). */
export function parseProjectAgentMemory(result: ConfigSignals, cwd: string): void {
  const agentMemDir = join(cwd, ".claude", "agent-memory");
  if (!existsSync(agentMemDir) || !statSync(agentMemDir).isDirectory()) return;
  try {
    for (const sub of readdirSync(agentMemDir)) {
      scanMemoryDir(join(agentMemDir, sub), result);
    }
  } catch { /* skip */ }
}

export function parseGlobalRulesFiles(result: ConfigSignals): void {
  const rulesDir = join(CLAUDE_DIR, "rules");
  if (!existsSync(rulesDir)) return;
  try {
    const rules = readdirSync(rulesDir).filter((f) => f.endsWith(".md"));
    result.rulesFileCount += rules.length;
  } catch { /* skip */ }
  result.hasRulesFiles = result.rulesFileCount > 0;
}

export function parseRulesFiles(result: ConfigSignals, cwd: string): void {
  const rulesDir = join(cwd, ".claude", "rules");
  if (!existsSync(rulesDir)) return;
  try {
    const rules = readdirSync(rulesDir).filter((f) => f.endsWith(".md"));
    result.rulesFileCount += rules.length;
  } catch { /* skip */ }
  result.hasRulesFiles = result.rulesFileCount > 0;
}

/** Parse global ~/.claude MCP configs + plugin MCP (called once). */
export function parseGlobalMcpServers(result: ConfigSignals): void {
  for (const name of [".mcp.json", "mcp.json"]) {
    const mcpPath = join(CLAUDE_DIR, name);
    if (!existsSync(mcpPath)) continue;
    try {
      const mcp = JSON.parse(readFileSync(mcpPath, "utf-8"));
      if (mcp.mcpServers && Object.keys(mcp.mcpServers).length > 0) {
        result.hasMcpServers = true;
      }
    } catch { /* skip */ }
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

/** Parse project-level MCP configs (called per project cwd). */
export function parseMcpServers(result: ConfigSignals, cwd: string): void {
  const mcpPaths = [
    join(cwd, ".mcp.json"),
    join(cwd, "mcp.json"),
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
}

/** Parse global ~/.claude/agents/ (called once). */
export function parseGlobalAgents(result: ConfigSignals): void {
  const agentsDir = join(CLAUDE_DIR, "agents");
  if (!existsSync(agentsDir)) return;
  try {
    if (readdirSync(agentsDir).some((f) => f.endsWith(".md"))) {
      result.hasCustomAgents = true;
    }
  } catch { /* skip */ }
}

/** Parse project-level .claude/agents/ (called per project cwd). */
export function parseCustomAgents(result: ConfigSignals, cwd: string): void {
  const agentsDir = join(cwd, ".claude", "agents");
  if (!existsSync(agentsDir)) return;
  try {
    if (readdirSync(agentsDir).some((f) => f.endsWith(".md"))) {
      result.hasCustomAgents = true;
    }
  } catch { /* skip */ }
}

/** Parse global ~/.claude/skills/ (called once). */
export function parseGlobalSkills(result: ConfigSignals): void {
  const skillsDir = join(CLAUDE_DIR, "skills");
  if (!existsSync(skillsDir)) return;
  try {
    for (const entry of readdirSync(skillsDir)) {
      const entryPath = join(skillsDir, entry);
      if (!statSync(entryPath).isDirectory()) continue;
      if (existsSync(join(entryPath, "SKILL.md"))) {
        result.hasCustomSkills = true;
        return;
      }
    }
  } catch { /* skip */ }
}

/** Parse project-level .claude/skills/ (called per project cwd). */
export function parseCustomSkills(result: ConfigSignals, cwd: string): void {
  const skillsDir = join(cwd, ".claude", "skills");
  if (!existsSync(skillsDir)) return;
  try {
    for (const entry of readdirSync(skillsDir)) {
      const entryPath = join(skillsDir, entry);
      if (!statSync(entryPath).isDirectory()) continue;
      if (existsSync(join(entryPath, "SKILL.md"))) {
        result.hasCustomSkills = true;
        return;
      }
    }
  } catch { /* skip */ }
}
