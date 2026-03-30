import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

import { createHash } from "node:crypto";

import { loadStore, saveStore, saveAIBadge, computeTokenWindows } from "../../store/local-store.js";
import { loadRubric, buildPromptFromRubric } from "../../scoring/rubric-loader.js";
import { assembleEvidence, precomputeStats, buildEvidencePayload, getAIPhase, computeAIEvidence } from "../../scoring/ai-evidence.js";
import { checkClaudeVersion, gradeWithClaude, postProcess, computeCacheKey } from "../../scoring/ai-grader.js";
import { renderAIAnimatedBadge } from "../../renderer/ai-animated-svg.js";
import { acquireAIGradeLock, releaseAIGradeLock } from "../../store/queue.js";
import { parseClaudeConfig } from "../../parsers/config-parser.js";
import { t } from "../../i18n/index.js";
import type { AIGradingResult } from "../../types.js";

const FACETS_DIR = join(homedir(), ".claude", "usage-data", "facets");
const META_DIR = join(homedir(), ".claude", "usage-data", "session-meta");

function parseFlags(args: string[]): { model?: string; full: boolean } {
  let model: string | undefined;
  let full = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--model" && i + 1 < args.length) {
      model = args[++i];
    } else if (args[i] === "--full") {
      full = true;
    }
  }
  return { model, full };
}

function getLatestMtime(dir: string): string {
  try {
    const stat = statSync(dir);
    return stat.mtime.toISOString();
  } catch {
    return "";
  }
}

function printResults(result: AIGradingResult): void {
  const strings = t().cli.aiGrade;
  console.log(strings.gradingComplete);
  for (const domain of result.domains) {
    const label = t().aiBadge.aiDomainLabels[domain.id] ?? domain.id;
    console.log(strings.domainResult(label, domain.total, domain.level));
  }
  console.log(`\n  ${result.overall}`);
}

export async function cmdAIGrade(args: string[]): Promise<void> {
  const strings = t().cli.aiGrade;
  const { model, full } = parseFlags(args);

  // Check prerequisites: Claude CLI
  if (!checkClaudeVersion()) {
    console.log(strings.claudeNotFound);
    return;
  }

  // Check prerequisites: session-meta data exists
  if (!existsSync(META_DIR)) {
    console.log(strings.insufficientFacets(0, 10));
    return;
  }

  // Acquire AI grade lock (separate from queue lock)
  if (!acquireAIGradeLock()) {
    console.log("Another AI grading process is already running.");
    return;
  }

  try {
    console.log(strings.running);

    // Load rubric and build prompt
    const rubric = loadRubric();
    const rubricText = buildPromptFromRubric(rubric);
    const rubricVersion = createHash("sha256").update(rubricText).digest("hex").slice(0, 12);

    // Assemble evidence
    const evidence = assembleEvidence(META_DIR, FACETS_DIR);
    if (!evidence) {
      console.log(strings.insufficientFacets(0, 10));
      return;
    }

    // Check phase
    const phase = getAIPhase(evidence.metaCount);
    if (phase === "insufficient") {
      console.log(strings.insufficientFacets(evidence.metaCount, 10));
      return;
    }

    // Precompute stats and build payload
    const stats = precomputeStats(evidence);
    const configSignals = parseClaudeConfig();
    const store = loadStore();
    const ruleScores = store.lastResult?.domains;
    const features = store.lastResult?.features;
    const payload = buildEvidencePayload(stats, configSignals, ruleScores, features);

    // Check cache
    const metaMtime = getLatestMtime(META_DIR);
    const ruleScoresHash = ruleScores
      ? createHash("sha256").update(JSON.stringify(ruleScores.map(d => `${d.id}=${d.percentage}`))).digest("hex").slice(0, 12)
      : "";
    const cacheKey = computeCacheKey(metaMtime, rubricText, evidence.metaCount, JSON.stringify(configSignals), ruleScoresHash);

    if (!full && store.lastAIResult?.cacheKey === cacheKey) {
      console.log(strings.cacheHit);
      printResults(store.lastAIResult);
      return;
    }

    // Grade with Claude
    const gradeResult = gradeWithClaude(rubricText, payload, model);
    if (!gradeResult) {
      console.log(strings.gradingFailed("Claude returned no result"));
      return;
    }

    // Post-process (use actual model ID from claude response, not the alias)
    let result: AIGradingResult;
    try {
      result = postProcess(gradeResult.response, rubric, gradeResult.actualModel, rubricVersion);
    } catch (err) {
      console.log(strings.gradingFailed(String(err)));
      return;
    }
    result.cacheKey = cacheKey;

    // Render and save badge (uses proficiency result for shared header/footer)
    if (!store.lastResult) {
      console.log(strings.gradingFailed("No proficiency data yet. Run 'cc-proficiency process' first."));
      return;
    }
    const tokenWindows = computeTokenWindows(store.tokenLog);
    const svg = renderAIAnimatedBadge(result, phase, store.lastResult, tokenWindows);
    const badgePath = saveAIBadge(svg);

    // Save to store (including AI evidence for achievements)
    store.lastAIResult = result;
    store.aiEvidence = computeAIEvidence(evidence, stats);
    saveStore(store);

    // Print results
    printResults(result);
    console.log(strings.badgeSaved(badgePath));
  } finally {
    releaseAIGradeLock();
  }
}
