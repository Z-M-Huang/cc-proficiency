import type { ProficiencyResult, DomainScore, ConfidenceLevel } from "../types.js";
import { getLocale, type Locale, type LocaleStrings } from "../i18n/locales.js";

const C = {
  bg: "#0d1117",
  card: "#161b22",
  border: "#30363d",
  text: "#e6edf3",
  textDim: "#8b949e",
  textMuted: "#484f58",
  barBg: "#21262d",
  red: "#f85149",
  green: "#3fb950",
  blue: "#58a6ff",
};

const DOMAIN_COLORS: Record<string, string> = {
  "cc-mastery": "#a371f7",   // purple
  "tool-mcp": "#58a6ff",     // blue
  "agentic": "#3fb950",      // green
  "prompt-craft": "#f0883e", // orange
  "context-mgmt": "#d29922", // gold
};

const SANS = `'Segoe UI', system-ui, -apple-system, sans-serif`;
const MONO = `ui-monospace, 'SF Mono', SFMono-Regular, monospace`;

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function confidenceSymbol(c: ConfidenceLevel): string {
  switch (c) {
    case "low": return "\u25CB";
    case "medium": return "\u25D0";
    case "high": return "\u25CF";
  }
}

function defs(): string {
  return `<defs>
    <filter id="glow"><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`;
}

function domainLabel(id: string, t: LocaleStrings): string {
  const map: Record<string, keyof LocaleStrings> = {
    "cc-mastery": "ccMastery", "tool-mcp": "toolMcp", "agentic": "agentic",
    "prompt-craft": "promptCraft", "context-mgmt": "contextMgmt",
  };
  const key = map[id];
  return key ? String(t[key]) : id;
}

function renderDomainRow(d: DomainScore, y: number, t: LocaleStrings): string {
  const label = escapeXml(domainLabel(d.id, t));
  const color = DOMAIN_COLORS[d.id] ?? C.textDim;
  const barWidth = 220;
  const filledWidth = Math.round((d.score / 100) * barWidth);

  return `<g transform="translate(25, ${y})">
      <text x="0" y="14" fill="${C.textDim}" font-size="13" font-family="${SANS}" font-weight="500">${label}</text>
      <g transform="translate(120, 3)"><rect width="${barWidth}" height="12" rx="6" fill="${C.barBg}" opacity="0.5"/><rect width="${filledWidth}" height="12" rx="6" fill="${color}" filter="url(#glow)"/></g>
      <text x="${120 + barWidth + 10}" y="14" fill="${C.text}" font-size="14" font-family="${MONO}" font-weight="700">${d.score}</text>
      <text x="${120 + barWidth + 42}" y="14" fill="${color}" font-size="12" font-family="${MONO}">${confidenceSymbol(d.confidence)}</text>
    </g>`;
}

function formatHours(h: number): string {
  if (h >= 1000) return (h / 1000).toFixed(1) + "kh";
  return h + "h";
}

// ── 8 Feature Mini-Bars (heatmap row) ──

const MINI_BAR_KEYS: Array<{ key: string; localeKey: keyof LocaleStrings; color: string }> = [
  { key: "hooks", localeKey: "hooks", color: "#a371f7" },
  { key: "plugins", localeKey: "plugins", color: "#a371f7" },
  { key: "skills", localeKey: "skills", color: "#58a6ff" },
  { key: "mcp", localeKey: "mcp", color: "#58a6ff" },
  { key: "agents", localeKey: "agents", color: "#3fb950" },
  { key: "plan", localeKey: "plan", color: "#3fb950" },
  { key: "memory", localeKey: "memory", color: "#d29922" },
  { key: "rules", localeKey: "rules", color: "#d29922" },
];

function miniBarColor(score: number, baseColor: string): string {
  if (score === 0) return C.barBg;
  return baseColor;
}

function miniBarOpacity(score: number): string {
  if (score === 0) return "0.3";
  if (score < 30) return "0.4";
  if (score < 70) return "0.7";
  return "1.0";
}

