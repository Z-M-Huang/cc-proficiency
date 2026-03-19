import type { ProficiencyResult, DomainScore, TokenWindows } from "../types.js";
import { getLocale, type Locale, type LocaleStrings } from "../i18n/locales.js";
import {
  C, DOMAIN_COLORS, SANS, MONO, MINI_BAR_KEYS, MINI_BAR_SECTION_HEIGHT,
  escapeXml, confidenceSymbol, domainLabel, formatHours,
  svgDefs, miniBarColor, miniBarOpacity, renderCalibratingBadge,
} from "./svg.js";
import { formatTokens } from "../utils/format.js";

// ── Animation timing ──

const BAR_DUR = "1s";
const BAR_EASING = `calcMode="spline" keySplines="0.25 0.1 0.25 1"`;
const FADE_DUR = "0.25s";

function barDelay(i: number): string {
  return (0.3 + i * 0.2).toFixed(1);
}

function numberDelay(i: number): string {
  return (0.3 + i * 0.2 + 0.8).toFixed(1);
}

// ── Animated domain row ──

function renderAnimatedDomainRow(d: DomainScore, y: number, i: number, t: LocaleStrings): string {
  const label = escapeXml(domainLabel(d.id, t));
  const color = DOMAIN_COLORS[d.id] ?? C.textDim;
  const barWidth = 220;
  const filledWidth = Math.round((d.score / 100) * barWidth);
  const bDelay = barDelay(i);
  const nDelay = numberDelay(i);

  return `<g transform="translate(25, ${y})">
      <text x="0" y="14" fill="${C.textDim}" font-size="13" font-family="${SANS}" font-weight="500">${label}</text>
      <g transform="translate(120, 3)">
        <rect width="${barWidth}" height="12" rx="6" fill="${C.barBg}" opacity="0.5"/>
        <rect width="0" height="12" rx="6" fill="${color}" filter="url(#glow)">
          <animate attributeName="width" from="0" to="${filledWidth}" dur="${BAR_DUR}" begin="${bDelay}s" fill="freeze" ${BAR_EASING}/>
        </rect>
      </g>
      <text x="${120 + barWidth + 10}" y="14" fill="${C.text}" font-size="14" font-family="${MONO}" font-weight="700" opacity="0">${d.score}<animate attributeName="opacity" from="0" to="1" dur="${FADE_DUR}" begin="${nDelay}s" fill="freeze"/></text>
      <text x="${120 + barWidth + 42}" y="14" fill="${color}" font-size="12" font-family="${MONO}" opacity="0">${confidenceSymbol(d.confidence)}<animate attributeName="opacity" from="0" to="1" dur="${FADE_DUR}" begin="${nDelay}s" fill="freeze"/></text>
    </g>`;
}

// ── Animated mini-bar grid ──

function renderAnimatedMiniBarGrid(
  featureScores: Record<string, number> | undefined,
  y: number,
  baseDelay: number,
  t: LocaleStrings
): string {
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
    const fadeDelay = (baseDelay + i * 0.06).toFixed(2);

    lines.push(`<g transform="translate(${x}, ${y})" opacity="0">`);
    lines.push(`  <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="${fadeDelay}s" fill="freeze"/>`);
    lines.push(`  <rect width="${colWidth}" height="${barHeight}" rx="4" fill="${fillColor}" opacity="${opacity}"/>`);
    lines.push(`  <text x="${colWidth / 2}" y="${barHeight / 2 + 1}" fill="${score > 0 ? '#fff' : C.textMuted}" font-size="10" font-family="${MONO}" font-weight="600" text-anchor="middle" dominant-baseline="middle">${score}</text>`);
    lines.push(`  <text x="${colWidth / 2}" y="${barHeight + 13}" fill="${C.textMuted}" font-size="9" font-family="${SANS}" text-anchor="middle">${label}</text>`);
    lines.push(`</g>`);
  }

  return lines.join("\n");
}

// ── Full animated badge ──

function hasTokens(tw?: TokenWindows): boolean {
  return tw != null && (tw.tokens24h > 0 || tw.tokens30d > 0);
}

