// ── Raw JSONL Entry (from Claude Code transcripts) ──

export interface RawTranscriptEntry {
  parentUuid: string | null;
  isSidechain: boolean;
  type: string; // "user" | "assistant" | "progress" | "system" | "file-history-snapshot"
  uuid: string;
  timestamp: string;
  sessionId: string;
  cwd: string;
  version: string;
  gitBranch?: string;
  slug?: string;
  userType?: string;
  permissionMode?: string;
  promptId?: string;

  // type=user or type=assistant
  message?: {
    role: string;
    model?: string;
    content: string | ContentBlock[];
    usage?: TokenUsage;
    stop_reason?: string;
  };

  // type=user (tool results)
  toolUseResult?: ToolUseResult;

  // type=progress
  data?: ProgressData;

  // type=system
  subtype?: string;
  hookCount?: number;
  hookInfos?: Array<{ command: string; durationMs: number }>;
  preventedContinuation?: boolean;
}

export interface ContentBlock {
  type: string; // "text" | "tool_use" | "tool_result" | "thinking"
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string | ContentBlock[];
  is_error?: boolean;
  caller?: { type: string };
}

export interface TokenUsage {
  input_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  output_tokens?: number;
}

export interface ProgressData {
  type: string; // "hook_progress" | "agent_progress"
  hookEvent?: string;
  hookName?: string;
  command?: string;
  prompt?: string;
  agentId?: string;
}

export interface ToolUseResult {
  type?: string;
  filePath?: string;
  oldString?: string;
  newString?: string;
  structuredPatch?: unknown[];
  userModified?: boolean;
  replaceAll?: boolean;
}

// ── Normalized Events (internal representation) ──

export type NormalizedEvent =
  | UserPromptEvent
  | ToolCallEvent
  | ToolResultEvent
  | HookProgressEvent
  | SystemStopEvent
  | FileSnapshotEvent
  | UnknownEvent;

export interface UserPromptEvent {
  kind: "user_prompt";
  sessionId: string;
  timestamp: string;
  content: string;
  permissionMode?: string;
}

export interface ToolCallEvent {
  kind: "tool_call";
  sessionId: string;
  timestamp: string;
  toolName: string;
  toolId: string;
  input: Record<string, unknown>;
  callerType?: string;
}

export interface ToolResultEvent {
  kind: "tool_result";
  sessionId: string;
  timestamp: string;
  toolId: string;
  isError: boolean;
}

export interface HookProgressEvent {
  kind: "hook_progress";
  sessionId: string;
  timestamp: string;
  hookEvent: string;
  hookName: string;
  command: string;
}

export interface SystemStopEvent {
  kind: "system_stop";
  sessionId: string;
  timestamp: string;
  hookCount: number;
  preventedContinuation: boolean;
}

export interface FileSnapshotEvent {
  kind: "file_snapshot";
  sessionId: string;
  timestamp: string;
}

export interface UnknownEvent {
  kind: "unknown";
  sessionId: string;
  timestamp: string;
  rawType: string;
}

// ── Parsed Session ──

export interface ParsedSession {
  sessionId: string;
  startTime: string;
  endTime: string;
  project: string; // sanitized slug, NOT full path
  events: NormalizedEvent[];
  version: string;
}

// ── Extracted Signals ──

export interface ExtractedSignals {
  ccMastery: CCMasterySignals;
  toolMcp: ToolMcpSignals;
  agentic: AgenticSignals;
  promptCraft: PromptCraftSignals;
  contextMgmt: ContextMgmtSignals;
  outcomes: OutcomeSignals;
}

export interface CCMasterySignals {
  hasGlobalClaudeMd: boolean;
  globalClaudeMdHasImports: boolean;
  projectClaudeMdCount: number;
  hasCustomHooks: boolean;
  hookWithMatcherCount: number;
  pluginCount: number;
  pluginsUsedInTranscripts: number;
  uniqueSkillsUsed: number;
  usedPlanMode: boolean;
  hasRulesFiles: boolean;
}

export interface ToolMcpSignals {
  uniqueToolsUsed: number;
  uniqueMcpServersUsed: number;
  lspToolCallCount: number;
  deliberateWorkflowCount: number;
  editSuccessRate: number; // 0-1
  totalToolCalls: number;
}