function renderMiniBarGrid(featureScores: Record<string, number> | undefined, y: number, t: LocaleStrings): string {
  const scores = featureScores ?? {};
  const totalFeatures = MINI_BAR_KEYS.length;
  const gap = 4;
  const startX = 25;
  const availableWidth = 445;
  const colWidth = Math.floor((availableWidth - gap * (totalFeatures - 1)) / totalFeatures);
  const barHeight = 24;
  const lines: string[] = [];

  for (let i = 0; i < totalFeatures; i++) {
    const feat = MINI_BAR_KEYS[i]!;
    const score = scores[feat.key] ?? 0;
    const label = escapeXml(String(t[feat.localeKey]));
    const x = startX + i * (colWidth + gap);
    const fillColor = miniBarColor(score, feat.color);
    const opacity = miniBarOpacity(score);

    lines.push(`<g transform="translate(${x}, ${y})">`);
    lines.push(`  <rect width="${colWidth}" height="${barHeight}" rx="4" fill="${fillColor}" opacity="${opacity}"/>`);
    lines.push(`  <text x="${colWidth / 2}" y="${barHeight / 2 + 1}" fill="${score > 0 ? '#fff' : C.textMuted}" font-size="10" font-family="${MONO}" font-weight="600" text-anchor="middle" dominant-baseline="middle">${score}</text>`);
    lines.push(`  <text x="${colWidth / 2}" y="${barHeight + 13}" fill="${C.textMuted}" font-size="9" font-family="${SANS}" text-anchor="middle">${label}</text>`);
    lines.push(`</g>`);
  }

  return lines.join("\n");
}

const MINI_BAR_SECTION_HEIGHT = 42; // single row of mini-bars + labels

// ── Calibrating Badge ──
export function renderCalibratingBadge(result: ProficiencyResult, locale: Locale = "en"): string {
  const t = getLocale(locale);
  const width = 495;
  const height = 230;
  const cl = result.setupChecklist;
  const needed = Math.max(0, 3 - result.sessionCount);
  const u = escapeXml(result.username);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="cc-title cc-desc">
  <title id="cc-title">${escapeXml(t.title)} \u2014 @${u}</title>
  <desc id="cc-desc">${escapeXml(t.calibrating)}: ${result.sessionCount} ${escapeXml(t.sessions)}</desc>
  ${defs()}
  <rect width="${width}" height="${height}" rx="12" fill="${C.bg}"/>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="11.5" fill="${C.card}" stroke="${C.border}"/>
  <text x="25" y="34" fill="${C.text}" font-size="18" font-family="${SANS}" font-weight="600">${escapeXml(t.title)}</text>
  <a href="https://github.com/${u}" target="_blank"><text x="${width - 25}" y="34" fill="${C.textDim}" font-size="13" font-family="${MONO}" text-anchor="end">@${u}</text></a>
  <line x1="25" y1="48" x2="${width - 25}" y2="48" stroke="${C.border}"/>
  <text x="25" y="76" fill="#d29922" font-size="14" font-family="${SANS}">\u23F3 ${escapeXml(t.calibrating)}</text>
  <text x="25" y="98" fill="${C.textDim}" font-size="13" font-family="${MONO}">${result.sessionCount} ${escapeXml(t.sessions)} \u00B7 ${escapeXml(t.needMore(needed))}</text>
  <line x1="25" y1="114" x2="${width - 25}" y2="114" stroke="${C.border}"/>
  <text x="25" y="136" fill="${C.textDim}" font-size="12" font-family="${SANS}" font-weight="500">${escapeXml(t.setup)}</text>
  <text x="25" y="158" fill="${cl.hasClaudeMd ? C.green : C.textMuted}" font-size="12" font-family="${SANS}">${cl.hasClaudeMd ? "\u2713" : "\u2717"} ${escapeXml(t.claudeMd)}</text>
  <text x="145" y="158" fill="${cl.hasHooks ? C.green : C.textMuted}" font-size="12" font-family="${SANS}">${cl.hasHooks ? "\u2713" : "\u2717"} ${escapeXml(t.hooks)}</text>
  <text x="240" y="158" fill="${cl.hasPlugins ? C.green : C.textMuted}" font-size="12" font-family="${SANS}">${cl.hasPlugins ? "\u2713" : "\u2717"} ${escapeXml(t.plugins)}</text>
  <text x="25" y="178" fill="${cl.hasMcpServers ? C.green : C.textMuted}" font-size="12" font-family="${SANS}">${cl.hasMcpServers ? "\u2713" : "\u2717"} ${escapeXml(t.mcp)}</text>
  <text x="145" y="178" fill="${cl.hasMemory ? C.green : C.textMuted}" font-size="12" font-family="${SANS}">${cl.hasMemory ? "\u2713" : "\u2717"} ${escapeXml(t.memory)}</text>
  <text x="240" y="178" fill="${cl.hasRules ? C.green : C.textMuted}" font-size="12" font-family="${SANS}">${cl.hasRules ? "\u2713" : "\u2717"} ${escapeXml(t.rules)}</text>
  <text x="25" y="${height - 14}" fill="${C.textMuted}" font-size="10" font-family="${MONO}">${result.timestamp.slice(0, 10)}</text>
  <a href="https://github.com/Z-M-Huang/cc-proficiency" target="_blank"><text x="${width - 25}" y="${height - 14}" fill="${C.textDim}" font-size="10" font-family="${MONO}" text-anchor="end">cc-proficiency</text></a>
</svg>`;
}

// ── Full Badge (also used for early) ──
export function renderFullBadge(result: ProficiencyResult, locale: Locale = "en"): string {
  const t = getLocale(locale);
  const width = 495;
  const rows = result.domains.length;
  const separatorY = 62 + rows * 28 + 6;
  const miniBarY = separatorY + 14;
  const footerY = miniBarY + MINI_BAR_SECTION_HEIGHT + 6;
  const height = footerY + 26;
  const u = escapeXml(result.username);

  const domainSvg = result.domains.map((d, i) => renderDomainRow(d, 62 + i * 28, t)).join("\n");

  const phaseLabel = result.phase === "early" ? `<text x="${width - 25}" y="${footerY + 16}" fill="#d29922" font-size="10" font-family="${MONO}" text-anchor="end">${escapeXml(t.earlyResults)}</text>` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="cc-title cc-desc">
  <title id="cc-title">${escapeXml(t.title)} \u2014 @${u}</title>
  <desc id="cc-desc">${result.sessionCount} ${escapeXml(t.sessions)}, ${result.projectCount} ${escapeXml(t.projects)}</desc>
  ${defs()}
  <rect width="${width}" height="${height}" rx="12" fill="${C.bg}"/>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="11.5" fill="${C.card}" stroke="${C.border}"/>
  <text x="25" y="34" fill="${C.text}" font-size="18" font-family="${SANS}" font-weight="600">${escapeXml(t.title)}</text>
  <a href="https://github.com/${u}" target="_blank"><text x="${width - 25}" y="34" fill="${C.textDim}" font-size="13" font-family="${MONO}" text-anchor="end">@${u}</text></a>
  <line x1="25" y1="48" x2="${width - 25}" y2="48" stroke="${C.border}"/>

  ${domainSvg}

  <line x1="25" y1="${separatorY}" x2="${width - 25}" y2="${separatorY}" stroke="${C.border}"/>

  ${renderMiniBarGrid(result.features.featureScores, miniBarY, t)}

  <line x1="25" y1="${footerY}" x2="${width - 25}" y2="${footerY}" stroke="${C.border}"/>
  <text x="25" y="${footerY + 16}" fill="${C.textMuted}" font-size="11" font-family="${MONO}">${formatHours(result.features.totalHours)} \u00B7 ${result.sessionCount} ${escapeXml(t.sessions)} \u00B7 ${result.projectCount} ${escapeXml(t.projects)}${result.streak ? ` \u00B7 \uD83D\uDD25 ${result.streak}d` : ""}${result.achievementCount ? ` \u00B7 \uD83C\uDFC6 ${result.achievementCount}` : ""} \u00B7 ${result.timestamp.slice(0, 10)}</text>
  <a href="https://github.com/Z-M-Huang/cc-proficiency" target="_blank"><text x="${width - 25}" y="${footerY + 16}" fill="${C.textDim}" font-size="10" font-family="${MONO}" text-anchor="end">cc-proficiency</text></a>
  ${phaseLabel}
</svg>`;
}