export function renderAnimatedFullBadge(result: ProficiencyResult, locale: Locale = "en", tokenWindows?: TokenWindows): string {
  const t = getLocale(locale);
  const width = 495;
  const rows = result.domains.length;
  const separatorY = 62 + rows * 28 + 6;
  const miniBarY = separatorY + 14;
  const footerY = miniBarY + MINI_BAR_SECTION_HEIGHT + 6;
  const showTokens = hasTokens(tokenWindows);
  const tokenOffset = showTokens ? 16 : 0;
  const height = footerY + 40 + tokenOffset;
  const u = escapeXml(result.username);

  // Timing: last domain bar finishes at barDelay(rows-1) + 1.0s
  const lastBarEnd = parseFloat(numberDelay(rows - 1));
  const miniDelay = lastBarEnd + 0.3;
  const footerDelay = (miniDelay + 0.6).toFixed(1);
  const footerDelay2 = (miniDelay + 0.8).toFixed(1);

  const domainSvg = result.domains
    .map((d, i) => renderAnimatedDomainRow(d, 62 + i * 28, i, t))
    .join("\n");

  const phaseLabel = result.phase === "early"
    ? `<text x="${width - 25}" y="${footerY + 16}" fill="#d29922" font-size="10" font-family="${MONO}" text-anchor="end" opacity="0">${escapeXml(t.earlyResults)}<animate attributeName="opacity" from="0" to="1" dur="${FADE_DUR}" begin="${footerDelay}s" fill="freeze"/></text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="cc-title cc-desc">
  <title id="cc-title">${escapeXml(t.title)} \u2014 @${u}</title>
  <desc id="cc-desc">${result.sessionCount} ${escapeXml(t.sessions)}, ${result.projectCount} ${escapeXml(t.projects)}</desc>
  ${svgDefs()}
  <rect width="${width}" height="${height}" rx="12" fill="${C.bg}"/>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="11.5" fill="${C.card}" stroke="${C.border}"/>
  <text x="25" y="34" fill="${C.text}" font-size="18" font-family="${SANS}" font-weight="600">${escapeXml(t.title)}</text>
  <a href="https://github.com/${u}" target="_blank"><text x="${width - 25}" y="34" fill="${C.textDim}" font-size="13" font-family="${MONO}" text-anchor="end">@${u}</text></a>
  <line x1="25" y1="48" x2="${width - 25}" y2="48" stroke="${C.border}"/>

  ${domainSvg}

  <line x1="25" y1="${separatorY}" x2="${width - 25}" y2="${separatorY}" stroke="${C.border}"/>

  ${renderAnimatedMiniBarGrid(result.features.featureScores, miniBarY, miniDelay, t)}

  <line x1="25" y1="${footerY}" x2="${width - 25}" y2="${footerY}" stroke="${C.border}"/>
  <text x="25" y="${footerY + 16}" fill="${C.textMuted}" font-size="11" font-family="${MONO}" opacity="0">${formatHours(result.features.totalHours)} \u00B7 ${result.sessionCount} ${escapeXml(t.sessions)} \u00B7 ${result.projectCount} ${escapeXml(t.projects)}${result.streak ? ` \u00B7 \uD83D\uDD25 ${result.streak}d` : ""}${result.achievementCount ? ` \u00B7 \uD83C\uDFC6 ${result.achievementCount}` : ""}<animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${footerDelay}s" fill="freeze"/></text>
  ${showTokens ? `<text x="25" y="${footerY + 30}" fill="${C.textDim}" font-size="10" font-family="${MONO}" opacity="0">tokens  ${formatTokens(tokenWindows!.tokens24h)}/24h \u00B7 ${formatTokens(tokenWindows!.tokens30d)}/30d<animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${footerDelay}s" fill="freeze"/></text>` : ""}
  <text x="25" y="${footerY + 16 + tokenOffset + 16}" fill="${C.textMuted}" font-size="9" font-family="${MONO}" opacity="0">${result.timestamp.slice(0, 10)}<animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${footerDelay2}s" fill="freeze"/></text>
  <text x="${width - 25}" y="${footerY + 16 + tokenOffset + 16}" fill="${C.textMuted}" font-size="9" font-family="${MONO}" text-anchor="end" opacity="0">github.com/Z-M-Huang/cc-proficiency<animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${footerDelay2}s" fill="freeze"/></text>
  ${phaseLabel}
</svg>`;
}

/**
 * Render animated badge. Falls back to static calibrating badge
 * (no animation needed for the calibrating phase).
 */
export function renderAnimatedBadge(result: ProficiencyResult, locale: Locale = "en", tokenWindows?: TokenWindows): string {
  if (result.phase === "calibrating") {
    return renderCalibratingBadge(result, locale, tokenWindows);
  }
  return renderAnimatedFullBadge(result, locale, tokenWindows);
}