export interface AgenticSignals {
  uniqueSubagentTypes: number;
  totalSubagentCalls: number;
  parallelToolCallCount: number;
  usedWorktree: boolean;
  multiSessionProjectCount: number;
  usedTaskManagement: boolean;
}

export interface PromptCraftSignals {
  structuredPromptRatio: number; // 0-1
  iterativeRefinementCount: number;
  uniqueCommandsUsed: number;
  contextProvisionCount: number;
  totalPrompts: number;
}

export interface ContextMgmtSignals {
  memoryFileCount: number;
  activeMemoryFiles: number; // recently modified
  projectCount: number;
  sessionCount: number;
  sessionDurations: number[]; // minutes
}

export interface OutcomeSignals {
  editAcceptanceRate: number; // 0-1
  permissionModeProgression: number; // -1 to 1
  errorRecoveryRate: number; // 0-1
  repeatFailureRate: number; // 0-1
}

// ── Scoring ──

export type DomainId =
  | "cc-mastery"
  | "tool-mcp"
  | "agentic"
  | "prompt-craft"
  | "context-mgmt";

export type ConfidenceLevel = "low" | "medium" | "high";

export interface DomainScore {
  id: DomainId;
  label: string;
  score: number; // 0-100
  weight: number; // 0-1
  confidence: ConfidenceLevel;
  dataPoints: number;
}

export interface FeatureInventory {
  hooks: Array<{ name: string; count: number }>;
  skills: Array<{ name: string; count: number }>;
  mcpServers: string[];
  topTools: Array<{ name: string; count: number }>;
  totalToolCalls: number;
  uniqueToolCount: number;
  usedPlanMode: boolean;
  hasMemory: boolean;
  hasRules: boolean;
  totalHours: number;
  featureScores?: Record<string, number>; // mini-bar heatmap scores per feature tag
}

export interface ProficiencyResult {
  username: string;
  timestamp: string;
  domains: DomainScore[];
  features: FeatureInventory;
  sessionCount: number;
  projectCount: number;
  phase: "calibrating" | "early" | "full";
  setupChecklist: SetupChecklist;
  streak?: number;          // current streak days (from remote store)
  achievementCount?: number; // unlocked achievements count
}

export interface SetupChecklist {
  hasClaudeMd: boolean;
  hasHooks: boolean;
  hasPlugins: boolean;
  hasMcpServers: boolean;
  hasMemory: boolean;
  hasRules: boolean;
}

// ── Config ──

export interface CCProficiencyConfig {
  username?: string;
  gistId?: string;
  autoUpload: boolean;
  public: boolean;
  locale?: string; // "en" | "zh-CN"
}

// ── Store ──

export interface SessionSnapshot {
  sessionId: string;
  timestamp: string;
  project: string; // sanitized slug
  signals: ExtractedSignals;
  scoringVersion: string;
}

export interface LocalStore {
  processedSessionIds: string[];
  snapshots: SessionSnapshot[];
  lastResult?: ProficiencyResult;
  lastUpdated?: string;
}

// ── Remote Store (Gist-as-Database) ──

export interface RemoteStore {
  version: "1.0.0";
  username: string;
  memberSince: string;

  processedSessionIds: string[];
  sessionHours: Record<string, number>;
  sessionProjects: Record<string, string>;

  lastPushMachine: string;
  lastPushTimestamp: string;
  domains: Array<{ id: DomainId; score: number; confidence: string }>;
  featureScores: Record<string, number>;

  streak: StreakData;
  achievements: Array<{ id: string; unlockedAt: string }>;
  weeklyTrends: WeeklyTrend[];
}

export interface StreakData {
  current: number;
  longest: number;
  lastActiveDate: string;
  activeDates: string[];
}

export interface WeeklyTrend {
  week: string;
  domains: Record<string, number>;
  hours: number;
  sessions: number;
}

// ── Achievement ──

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: (ctx: AchievementContext) => { current: number; target: number };
}

export interface AchievementContext {
  totalSessions: number;
  totalHours: number;
  totalProjects: number;
  domains: Array<{ id: string; score: number }>;
  streak: { current: number; longest: number };
  features: FeatureInventory;
  activeDates: string[];
}

// ── Queue ──

export interface QueueEntry {
  sessionId: string;
  transcriptPath: string;
  cwd: string;
  timestamp: string;
}

// ── History ──

export interface HistoryEntry {
  display: string;
  pastedContents: Record<string, unknown>;
  timestamp: number;
  project: string;
  sessionId: string;
}
