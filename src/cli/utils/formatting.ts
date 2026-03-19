import type { ProficiencyResult, SetupChecklist, TokenWindows } from "../../types.js";
import { formatTokens } from "../../utils/format.js";

export function progressBar(score: number, width: number): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  return "\u2588".repeat(filled) + "\u2591".repeat(empty);
}

export function printResult(result: ProficiencyResult, tokenWindows?: TokenWindows): void {
  console.log(`  Claude Code Proficiency \u2014 @${result.username}`);
  console.log("  " + "\u2500".repeat(40));

  if (result.phase === "calibrating") {
    const needed = Math.max(0, 3 - result.sessionCount);
    console.log(`  \u23F3 Calibrating... (${result.sessionCount} sessions, need ${needed} more)`);
    console.log("");
    printSetupChecklist(result.setupChecklist);
    return;
  }

  for (const d of result.domains) {
    const bar = progressBar(d.score, 20);
    const conf = d.confidence === "high" ? "\u25CF" : d.confidence === "medium" ? "\u25D0" : "\u25CB";
    console.log(`  ${d.label.padEnd(14)} ${bar}  ${String(d.score).padStart(3)}  ${conf}`);
  }

  console.log("  " + "\u2500".repeat(40));

  const f = result.features;
  if (f.hooks.length > 0) {
    const shown = f.hooks.slice(0, 3).map((h) => `${h.name} (${h.count}x)`).join(", ");
    const more = f.hooks.length > 3 ? ` +${f.hooks.length - 3}` : "";
    console.log(`  Hooks   ${shown}${more}`);
  }
  if (f.skills.length > 0) {
    const shown = f.skills.slice(0, 3).map((s) => `${s.name} (${s.count}x)`).join(", ");
    const more = f.skills.length > 3 ? ` +${f.skills.length - 3}` : "";
    console.log(`  Skills  ${shown}${more}`);
  }
  if (f.mcpServers.length > 0) {
    console.log(`  MCP     ${f.mcpServers.join(", ")}`);
  }
  const toolSummary = f.topTools.slice(0, 4).map((t) => `${t.name} ${t.count}`).join(" \u00B7 ");
  console.log(`  Tools   ${toolSummary} (+${f.uniqueToolCount - Math.min(4, f.topTools.length)} more)`);

  console.log("  " + "\u2500".repeat(40));
  const hrs = result.features.totalHours >= 1000 ? (result.features.totalHours / 1000).toFixed(1) + "kh" : result.features.totalHours + "h";
  console.log(`  ${hrs} \u00B7 ${result.sessionCount} sessions \u00B7 ${result.projectCount} projects`);
  if (tokenWindows && (tokenWindows.tokens24h > 0 || tokenWindows.tokens30d > 0)) {
    console.log(`  Tokens: ${formatTokens(tokenWindows.tokens24h)}/24h \u00B7 ${formatTokens(tokenWindows.tokens30d)}/30d`);
  }

  if (result.phase === "early") {
    console.log(`  (early results \u2014 stabilizes at 10 sessions)`);
  }
}

export function printSetupChecklist(cl: SetupChecklist): void {
  const items = [
    ["CLAUDE.md", cl.hasClaudeMd],
    ["Hooks", cl.hasHooks],
    ["Plugins", cl.hasPlugins],
    ["MCP Servers", cl.hasMcpServers],
    ["Memory", cl.hasMemory],
    ["Rules", cl.hasRules],
    ["Agents", cl.hasAgents],
    ["Skills", cl.hasSkills],
  ] as const;

  console.log("  Setup:");
  for (const [label, ok] of items) {
    console.log(`    ${ok ? "\u2713" : "\u2717"} ${label}`);
  }
}
