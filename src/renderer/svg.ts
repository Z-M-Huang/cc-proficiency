import type { ProficiencyResult, DomainScore, ConfidenceLevel, TokenWindows } from "../types.js";
import { formatTokens } from "../utils/format.js";
import { getLocaleStrings, SUPPORTED_LOCALES } from "../i18n/index.js";
import type { BadgeStrings } from "../i18n/types.js";

export const C = {
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

export const DOMAIN_COLORS: Record<string, string> = {
  "cc-mastery": "#a371f7",   // purple
  "tool-mcp": "#58a6ff",     // blue
  "agentic": "#3fb950",      // green
  "prompt-craft": "#f0883e", // orange
  "context-mgmt": "#d29922", // gold
};

export const SANS = `'Segoe UI', system-ui, -apple-system, sans-serif`;
export const MONO = `ui-monospace, 'SF Mono', SFMono-Regular, monospace`;

export function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function confidenceSymbol(c: ConfidenceLevel): string {
  switch (c) {
    case "low": return "\u25CB";
    case "medium": return "\u25D0";
    case "high": return "\u25CF";
  }
}

export function svgDefs(): string {
  return `<defs>
    <filter id="glow"><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`;
}

export function domainLabel(id: string, t: BadgeStrings): string {
  const label = t.domainLabels[id as keyof typeof t.domainLabels];
  return label ?? id;
}

// ── Multi-locale <switch> support ──

export type LocaleEntry = { lang: string | null; badge: BadgeStrings };

const LANG_MAP: Record<string, string> = { "en": "", "zh-CN": "zh", "es": "es", "fr": "fr", "ja": "ja", "ko": "ko" };

export function buildLocaleEntries(): LocaleEntry[] {
  const entries: LocaleEntry[] = [];
  for (const loc of SUPPORTED_LOCALES) {
    if (loc === "en") continue; // en is fallback (last, no systemLanguage)
    entries.push({ lang: LANG_MAP[loc] ?? loc, badge: getLocaleStrings(loc).badge });
  }
  entries.push({ lang: null, badge: getLocaleStrings("en").badge }); // fallback
  return entries;
}

export function switchedText(
  attrs: string,
  getText: (b: BadgeStrings) => string,
  entries: LocaleEntry[]
): string {
  const lines = ["<switch>"];
  for (const e of entries) {
    const text = escapeXml(getText(e.badge));
    if (e.lang) {
      lines.push(`<text systemLanguage="${e.lang}" ${attrs}>${text}</text>`);
    } else {
      lines.push(`<text ${attrs}>${text}</text>`);
    }
  }
  lines.push("</switch>");
  return lines.join("");
}

function renderDomainRow(d: DomainScore, y: number, entries: LocaleEntry[]): string {
  const color = DOMAIN_COLORS[d.id] ?? C.textDim;
  const barWidth = 220;
  const pct = d.percentage ?? (d.maxPossible > 0 ? Math.round((d.score / d.maxPossible) * 100) : d.score);
  const filledWidth = Math.round((pct / 100) * barWidth);
  const labelAttrs = `x="0" y="14" fill="${C.textDim}" font-size="13" font-family="${SANS}" font-weight="500"`;

  return `<g transform="translate(25, ${y})">
      ${switchedText(labelAttrs, (b) => b.domainLabels[d.id as keyof typeof b.domainLabels] ?? d.id, entries)}
      <g transform="translate(120, 3)"><rect width="${barWidth}" height="12" rx="6" fill="${C.barBg}" opacity="0.5"/><rect width="${filledWidth}" height="12" rx="6" fill="${color}" filter="url(#glow)"/></g>
      <text x="${120 + barWidth + 10}" y="14" fill="${C.text}" font-size="14" font-family="${MONO}" font-weight="700">${pct}%</text>
      <text x="${120 + barWidth + 50}" y="14" fill="${color}" font-size="12" font-family="${MONO}">${confidenceSymbol(d.confidence)}</text>
    </g>`;
}

export function formatHours(h: number): string {
  if (h >= 1000) return (h / 1000).toFixed(1) + "kh";
  return h + "h";
}

// ── 8 Feature Mini-Bars (heatmap row) ──

export const MINI_BAR_KEYS: Array<{ key: string; color: string }> = [
  { key: "hooks", color: "#a371f7" },
  { key: "plugins", color: "#a371f7" },
  { key: "skills", color: "#58a6ff" },
  { key: "mcp", color: "#58a6ff" },
  { key: "agents", color: "#3fb950" },
  { key: "plan", color: "#3fb950" },
  { key: "memory", color: "#d29922" },
  { key: "rules", color: "#d29922" },
];

export function miniBarColor(score: number, baseColor: string): string {
  if (score === 0) return C.barBg;
  return baseColor;
}

export function miniBarOpacity(score: number): string {
  if (score === 0) return "0.3";
  if (score < 30) return "0.4";
  if (score < 70) return "0.7";
  return "1.0";
}

function renderMiniBarGrid(featureScores: Record<string, number> | undefined, y: number, entries: LocaleEntry[]): string {
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
    const x = startX + i * (colWidth + gap);
    const fillColor = miniBarColor(score, feat.color);
    const opacity = miniBarOpacity(score);
    const labelAttrs = `x="${colWidth / 2}" y="${barHeight + 13}" fill="${C.textMuted}" font-size="9" font-family="${SANS}" text-anchor="middle"`;

    lines.push(`<g transform="translate(${x}, ${y})">`);
    lines.push(`  <rect width="${colWidth}" height="${barHeight}" rx="4" fill="${fillColor}" opacity="${opacity}"/>`);
    lines.push(`  <text x="${colWidth / 2}" y="${barHeight / 2 + 1}" fill="${score > 0 ? '#fff' : C.textMuted}" font-size="10" font-family="${MONO}" font-weight="600" text-anchor="middle" dominant-baseline="middle">${score}</text>`);
    lines.push(`  ${switchedText(labelAttrs, (b) => b.featureLabels[feat.key as keyof typeof b.featureLabels], entries)}`);
    lines.push(`</g>`);
  }

  return lines.join("\n");
}

