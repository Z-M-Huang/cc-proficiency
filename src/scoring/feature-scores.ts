import { logCurve, cappedRatio, binary } from "./curves.js";
import type { ConfigSignals } from "../parsers/config-parser.js";

export interface FeatureDepthInput {
  hooks: Array<{ name: string; count: number }>;
  skills: Array<{ name: string; count: number }>;
  mcpServers: string[];
  mcpCalls: number;
  agentCalls: number;
  agentTypes: number;
  pluginCount: number;
  pluginsUsed: number;
  planModePrompts: number;
  config: ConfigSignals;
}

/**
 * Compute feature depth scores using inventory data + config.
 * Most features: config alone maxes ~30, behavioral depth drives ~70.
 * Exceptions: plugins (install count IS depth), plan/rules (graduated config).
 * Returns Record<string, number> with all 8 feature tags, 0-100 integers.
 */
export function computeFeatureDepthScores(input: FeatureDepthInput): Record<string, number> {
  return {
    hooks: computeHooksDepth(input),
    plugins: computePluginsDepth(input),
    skills: computeSkillsDepth(input),
    mcp: computeMcpDepth(input),
    agents: computeAgentsDepth(input),
    plan: Math.round(logCurve(input.planModePrompts, 2, 40)),
    memory: computeMemoryDepth(input),
    rules: Math.round(cappedRatio(input.config.rulesFileCount, 6)),
  };
}

function computeHooksDepth(input: FeatureDepthInput): number {
  const unique = input.hooks.length;
  const totalFires = input.hooks.reduce((sum, h) => sum + h.count, 0);
  const configScore = binary(input.config.hasCustomHooks, 15)
    + binary(input.config.hookWithMatcherCount >= 2, 15);
  const depthScore = logCurve(totalFires, 20, 25) + cappedRatio(unique, 8) * 0.3;
  return Math.round(Math.min(100, configScore + depthScore));
}

function computePluginsDepth(input: FeatureDepthInput): number {
  // Plugin usage flows through skills/hooks/MCP/agents bars.
  // Plugin score reflects ecosystem investment (install count + actual use).
  const configScore = cappedRatio(input.pluginCount, 12);
  const usageBonus = cappedRatio(input.pluginsUsed, 5) * 0.3;
  return Math.round(Math.min(100, configScore + usageBonus));
}

function computeSkillsDepth(input: FeatureDepthInput): number {
  const unique = input.skills.length;
  const totalCalls = input.skills.reduce((sum, s) => sum + s.count, 0);
  const configScore = binary(input.config.hasCustomSkills, 15);
  const depthScore = logCurve(totalCalls, 15, 25) + cappedRatio(unique, 8) * 0.35;
  return Math.round(Math.min(100, configScore + depthScore));
}

function computeMcpDepth(input: FeatureDepthInput): number {
  const configScore = binary(input.config.hasMcpServers, 15);
  const depthScore = logCurve(input.mcpCalls, 20, 25)
    + cappedRatio(input.mcpServers.length, 4) * 0.35;
  return Math.round(Math.min(100, configScore + depthScore));
}

function computeAgentsDepth(input: FeatureDepthInput): number {
  const configScore = binary(input.config.hasCustomAgents, 15);
  const depthScore = logCurve(input.agentCalls, 10, 25)
    + cappedRatio(input.agentTypes, 5) * 0.35;
  return Math.round(Math.min(100, configScore + depthScore));
}

function computeMemoryDepth(input: FeatureDepthInput): number {
  const configScore = binary(input.config.hasMemoryFiles, 20);
  const depthScore = cappedRatio(input.config.memoryFileCount, 5) * 0.5
    + binary(input.config.activeMemoryFileCount >= 2, 30);
  return Math.round(Math.min(100, configScore + depthScore));
}