export function renderBadge(result: ProficiencyResult, locale: Locale = "en"): string {
  if (result.phase === "calibrating") return renderCalibratingBadge(result, locale);
  return renderFullBadge(result, locale);
}

export function getInsights(result: ProficiencyResult): { topStrength: string; nextAction: string } {
  const sorted = [...result.domains].sort((a, b) => b.score - a.score);
  const weakest = [...result.domains].sort((a, b) => a.score - b.score);
  const labels: Record<string, string> = {
    "cc-mastery": "CC configuration mastery",
    "tool-mcp": "tool & MCP integration",
    "agentic": "agentic workflows",
    "prompt-craft": "prompt engineering",
    "context-mgmt": "context management",
  };
  const actions: Record<string, string> = {
    "cc-mastery": "enhance CLAUDE.md, add hooks with matchers",
    "tool-mcp": "chain tools deliberately (Grep\u2192Read\u2192Edit)",
    "agentic": "use subagents with different types",
    "prompt-craft": "structure prompts with markdown and code blocks",
    "context-mgmt": "use cross-session memory files",
  };
  return {
    topStrength: labels[sorted[0]!.id] ?? sorted[0]!.label,
    nextAction: actions[weakest[0]!.id] ?? `improve ${weakest[0]!.label}`,
  };
}
