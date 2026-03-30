import type { AIGradingResult, AIGradedDomain, AIPhase, AIDomainId, ProficiencyResult, TokenWindows } from "../types.js";
import { getLocaleStrings, SUPPORTED_LOCALES } from "../i18n/index.js";
import type { AIBadgeStrings, BadgeStrings } from "../i18n/types.js";
import {
  C, SANS, MONO,
  escapeXml, svgDefs, formatHours,
} from "./svg.js";
import { formatTokens } from "../utils/format.js";

// ── AI domain color palette (distinct from rule-based DOMAIN_COLORS) ──

const AI_DOMAIN_COLORS: Record<AIDomainId, string> = {
  "goal-achievement": "#f78166",     // coral
  "collaboration-quality": "#79c0ff", // sky blue
  "workflow-mastery": "#7ee787",     // mint
  "growth-learning": "#d2a8ff",      // lavender
  "verification-quality": "#ffd33d", // amber
};

// ── Animation timing (matching animated-svg.ts patterns) ──

const BAR_DUR = "1s";
const BAR_EASING = `calcMode="spline" keySplines="0.25 0.1 0.25 1"`;
const FADE_DUR = "0.25s";

function barDelay(i: number): string {
  return (0.3 + i * 0.2).toFixed(1);
}

function numberDelay(i: number): string {
  return (0.3 + i * 0.2 + 0.8).toFixed(1);
}

// ── Locale helper for AI badge strings ──

interface AILocaleEntry { lang: string | null; aiBadge: AIBadgeStrings; badge: BadgeStrings }
const LANG_MAP: Record<string, string> = { "en": "", "zh-CN": "zh", "es": "es", "fr": "fr", "ja": "ja", "ko": "ko" };

function buildAILocaleEntries(): AILocaleEntry[] {
  const entries: AILocaleEntry[] = [];
  for (const loc of SUPPORTED_LOCALES) {
    if (loc === "en") continue;
    const strings = getLocaleStrings(loc);
    entries.push({ lang: LANG_MAP[loc] ?? loc, aiBadge: strings.aiBadge, badge: strings.badge });
  }
  const en = getLocaleStrings("en");
  entries.push({ lang: null, aiBadge: en.aiBadge, badge: en.badge });
  return entries;
}

function switchedAIText(
  attrs: string,
  getText: (b: AIBadgeStrings) => string,
  entries: AILocaleEntry[],
  animate?: string
): string {
  const lines = ["<switch>"];
  for (const e of entries) {
    const text = escapeXml(getText(e.aiBadge));
    const anim = animate ?? "";
    if (e.lang) {
      lines.push(`<text systemLanguage="${e.lang}" ${attrs}>${text}${anim}</text>`);
    } else {
      lines.push(`<text ${attrs}>${text}${anim}</text>`);
    }
  }
  lines.push("</switch>");
  return lines.join("");
}

// ── Level badge ──

function levelLetter(level: "novice" | "proficient" | "expert"): string {
  switch (level) { case "novice": return "N"; case "proficient": return "P"; case "expert": return "E"; }
}

function levelColor(level: "novice" | "proficient" | "expert"): string {
  switch (level) { case "novice": return C.textDim; case "proficient": return C.blue; case "expert": return C.green; }
}

// ── Animated domain row ──

function renderAIDomainRow(d: AIGradedDomain, y: number, i: number, aiEntries: AILocaleEntry[]): string {
  const color = AI_DOMAIN_COLORS[d.id] ?? C.textDim;
  const barWidth = 220;
  const pct = d.total;
  const filledWidth = Math.round((pct / 100) * barWidth);
  const bDelay = barDelay(i);
  const nDelay = numberDelay(i);
  const labelAttrs = `x="0" y="14" fill="${C.textDim}" font-size="13" font-family="${SANS}" font-weight="500"`;
  const lv = levelLetter(d.level);
  const lc = levelColor(d.level);

  return `<g transform="translate(25, ${y})">
      ${switchedAIText(labelAttrs, (b) => b.aiDomainLabels[d.id] ?? d.id, aiEntries)}
      <g transform="translate(120, 3)">
        <rect width="${barWidth}" height="12" rx="6" fill="${C.barBg}" opacity="0.5"/>
        <rect width="0" height="12" rx="6" fill="${color}" filter="url(#glow)">
          <animate attributeName="width" from="0" to="${filledWidth}" dur="${BAR_DUR}" begin="${bDelay}s" fill="freeze" ${BAR_EASING}/>
        </rect>
      </g>
      <text x="${120 + barWidth + 10}" y="14" fill="${C.text}" font-size="14" font-family="${MONO}" font-weight="700" opacity="0">${pct}%<animate attributeName="opacity" from="0" to="1" dur="${FADE_DUR}" begin="${nDelay}s" fill="freeze"/></text>
      <text x="${120 + barWidth + 50}" y="14" fill="${lc}" font-size="12" font-family="${MONO}" font-weight="600" opacity="0">${lv}<animate attributeName="opacity" from="0" to="1" dur="${FADE_DUR}" begin="${nDelay}s" fill="freeze"/></text>
    </g>`;
}

