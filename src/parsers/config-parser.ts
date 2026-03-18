import type { SetupChecklist } from "../types.js";
import {
  parseGlobalClaudeMd,
  parseGlobalSettings,
  parseSettings,
  parsePluginHooks,
  parseProjectsAndMemory,
  parseProjectClaudeMd,
  parseProjectAgentMemory,
  parseGlobalRulesFiles,
  parseRulesFiles,
  parseGlobalMcpServers,
  parseMcpServers,
  parseGlobalAgents,
  parseCustomAgents,
  parseGlobalSkills,
  parseCustomSkills,
} from "./config-detectors.js";

export interface ConfigSignals {
  hasGlobalClaudeMd: boolean;
  globalClaudeMdHasImports: boolean;
  projectClaudeMdCount: number;
  hasCustomHooks: boolean;
  hookWithMatcherCount: number;
  pluginCount: number;
  pluginNames: string[];
  hasRulesFiles: boolean;
  rulesFileCount: number;
  hasMcpServers: boolean;
  hasMemoryFiles: boolean;
  memoryFileCount: number;
  activeMemoryFileCount: number;
  effortLevel: string;
  hasCustomAgents: boolean;
  hasCustomSkills: boolean;
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
    rulesFileCount: 0,
    hasMcpServers: false,
    hasMemoryFiles: false,
    memoryFileCount: 0,
    activeMemoryFileCount: 0,
    effortLevel: "",
    hasCustomAgents: false,
    hasCustomSkills: false,
  };
}

/**
 * Parse Claude Code configuration from ~/.claude/ and project .claude/ directories.
 * @param projectCwds - project directories to scan for project-level config.
 *   Defaults to [process.cwd()] for backward compatibility.
 */
export function parseClaudeConfig(projectCwds?: string[]): ConfigSignals {
  const cwds = [...new Set((projectCwds ?? [process.cwd()]).map((p) => p.replace(/\/+$/, "")))];
  const result = emptySignals();

  // Global signals (scanned once)
  parseGlobalClaudeMd(result);
  parseGlobalSettings(result);
  parsePluginHooks(result);
  parseProjectsAndMemory(result);
  parseGlobalRulesFiles(result);
  parseGlobalMcpServers(result);
  parseGlobalAgents(result);
  parseGlobalSkills(result);

  // Project-level signals (scanned for each project cwd)
  for (const cwd of cwds) {
    parseSettings(result, cwd);
    parseProjectClaudeMd(result, cwd);
    parseProjectAgentMemory(result, cwd);
    parseRulesFiles(result, cwd);
    parseMcpServers(result, cwd);
    parseCustomAgents(result, cwd);
    parseCustomSkills(result, cwd);
  }

  return result;
}

/**
 * Build a setup checklist from config signals.
 */
export function buildSetupChecklist(config: ConfigSignals): SetupChecklist {
  return {
    hasClaudeMd: config.hasGlobalClaudeMd || config.projectClaudeMdCount > 0,
    hasHooks: config.hasCustomHooks,
    hasPlugins: config.pluginCount > 0,
    hasMcpServers: config.hasMcpServers,
    hasMemory: config.hasMemoryFiles,
    hasRules: config.hasRulesFiles,
    hasAgents: config.hasCustomAgents,
    hasSkills: config.hasCustomSkills,
  };
}
