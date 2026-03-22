import { loadStore } from "../../store/local-store.js";
import { t } from "../../i18n/index.js";
import type { DomainId } from "../../i18n/types.js";

export function cmdExplain(): void {
  const store = loadStore();
  if (!store.lastResult) {
    console.log(t().common.noAnalysisData);
    return;
  }

  const result = store.lastResult;
  const pctOf = (d: { score: number; maxPossible?: number; percentage?: number }): number =>
    d.percentage ?? (d.maxPossible && d.maxPossible > 0 ? Math.round((d.score / d.maxPossible) * 100) : d.score);
  const sorted = [...result.domains].sort((a, b) => pctOf(b) - pctOf(a));
  const weakest = [...result.domains].sort((a, b) => pctOf(a) - pctOf(b));
  const s = t().cli.explain;
  const domainLabels = t().badge.domainLabels;
  const tips = s.domainTips;

  console.log(`\n${s.titleLine(result.username)}\n`);

  console.log(s.strengths);
  for (const d of sorted) {
    const label = domainLabels[d.id as DomainId] ?? d.label;
    const pct = pctOf(d);
    const maxInfo = d.maxPossible ? ` (${d.score}/${d.maxPossible} max)` : "";
    console.log(`    ${label.padEnd(14)} ${pct}%${maxInfo}`);
  }

  console.log(`\n${s.areasToImprove}`);
  for (let i = 0; i < Math.min(2, weakest.length); i++) {
    const d = weakest[i]!;
    const label = domainLabels[d.id as DomainId] ?? d.label;
    const pct = pctOf(d);
    console.log(`    ${label} (${pct}%)`);
    console.log(`       \u2192 ${tips[d.id as DomainId] ?? t().insights.fallbackAction(domainLabels[d.id as DomainId] ?? d.label)}`);
  }

  const f = result.features;
  const fl = t().badge.featureLabels;
  console.log(`\n${s.featureUsage}`);
  if (f.hooks.length > 0)
    console.log(`    ${s.hooksLabel}  ${f.hooks.map((h) => `${h.name} (${h.count}x)`).join(", ")}`);
  if (f.skills.length > 0)
    console.log(`    ${s.skillsLabel} ${f.skills.map((sk) => `${sk.name} (${sk.count}x)`).join(", ")}`);
  if (f.mcpServers.length > 0)
    console.log(`    ${s.mcpLabel}    ${f.mcpServers.join(", ")}`);
  console.log(`    ${s.toolsLabel}  ${f.topTools.map((tl) => `${tl.name} (${tl.count})`).join(", ")} +${f.uniqueToolCount - f.topTools.length} ${s.more}`);
  console.log(`    ${s.flagsLabel}  ${f.usedPlanMode ? `\u2713 ${fl.plan}` : `\u2717 ${fl.plan}`}  ${f.hasMemory ? `\u2713 ${fl.memory}` : `\u2717 ${fl.memory}`}  ${f.hasRules ? `\u2713 ${fl.rules}` : `\u2717 ${fl.rules}`}  ${f.hasAgents ? `\u2713 ${fl.agents}` : `\u2717 ${fl.agents}`}  ${f.hasSkills ? `\u2713 ${fl.skills}` : `\u2717 ${fl.skills}`}`);

  console.log(`\n${s.sessionsSummary(result.sessionCount, result.projectCount)}\n`);
}
