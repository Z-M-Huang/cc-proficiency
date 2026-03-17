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

/**
 * Parse Claude Code configuration from ~/.claude/ directory.
 */
export function parseClaudeConfig(): ConfigSignals {
  const result: ConfigSignals = {
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

  // Global CLAUDE.md
  const globalClaudeMd = join(CLAUDE_DIR, "CLAUDE.md");
  if (existsSync(globalClaudeMd)) {
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

  // Settings
  const settingsPath = join(CLAUDE_DIR, "settings.json");
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));

      // Plugins
      if (settings.enabledPlugins) {
        const names = Object.keys(settings.enabledPlugins).filter(
          (k) => settings.enabledPlugins[k] === true
        );
        result.pluginCount = names.length;
        result.pluginNames = names;
      }

      // Effort level
      result.effortLevel = settings.effortLevel ?? "";

      // Hooks from settings.json
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

  // Also detect hooks from installed plugins (plugins/cache/*/hooks/hooks.json)
  const pluginCacheDir = join(CLAUDE_DIR, "plugins", "cache");
  if (existsSync(pluginCacheDir)) {
    try {
      for (const marketplace of readdirSync(pluginCacheDir)) {
        const marketDir = join(pluginCacheDir, marketplace);
        if (!statSync(marketDir).isDirectory()) continue;
        for (const plugin of readdirSync(marketDir)) {
          const pluginDir = join(marketDir, plugin);
          if (!statSync(pluginDir).isDirectory()) continue;
          // Check versioned subdirs or direct hooks.json
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

  // Project CLAUDE.md files and memory
  const projectsDir = join(CLAUDE_DIR, "projects");
  if (existsSync(projectsDir)) {
    try {
      const projects = readdirSync(projectsDir);
      for (const proj of projects) {
        const projDir = join(projectsDir, proj);
        if (!statSync(projDir).isDirectory()) continue;

        // Project CLAUDE.md
        if (existsSync(join(projDir, "CLAUDE.md"))) {
          result.projectClaudeMdCount++;
        }

        // Memory files
        const memoryDir = join(projDir, "memory");
        if (existsSync(memoryDir) && statSync(memoryDir).isDirectory()) {
          try {
            const memFiles = readdirSync(memoryDir).filter(
              (f) => f.endsWith(".md") && f !== "MEMORY.md"
            );
            result.memoryFileCount += memFiles.length;
            if (memFiles.length > 0) result.hasMemoryFiles = true;

            // Active = modified in last 30 days
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

  // Rules files
  const rulesDir = join(CLAUDE_DIR, "rules");
  if (existsSync(rulesDir)) {
    try {
      const rules = readdirSync(rulesDir).filter((f) => f.endsWith(".md"));
      result.hasRulesFiles = rules.length > 0;
    } catch {
      // can't read
    }
  }

  // MCP servers — check multiple locations
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

  // Also check plugin .mcp.json files (plugins register MCP servers)
  if (existsSync(pluginCacheDir)) {
    try {
      for (const marketplace of readdirSync(pluginCacheDir)) {
        const marketDir = join(pluginCacheDir, marketplace);
        if (!statSync(marketDir).isDirectory()) continue;
        for (const plugin of readdirSync(marketDir)) {
          const pluginDir = join(marketDir, plugin);
          if (!statSync(pluginDir).isDirectory()) continue;
          // Check for .mcp.json in plugin dirs (including versioned subdirs)
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
              // MCP configs can have mcpServers key or be a flat map of server names
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
