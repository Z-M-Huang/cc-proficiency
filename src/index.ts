export type {
  ProficiencyResult,
  DomainScore,
  ExtractedSignals,
  SetupChecklist,
  FeatureInventory,
  CCProficiencyConfig,
  LocalStore,
  SessionSnapshot,
  QueueEntry,
} from "./types.js";

export { parseTranscript, sanitizeProjectSlug } from "./parsers/transcript-parser.js";
export { normalizeEntry } from "./parsers/normalizer.js";
export { parseClaudeConfig, buildSetupChecklist } from "./parsers/config-parser.js";
export { parseHistory } from "./parsers/history-parser.js";
export { extractSignals } from "./scoring/signals.js";
export { computeProficiency, extractFeatureInventory, getPhase, getConfidence, getRecencyWeight, SCORING_VERSION } from "./scoring/engine.js";
export { fireRules, aggregateToBuckets, bucketsToScores, extractFeatureScores } from "./scoring/rule-engine.js";
export { RULES } from "./scoring/rules.js";
export { logCurve, cappedRatio, binary, ratioToScore, weightedSum } from "./scoring/curves.js";
export { isCIEnvironment } from "./utils/ci-detect.js";