// ── AI Graded pill ──

function aiGradedPill(x: number, y: number, aiEntries: AILocaleEntry[]): string {
  const pillAttrs = `x="${x + 20}" y="${y}" fill="#a371f7" font-size="10" font-family="${SANS}" font-weight="600"`;
  return `<g>
    <rect x="${x}" y="${y - 11}" width="80" height="16" rx="8" fill="#a371f7" opacity="0.15"/>
    <text x="${x + 7}" y="${y}" fill="#a371f7" font-size="10" font-family="${SANS}">\u26A1</text>
    ${switchedAIText(pillAttrs, (b) => b.aiGradedIndicator, aiEntries)}
  </g>`;
}

// ── Shared footer helper (uses badge strings from AILocaleEntry) ──

function switchedBadgeText(
  attrs: string,
  getText: (b: BadgeStrings) => string,
  entries: AILocaleEntry[],
  animate?: string
): string {
  const lines = ["<switch>"];
  for (const e of entries) {
    const text = escapeXml(getText(e.badge));
    const anim = animate ?? "";
    if (e.lang) {
      lines.push(`<text systemLanguage="${e.lang}" ${attrs}>${text}${anim}</text>`);
    } else {
      lines.push(`<text ${attrs}>${text}${anim}</text>`);
    }
  }
  lines.push("</switch>");
  return lines.join("");
}

function hasTokens(tw?: TokenWindows): boolean {
  return tw != null && (tw.tokens24h > 0 || tw.tokens30d > 0);
}

// ── Insufficient data badge ──