export const MINI_BAR_SECTION_HEIGHT = 42; // single row of mini-bars + labels

function hasTokens(tw?: TokenWindows): boolean {
  return tw != null && (tw.tokens24h > 0 || tw.tokens30d > 0);
}

function tokenLine(tw: TokenWindows, x: number, y: number, entries: LocaleEntry[]): string {
  const nums = `  ${formatTokens(tw.tokens24h)}/24h \u00B7 ${formatTokens(tw.tokens30d)}/30d`;
  const attrs = `x="${x}" y="${y}" fill="${C.textDim}" font-size="10" font-family="${MONO}"`;
  return switchedText(attrs, (b) => b.tokensPrefix + nums, entries);
}

// ── Calibrating Badge ──
export function renderCalibratingBadge(result: ProficiencyResult, tokenWindows?: TokenWindows): string {
  const entries = buildLocaleEntries();
  const enBadge = getLocaleStrings("en").badge;
  const width = 495;
  const showTokens = hasTokens(tokenWindows);
  const height = showTokens ? 266 : 250;
  const cl = result.setupChecklist;
  const needed = Math.max(0, 3 - result.sessionCount);
  const u = escapeXml(result.username);

  // Checklist items: checkmark stays outside switch, label is switched
  const checkItems: Array<{ x: number; y: number; flag: boolean; getLabel: (b: BadgeStrings) => string }> = [
    { x: 25, y: 158, flag: cl.hasClaudeMd, getLabel: (b) => b.claudeMd },
    { x: 145, y: 158, flag: cl.hasHooks, getLabel: (b) => b.featureLabels.hooks },
    { x: 240, y: 158, flag: cl.hasPlugins, getLabel: (b) => b.featureLabels.plugins },
    { x: 25, y: 178, flag: cl.hasMcpServers, getLabel: (b) => b.featureLabels.mcp },
    { x: 145, y: 178, flag: cl.hasMemory, getLabel: (b) => b.featureLabels.memory },
    { x: 240, y: 178, flag: cl.hasRules, getLabel: (b) => b.featureLabels.rules },
    { x: 25, y: 198, flag: cl.hasAgents, getLabel: (b) => b.featureLabels.agents },
    { x: 145, y: 198, flag: cl.hasSkills, getLabel: (b) => b.featureLabels.skills },
  ];

  const checkSvg = checkItems.map((item) => {
    const color = item.flag ? C.green : C.textMuted;
    const mark = item.flag ? "\u2713" : "\u2717";
    const attrs = `x="${item.x}" y="${item.y}" fill="${color}" font-size="12" font-family="${SANS}"`;
    return switchedText(attrs, (b) => `${mark} ${item.getLabel(b)}`, entries);
  }).join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="cc-title cc-desc">
  <title id="cc-title">${escapeXml(enBadge.title)} \u2014 @${u}</title>
  <desc id="cc-desc">${escapeXml(enBadge.calibrating)}: ${result.sessionCount} ${escapeXml(enBadge.sessions)}</desc>
  ${svgDefs()}
  <rect width="${width}" height="${height}" rx="12" fill="${C.bg}"/>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="11.5" fill="${C.card}" stroke="${C.border}"/>
  ${switchedText(`x="25" y="34" fill="${C.text}" font-size="18" font-family="${SANS}" font-weight="600"`, (b) => b.title, entries)}
  <a href="https://github.com/${u}" target="_blank"><text x="${width - 25}" y="34" fill="${C.textDim}" font-size="13" font-family="${MONO}" text-anchor="end">@${u}</text></a>
  <line x1="25" y1="48" x2="${width - 25}" y2="48" stroke="${C.border}"/>
  ${switchedText(`x="25" y="76" fill="#d29922" font-size="14" font-family="${SANS}"`, (b) => `\u23F3 ${b.calibrating}`, entries)}
  ${switchedText(`x="25" y="98" fill="${C.textDim}" font-size="13" font-family="${MONO}"`, (b) => `${result.sessionCount} ${b.sessions} \u00B7 ${b.needMore(needed)}`, entries)}
  <line x1="25" y1="114" x2="${width - 25}" y2="114" stroke="${C.border}"/>
  ${switchedText(`x="25" y="136" fill="${C.textDim}" font-size="12" font-family="${SANS}" font-weight="500"`, (b) => b.setup, entries)}
  ${checkSvg}
  ${showTokens ? tokenLine(tokenWindows!, 25, height - 30, entries) : ""}
  <text x="25" y="${height - 14}" fill="${C.textMuted}" font-size="10" font-family="${MONO}">${result.timestamp.slice(0, 10)}</text>
  <text x="${width - 25}" y="${height - 14}" fill="${C.textMuted}" font-size="9" font-family="${MONO}" text-anchor="end">github.com/Z-M-Huang/cc-proficiency</text>
</svg>`;
}

// ── Full Badge (also used for early) ──
export function renderFullBadge(result: ProficiencyResult, tokenWindows?: TokenWindows): string {
  const entries = buildLocaleEntries();
  const enBadge = getLocaleStrings("en").badge;
  const width = 495;
  const rows = result.domains.length;
  const separatorY = 62 + rows * 28 + 6;
  const miniBarY = separatorY + 14;
  const footerY = miniBarY + MINI_BAR_SECTION_HEIGHT + 6;
  const showTokens = hasTokens(tokenWindows);
  const tokenOffset = showTokens ? 16 : 0;
  const height = footerY + 40 + tokenOffset;
  const u = escapeXml(result.username);

  const domainSvg = result.domains.map((d, i) => renderDomainRow(d, 62 + i * 28, entries)).join("\n");

  const phaseLabel = result.phase === "early" ? switchedText(`x="${width - 25}" y="${footerY + 16}" fill="#d29922" font-size="10" font-family="${MONO}" text-anchor="end"`, (b) => b.earlyResults, entries) : "";

  const footerAttrs = `x="25" y="${footerY + 16}" fill="${C.textMuted}" font-size="11" font-family="${MONO}"`;
  const streakPart = result.streak ? ` \u00B7 \uD83D\uDD25 ${result.streak}d` : "";
  const achievePart = result.achievementCount ? ` \u00B7 \uD83C\uDFC6 ${result.achievementCount}` : "";
  const footerSvg = switchedText(footerAttrs, (b) => `${formatHours(result.features.totalHours)} \u00B7 ${result.sessionCount} ${b.sessions} \u00B7 ${result.projectCount} ${b.projects}${streakPart}${achievePart}`, entries);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="cc-title cc-desc">
  <title id="cc-title">${escapeXml(enBadge.title)} \u2014 @${u}</title>
  <desc id="cc-desc">${result.sessionCount} ${escapeXml(enBadge.sessions)}, ${result.projectCount} ${escapeXml(enBadge.projects)}</desc>
  ${svgDefs()}
  <rect width="${width}" height="${height}" rx="12" fill="${C.bg}"/>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="11.5" fill="${C.card}" stroke="${C.border}"/>
  ${switchedText(`x="25" y="34" fill="${C.text}" font-size="18" font-family="${SANS}" font-weight="600"`, (b) => b.title, entries)}
  <a href="https://github.com/${u}" target="_blank"><text x="${width - 25}" y="34" fill="${C.textDim}" font-size="13" font-family="${MONO}" text-anchor="end">@${u}</text></a>
  <line x1="25" y1="48" x2="${width - 25}" y2="48" stroke="${C.border}"/>

  ${domainSvg}

  <line x1="25" y1="${separatorY}" x2="${width - 25}" y2="${separatorY}" stroke="${C.border}"/>

  ${renderMiniBarGrid(result.features.featureScores, miniBarY, entries)}

  <line x1="25" y1="${footerY}" x2="${width - 25}" y2="${footerY}" stroke="${C.border}"/>
  ${footerSvg}
  ${showTokens ? tokenLine(tokenWindows!, 25, footerY + 30, entries) : ""}
  <text x="25" y="${footerY + 16 + tokenOffset + 16}" fill="${C.textMuted}" font-size="9" font-family="${MONO}">${result.timestamp.slice(0, 10)}</text>
  <text x="${width - 25}" y="${footerY + 16 + tokenOffset + 16}" fill="${C.textMuted}" font-size="9" font-family="${MONO}" text-anchor="end">github.com/Z-M-Huang/cc-proficiency</text>
  ${phaseLabel}
</svg>`;
}

export function renderBadge(result: ProficiencyResult, tokenWindows?: TokenWindows): string {
  if (result.phase === "calibrating") return renderCalibratingBadge(result, tokenWindows);
  return renderFullBadge(result, tokenWindows);
}

export function getInsights(result: ProficiencyResult): { topStrength: string; nextAction: string } {
  const s = getLocaleStrings("en");
  const sorted = [...result.domains].sort((a, b) => b.score - a.score);
  const weakest = [...result.domains].sort((a, b) => a.score - b.score);
  const topId = sorted[0]!.id as keyof typeof s.insights.domainLabels;
  const weakId = weakest[0]!.id as keyof typeof s.insights.domainLabels;
  return {
    topStrength: s.insights.domainLabels[topId] ?? sorted[0]!.label,
    nextAction: s.insights.domainActions[weakId] ?? s.insights.fallbackAction(weakest[0]!.label),
  };
}
