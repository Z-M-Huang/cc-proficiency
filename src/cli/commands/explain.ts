import { loadStore } from "../../store/local-store.js";

export function cmdExplain(): void {
  const store = loadStore();
  if (!store.lastResult) {
    console.log("No analysis data. Run 'cc-proficiency analyze' first.");
    return;
  }

  const result = store.lastResult;
  const sorted = [...result.domains].sort((a, b) => b.score - a.score);
  const weakest = [...result.domains].sort((a, b) => a.score - b.score);

  console.log(`\n  Claude Code Proficiency \u2014 @${result.username}\n`);

  console.log("  Strengths:");
  for (const d of sorted) {
    console.log(`    ${d.label.padEnd(14)} ${d.score}/100`);
  }

  const tips: Record<string, string> = {
    "cc-mastery": "Enhance CLAUDE.md with imports, add hooks with matchers, create rules files, use plan mode",
    "tool-mcp": "Chain tools deliberately (Grep\u2192Read\u2192Edit), set up MCP servers, use LSP integration",
    "agentic": "Use subagents with different types (Explore, Plan), try parallel agents and worktrees",
    "prompt-craft": "Structure prompts with markdown lists, provide code blocks and file references",
    "context-mgmt": "Use cross-session memory files, work across multiple projects, update CLAUDE.md",
  };

  console.log("\n  Areas to Improve:");
  for (let i = 0; i < Math.min(2, weakest.length); i++) {
    const d = weakest[i]!;
    console.log(`    ${d.label} (${d.score}/100)`);
    console.log(`       \u2192 ${tips[d.id] ?? "Practice using this feature area"}`);
  }

  const f = result.features;
  console.log("\n  Feature Usage:");
  if (f.hooks.length > 0)
    console.log(`    Hooks:  ${f.hooks.map((h) => `${h.name} (${h.count}x)`).join(", ")}`);
  if (f.skills.length > 0)
    console.log(`    Skills: ${f.skills.map((s) => `${s.name} (${s.count}x)`).join(", ")}`);
  if (f.mcpServers.length > 0)
    console.log(`    MCP:    ${f.mcpServers.join(", ")}`);
  console.log(`    Tools:  ${f.topTools.map((t) => `${t.name} (${t.count})`).join(", ")} +${f.uniqueToolCount - f.topTools.length} more`);
  console.log(`    Flags:  ${f.usedPlanMode ? "\u2713 Plan" : "\u2717 Plan"}  ${f.hasMemory ? "\u2713 Memory" : "\u2717 Memory"}  ${f.hasRules ? "\u2713 Rules" : "\u2717 Rules"}  ${f.hasAgents ? "\u2713 Agents" : "\u2717 Agents"}  ${f.hasSkills ? "\u2713 Skills" : "\u2717 Skills"}`);

  console.log(`\n  ${result.sessionCount} sessions \u00B7 ${result.projectCount} projects\n`);
}