export function renderAIInsufficientBadge(entries: AILocaleEntry[], username: string): string {
  const enBadge = getLocaleStrings("en").badge;
  const width = 495;
  const height = 140;
  const u = escapeXml(username);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="cc-title cc-desc">
  <title id="cc-title">${escapeXml(enBadge.title)} \u2014 @${u}</title>
  <desc id="cc-desc">AI Graded \u2014 Insufficient Data</desc>
  ${svgDefs()}
  <rect width="${width}" height="${height}" rx="12" fill="${C.bg}"/>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="11.5" fill="${C.card}" stroke="${C.border}"/>
  ${switchedBadgeText(`x="25" y="34" fill="${C.text}" font-size="18" font-family="${SANS}" font-weight="600"`, (b) => b.title, entries)}
  <a href="https://github.com/${u}" target="_blank"><text x="${width - 25}" y="34" fill="${C.textDim}" font-size="13" font-family="${MONO}" text-anchor="end">@${u}</text></a>
  ${aiGradedPill(25, 54, entries)}
  <line x1="25" y1="68" x2="${width - 25}" y2="68" stroke="${C.border}"/>
  ${switchedAIText(`x="25" y="96" fill="#d29922" font-size="14" font-family="${SANS}"`, (b) => `\u23F3 ${b.insufficientData}`, entries)}
  ${switchedAIText(`x="25" y="118" fill="${C.textDim}" font-size="12" font-family="${SANS}"`, (b) => b.earlyAssessment, entries)}
</svg>`;
}

// ── Full animated AI badge (shared header/footer with animated-svg.ts) ──

function renderAIFullBadge(
  result: AIGradingResult,
  phase: AIPhase,
  proficiency: ProficiencyResult,
  tokenWindows: TokenWindows | undefined,
  entries: AILocaleEntry[]
): string {
  const enBadge = getLocaleStrings("en").badge;
  const width = 495;
  const u = escapeXml(proficiency.username);
  const rows = result.domains.length;

  // Layout: header (48) → AI pill row (20) → separator → early note? → domain rows → footer
  const pillY = 54;
  const separatorY = 68;
  const earlyOffset = phase === "early" ? 20 : 0;
  const domainStartY = separatorY + 14 + earlyOffset;
  const footerSepY = domainStartY + rows * 28 + 10;

  const showTokens = hasTokens(tokenWindows);
  const tokenOffset = showTokens ? 16 : 0;
  const height = footerSepY + 40 + tokenOffset;

  // Timing
  const lastBarEnd = parseFloat(numberDelay(rows - 1));
  const footerDelay = (lastBarEnd + 0.3).toFixed(1);
  const footerDelay2 = (lastBarEnd + 0.5).toFixed(1);

  // Domain rows
  const domainSvg = result.domains
    .map((d, i) => renderAIDomainRow(d, domainStartY + i * 28, i, entries))
    .join("\n");

  // Early assessment note
  const earlyNote = phase === "early"
    ? switchedAIText(`x="25" y="${separatorY + 24}" fill="#d29922" font-size="11" font-family="${SANS}" opacity="0"`, (b) => `\u26A0 ${b.earlyAssessment}`, entries, `<animate attributeName="opacity" from="0" to="1" dur="${FADE_DUR}" begin="0.2s" fill="freeze"/>`)
    : "";

  // Shared footer — same pattern as animated-svg.ts
  const footerAnimate = `<animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${footerDelay}s" fill="freeze"/>`;
  const streakPart = proficiency.streak ? ` \u00B7 \uD83D\uDD25 ${proficiency.streak}d` : "";
  const achievePart = proficiency.achievementCount ? ` \u00B7 \uD83C\uDFC6 ${proficiency.achievementCount}` : "";
  const footerAttrs = `x="25" y="${footerSepY + 16}" fill="${C.textMuted}" font-size="11" font-family="${MONO}" opacity="0"`;
  const footerSvg = switchedBadgeText(footerAttrs, (b) => `${formatHours(proficiency.features.totalHours)} \u00B7 ${proficiency.sessionCount} ${b.sessions} \u00B7 ${proficiency.projectCount} ${b.projects}${streakPart}${achievePart}`, entries, footerAnimate);

  const tokenNums = showTokens ? `  ${formatTokens(tokenWindows!.tokens24h)}/24h \u00B7 ${formatTokens(tokenWindows!.tokens30d)}/30d` : "";
  const tokenSvg = showTokens
    ? switchedBadgeText(`x="25" y="${footerSepY + 30}" fill="${C.textDim}" font-size="10" font-family="${MONO}" opacity="0"`, (b) => b.tokensPrefix + tokenNums, entries, footerAnimate)
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="cc-title cc-desc">
  <title id="cc-title">${escapeXml(enBadge.title)} \u2014 @${u}</title>
  <desc id="cc-desc">${proficiency.sessionCount} ${escapeXml(enBadge.sessions)}, ${proficiency.projectCount} ${escapeXml(enBadge.projects)}</desc>
  ${svgDefs()}
  <rect width="${width}" height="${height}" rx="12" fill="${C.bg}"/>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="11.5" fill="${C.card}" stroke="${C.border}"/>
  ${switchedBadgeText(`x="25" y="34" fill="${C.text}" font-size="18" font-family="${SANS}" font-weight="600"`, (b) => b.title, entries)}
  <a href="https://github.com/${u}" target="_blank"><text x="${width - 25}" y="34" fill="${C.textDim}" font-size="13" font-family="${MONO}" text-anchor="end">@${u}</text></a>
  ${aiGradedPill(25, pillY, entries)}
  <line x1="25" y1="${separatorY}" x2="${width - 25}" y2="${separatorY}" stroke="${C.border}"/>
  ${earlyNote}

  ${domainSvg}

  <line x1="25" y1="${footerSepY}" x2="${width - 25}" y2="${footerSepY}" stroke="${C.border}"/>
  ${footerSvg}
  ${tokenSvg}
  <text x="25" y="${footerSepY + 16 + tokenOffset + 16}" fill="${C.textMuted}" font-size="9" font-family="${MONO}" opacity="0">${result.gradedAt.slice(0, 10)} \u00B7 ${escapeXml(result.model)}<animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${footerDelay2}s" fill="freeze"/></text>
  <text x="${width - 25}" y="${footerSepY + 16 + tokenOffset + 16}" fill="${C.textMuted}" font-size="9" font-family="${MONO}" text-anchor="end" opacity="0">github.com/Z-M-Huang/cc-proficiency<animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${footerDelay2}s" fill="freeze"/></text>
</svg>`;
}

// ── Public API ──

export function renderAIAnimatedBadge(
  result: AIGradingResult,
  phase: AIPhase,
  proficiency: ProficiencyResult,
  tokenWindows?: TokenWindows,
): string {
  const entries = buildAILocaleEntries();
  if (phase === "insufficient") {
    return renderAIInsufficientBadge(entries, proficiency.username);
  }
  return renderAIFullBadge(result, phase, proficiency, tokenWindows, entries);
}
