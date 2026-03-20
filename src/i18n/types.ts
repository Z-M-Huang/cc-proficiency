// ── i18n Type Definitions ──
// This file is type-only and exempt from the 300-line limit.

export type Locale = "en" | "zh-CN" | "es" | "fr" | "ja" | "ko";

export type DomainId = "cc-mastery" | "tool-mcp" | "agentic" | "prompt-craft" | "context-mgmt";
export type FeatureKey = "hooks" | "plugins" | "skills" | "mcp" | "agents" | "plan" | "memory" | "rules";

// ── Shared / Common ──

export interface CommonStrings {
  noAnalysisData: string;
  ghNotAuthenticated: string;
  ghNotAuthenticatedHint: string;
  noGistConfigured: string;
  badgeSavedLocally: (path: string) => string;
  unknownKey: (key: string) => string;
  invalidLocale: (val: string, supported: string) => string;
}

// ── Badge / SVG ──

export interface BadgeStrings {
  title: string;
  calibrating: string;
  needMore: (n: number) => string;
  sessions: string;
  projects: string;
  setup: string;
  earlyResults: string;
  domainLabels: Record<DomainId, string>;
  featureLabels: Record<FeatureKey, string>;
  claudeMd: string;
  tokensPrefix: string;
}

// ── CLI ──

export interface HelpStrings {
  description: string;
  commands: {
    init: string;
    analyze: string;
    process: string;
    badge: string;
    push: string;
    refresh: string;
    explain: string;
    status: string;
    config: string;
    share: string;
    leaderboard: string;
    update: string;
    uninstall: string;
    version: string;
  };
  examples: string;
}

export interface InitStrings {
  initializing: string;
  githubUser: (username: string) => string;
  badgeSavedLocallyHint: (path: string) => string;
  ghEnableHint: string;
  localeDetected: (locale: string) => string;
  hookInjected: string;
  runningInitialAnalysis: string;
  creatingGist: string;
  gistCreated: string;
  addToReadme: string;
  gistCreateFailed: (err: string) => string;
  badgePushedToGist: (url: string) => string;
  configSaved: (path: string) => string;
}

export interface AnalyzeStrings {
  runningFull: string;
  runningIncremental: string;
  noSessionsFound: string;
}

export interface ExplainStrings {
  titleLine: (username: string) => string;
  strengths: string;
  areasToImprove: string;
  featureUsage: string;
  domainTips: Record<DomainId, string>;
  hooksLabel: string;
  skillsLabel: string;
  mcpLabel: string;
  toolsLabel: string;
  flagsLabel: string;
  more: string;
  sessionsSummary: (sessions: number, projects: number) => string;
}

export interface AchievementsDisplayStrings {
  title: (unlocked: number, total: number) => string;
  done: string;
}

export interface StatusStrings {
  title: string;
  username: string;
  gistId: string;
  autoUpload: string;
  locale: string;
  leaderboardLabel: string;
  joined: (gistId: string) => string;
  notJoined: string;
  pending: string;
  sessionsProcessed: string;
  lastUpdated: string;
  never: string;
  queuePending: string;
  hookLog: (count: number) => string;
  lastHookFired: (time: string) => string;
  noHookEntries: string;
  queueLock: string;
  queueLockHeld: (age: number) => string;
  queueLockStale: string;
  queueLockPresent: string;
  queueLockNone: string;
  notSet: string;
}

export interface ConfigStrings {
  setValue: (key: string, val: string) => string;
}

export interface ShareStrings {
  joining: string;
  sharingPublicly: string;
  sharedItems: string;
  notShared: string;
  alreadyOnLeaderboard: string;
  creatingPublicGist: string;
  publicGistCreated: (url: string) => string;
  publicGistUpdated: (url: string) => string;
  publicGistCreateFailed: (err: string) => string;
  publicGistUpdateFailed: (err: string) => string;
  registering: string;
  registrationCreated: string;
  profileWillAppear: string;
  syncFailed: (err: string) => string;
  noMergedData: string;
  registerFailed: (err: string) => string;
  leaving: string;
  removalCreated: (url: string) => string;
  publicGistDeleted: string;
  publicGistDeleteFailed: (err: string) => string;
  unchangedNotice: string;
  removedFromLeaderboard: string;
}

