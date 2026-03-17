import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { SetupChecklist } from "../types.js";

const CLAUDE_DIR = join(homedir(), ".claude");

export interface ConfigSignals {
  hasGlobalClaudeMd: boolean;
  globalClaudeMdHasImports: boolean;
  projectClaudeMdCount: number;
  hasCustomHooks: boolean;
  hookWithMatcherCount: number;
  pluginCount: number;
  pluginNames: string[];
  hasRulesFiles: boolean;
  hasMcpServers: boolean;
  hasMemoryFiles: boolean;
  memoryFileCount: number;
  activeMemoryFileCount: number;
  effortLevel: string;
}

function emptySignals(): ConfigSignals {
  return {
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
}

function parseGlobalClaudeMd(result: ConfigSignals): void {
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

function parseSettings(result: ConfigSignals): void {
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

function parsePluginHooks(result: ConfigSignals): void {
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

function parseProjectsAndMemory(result: ConfigSignals): void {
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

      const memoryDir = join(projDir, "memory");
      if (existsSync(memoryDir) && statSync(memoryDir).isDirectory()) {
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
    }
  } catch {
    // can't read projects dir
  }
}

function parseRulesFiles(result: ConfigSignals): void {
  const rulesDir = join(CLAUDE_DIR, "rules");
  if (!existsSync(rulesDir)) return;

  try {
    const rules = readdirSync(rulesDir).filter((f) => f.endsWith(".md"));
    result.hasRulesFiles = rules.length > 0;
  } catch {
    // can't read
  }
}

function parseMcpServers(result: ConfigSignals): void {
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

/**
 * Parse Claude Code configuration from ~/.claude/ directory.
 */
export function parseClaudeConfig(): ConfigSignals {
  const result = emptySignals();

  parseGlobalClaudeMd(result);
  parseSettings(result);
  parsePluginHooks(result);
  parseProjectsAndMemory(result);
  parseRulesFiles(result);
  parseMcpServers(result);

  return result;
}

/**
 * Build a setup checklist from config signals.
 */
export function buildSetupChecklist(config: ConfigSignals): SetupChecklist {
  return {
    hasClaudeMd: config.hasGlobalClaudeMd,
    hasHooks: config.hasCustomHooks,
    hasPlugins: config.pluginCount > 0,
    hasMcpServers: config.hasMcpServers,
    hasMemory: config.hasMemoryFiles,
    hasRules: config.hasRulesFiles,
  };
}