export interface LeaderboardStrings {
  title: (count: number) => string;
  unavailable: string;
  columnHeader: string;
  users: (count: number, skipped: number) => string;
  updatedJustNow: string;
  updatedRecently: string;
  cached: string;
  sortHelp: string;
  limitHelp: string;
}

export interface UpdateStrings {
  checking: string;
  alreadyLatest: (version: string) => string;
  available: (current: string, latest: string) => string;
  updating: string;
  updated: (version: string) => string;
  permissionDenied: string;
  runAsAdmin: string;
  runSudo: (version: string) => string;
  npmNotFound: string;
  fetchFailed: string;
  failed: (err: string) => string;
  tryManually: (version: string) => string;
}

export interface UninstallStrings {
  uninstalling: string;
  localDataRemoved: string;
  couldNotRemove: (path: string) => string;
  npmUninstallHint: string;
}

export interface ProcessStrings {
  anotherRunning: string;
  queueEmpty: string;
  processed: (count: number, path: string) => string;
}

export interface BadgeCmdStrings {
  writtenTo: (path: string) => string;
  savedTo: (path: string) => string;
}

export interface CliStrings {
  help: HelpStrings;
  init: InitStrings;
  analyze: AnalyzeStrings;
  explain: ExplainStrings;
  achievements: AchievementsDisplayStrings;
  status: StatusStrings;
  config: ConfigStrings;
  share: ShareStrings;
  leaderboard: LeaderboardStrings;
  update: UpdateStrings;
  uninstall: UninstallStrings;
  process: ProcessStrings;
  badge: BadgeCmdStrings;
}

// ── Services ──

export interface PublishingStrings {
  achievementUnlocked: (icon: string, name: string) => string;
  pushedToGist: string;
  pushFailed: (err: string) => string;
  staticUrl: (url: string) => string;
  animatedUrl: (url: string) => string;
  pushSummary: (sessions: number, hours: string, achievements: number, streak: number) => string;
}

export interface HookStrings {
  alreadyInstalled: string;
  couldNotParse: string;
  hookRemoved: string;
  couldNotUpdate: string;
}

export interface ServiceStrings {
  publishing: PublishingStrings;
  hooks: HookStrings;
}

// ── Formatting ──

export interface FormattingStrings {
  calibratingStatus: (sessions: number, needed: number) => string;
  setupLabel: string;
  setupItems: Record<string, string>;
  earlyResultsNote: string;
  tokensLabel: string;
}

// ── Update Check ──

export interface UpdateCheckStrings {
  available: (current: string, latest: string) => string;
  runUpdate: string;
}

// ── Achievement Items ──

export interface AchievementItemStrings {
  name: string;
  description: string;
}

// ── Insights ──

export interface InsightStrings {
  domainLabels: Record<DomainId, string>;
  domainActions: Record<DomainId, string>;
  fallbackAction: (label: string) => string;
}

// ── Registry (GitHub Issues) ──

export interface RegistryStrings {
  joinTitle: (username: string) => string;
  joinBody: (username: string, gistId: string) => string;
  leaveTitle: (username: string) => string;
  leaveBody: (username: string) => string;
}

// ── Root ──

export interface AllStrings {
  common: CommonStrings;
  badge: BadgeStrings;
  cli: CliStrings;
  services: ServiceStrings;
  formatting: FormattingStrings;
  updateCheck: UpdateCheckStrings;
  achievements: Record<string, AchievementItemStrings>;
  insights: InsightStrings;
  registry: RegistryStrings;
}
