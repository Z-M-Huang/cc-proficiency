#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync, rmdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { parseTranscript } from "./parsers/transcript-parser.js";
import { parseClaudeConfig, buildSetupChecklist } from "./parsers/config-parser.js";
import { computeProficiency, SCORING_VERSION } from "./scoring/engine.js";
import { renderBadge, getInsights } from "./renderer/svg.js";
import { detectLocale, type Locale } from "./i18n/locales.js";
import { loadStore, saveStore, addSnapshot, isSessionProcessed, loadConfig, saveConfig, saveBadge, getBadgePath, logError, getStoreDir } from "./store/local-store.js";
import { readQueue, writeQueue, acquireLock, releaseLock, ensureStoreDir } from "./store/queue.js";
import { isGhAuthenticated, getGhUsername, createGist, updateGist, getGistRawUrl, readGistFile, findExistingGist, pushGistFiles } from "./gist/uploader.js";
import { emptyRemoteStore, parseRemoteStore, mergeIntoRemote, getTotalStats, getUTCDate, getWeekMonday, mergeWeeklyTrends } from "./store/remote-store.js";
import { checkAchievements, ACHIEVEMENTS, getAchievementDef } from "./store/achievements.js";
import type { ParsedSession, SessionSnapshot, RemoteStore, WeeklyTrend } from "./types.js";

const CLAUDE_DIR = join(homedir(), ".claude");

function getConfigLocale(): Locale {
  const config = loadConfig();
  if (config.locale === "zh-CN") return "zh-CN";
  if (config.locale === "en") return "en";
  return detectLocale();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "init":
      return await cmdInit();
    case "analyze":
      return cmdAnalyze(args);
    case "process":
      return cmdProcess();
    case "badge":
      return cmdBadge(args);
    case "push":
      return cmdPush();
    case "explain":
      return cmdExplain();
    case "achievements":
      return cmdAchievements();
    case "status":
      return cmdStatus();
    case "config":
      return cmdConfig(args.slice(1));
    case "uninstall":
      return cmdUninstall();
    case "version":
      console.log(`cc-proficiency v${getVersion()} (scoring ${SCORING_VERSION})`);
      return;
    default:
      printUsage();
      return;
  }
}

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
    return pkg.version ?? "0.1.0";
  } catch {
    return "0.1.0";
  }
}

function printUsage(): void {
  console.log(`
cc-proficiency — Claude Code Proficiency Badge Generator

Commands:
  init                  Set up configuration and hooks
  analyze [--full]      Analyze sessions and compute scores
  process               Process queued sessions from hook
  badge [--output <f>]  Generate SVG badge
  push                  Upload badge to GitHub Gist
  explain               Show score drivers and improvement tips
  status                Show hook activity, queue, and config
  config [key] [value]  View or set configuration
  uninstall             Remove hooks and clean up
  version               Show version info

Examples:
  cc-proficiency init
  cc-proficiency analyze --full
  cc-proficiency badge --output badge.svg
  cc-proficiency explain
`);
}

// ── Init ──

async function cmdInit(): Promise<void> {
  console.log("Initializing cc-proficiency...\n");
  ensureStoreDir();

  const config = loadConfig();

  // Detect GitHub user
  if (isGhAuthenticated()) {
    const username = getGhUsername();
    if (username) {
      config.username = username;
      console.log(`  GitHub user: @${username}`);
    }
  } else {
    console.log("  ⚠ GitHub CLI not authenticated.");
    console.log("  Badge will be saved locally to: " + getBadgePath());
    console.log("  To enable auto-upload: gh auth login && cc-proficiency init\n");
  }

  // Inject hook into settings.json
  injectHook();
  console.log("  ✓ Hook injected into ~/.claude/settings.json");

  // Run analysis first (so we have a real badge before creating Gist)
  console.log("\n  Running initial analysis...");
  saveConfig(config);
  await cmdAnalyze(["--full"]);

  // Generate the real badge SVG
  const store = loadStore();
  let badgeSvg = '<svg xmlns="http://www.w3.org/2000/svg"><text>No data</text></svg>';
  if (store.lastResult) {
    badgeSvg = renderBadge(store.lastResult, getConfigLocale());
    saveBadge(badgeSvg);
  }

  // Create Gist with the REAL badge (not a placeholder)
  if (config.username && isGhAuthenticated() && !config.gistId) {
    console.log("  Creating private Gist with badge...");
    const result = createGist(badgeSvg, config.public);
    if (result.success && result.url) {
      config.gistId = result.url;
      const rawUrl = getGistRawUrl(config.username, result.url);
      console.log(`  ✓ Gist created`);
      console.log(`\n  Add to your README:`);
      console.log(`  ![CC Proficiency](${rawUrl})`);
    } else {
      console.log(`  ⚠ Could not create Gist: ${result.error}`);
    }
  } else if (config.gistId && isGhAuthenticated()) {
    // Existing Gist — push the updated badge
    const gistResult = updateGist(config.gistId, badgeSvg);
    if (gistResult.success) {
      const rawUrl = getGistRawUrl(config.username ?? "", config.gistId);
      console.log(`  ✓ Badge pushed to Gist: ${rawUrl}`);
    }
  }

  saveConfig(config);
  console.log("\n  ✓ Configuration saved to " + getStoreDir());
  console.log("  Badge saved locally to: " + getBadgePath());
}

function injectHook(): void {
  const settingsPath = join(CLAUDE_DIR, "settings.json");
  let settings: Record<string, unknown> = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      console.log("  ⚠ Could not parse settings.json, creating new hooks section");
    }
  }

  // Check for existing cc-proficiency hook (idempotent)
  const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>;
  const stopHooks = (hooks.Stop ?? []) as Array<{ hooks?: Array<{ command?: string }> }>;

  const alreadyInstalled = stopHooks.some((group) =>
    group.hooks?.some((h) => h.command?.includes("cc-proficiency"))
  );

  if (alreadyInstalled) {
    console.log("  Hook already installed (skipping)");
    return;
  }

  // Ensure ~/.claude/ exists before writing settings.json
  if (!existsSync(CLAUDE_DIR)) {
    mkdirSync(CLAUDE_DIR, { recursive: true });
  }

  // Find the installed path of this package
  // When compiled: dist/cli.js → dist/hooks/session-end.js
  const hookScript = join(__dirname, "hooks", "session-end.js");
  const hookCommand = `node "${hookScript}"`;

  stopHooks.push({
    hooks: [
      {
        type: "command" as const,
        command: hookCommand,
        timeout: 5,
      } as Record<string, unknown>,
    ],
  } as Record<string, unknown>);

  hooks.Stop = stopHooks;
  settings.hooks = hooks;

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}

// ── Analyze ──

async function cmdAnalyze(args: string[]): Promise<void> {
  const full = args.includes("--full");
  console.log(full ? "Running full analysis..." : "Running incremental analysis...\n");

  const { sessions, config } = await gatherData(full);

  if (sessions.length === 0) {
    console.log("No sessions found. Use Claude Code first, then run analyze again.");
    return;
  }

  const setupChecklist = buildSetupChecklist(config);
  const userConfig = loadConfig();

  const result = computeProficiency(
    sessions,
    config,
    userConfig.username ?? "unknown",
    setupChecklist
  );

  // Update store with processed session IDs
  const store = loadStore();
  store.lastResult = result;
  for (const s of sessions) {
    if (!store.processedSessionIds.includes(s.sessionId)) {
      store.processedSessionIds.push(s.sessionId);
    }
  }
  saveStore(store);

  // Display
  printResult(result);
}

async function gatherData(full: boolean): Promise<{ sessions: ParsedSession[]; config: ReturnType<typeof parseClaudeConfig> }> {
  const config = parseClaudeConfig();
  const sessions: ParsedSession[] = [];
  const store = full ? { processedSessionIds: [] as string[] } : loadStore();

  const projectsDir = join(CLAUDE_DIR, "projects");
  if (!existsSync(projectsDir)) return { sessions, config };

  const projects = readdirSync(projectsDir);
  for (const proj of projects) {
    const projDir = join(projectsDir, proj);
    try {
      const files = readdirSync(projDir).filter((f) => f.endsWith(".jsonl"));
      for (const file of files) {
        const sessionId = file.replace(".jsonl", "");
        if (!full && isSessionProcessed(store as ReturnType<typeof loadStore>, sessionId)) {
          continue;
        }
        try {
          const session = await parseTranscript(join(projDir, file));
          if (session.events.length > 0) {
            sessions.push(session);
          }
        } catch {
          // skip unreadable files
        }
      }
    } catch {
      // skip unreadable project dirs
    }
  }

  return { sessions, config };
}

function printResult(result: ReturnType<typeof computeProficiency>): void {
  console.log(`  Claude Code Proficiency — @${result.username}`);
  console.log("  " + "─".repeat(40));

  if (result.phase === "calibrating") {
    const needed = Math.max(0, 3 - result.sessionCount);
    console.log(`  ⏳ Calibrating... (${result.sessionCount} sessions, need ${needed} more)`);
    console.log("");
    printSetupChecklist(result.setupChecklist);
    return;
  }

  for (const d of result.domains) {
    const bar = progressBar(d.score, 20);
    const conf = d.confidence === "high" ? "●" : d.confidence === "medium" ? "◐" : "○";
    console.log(`  ${d.label.padEnd(14)} ${bar}  ${String(d.score).padStart(3)}  ${conf}`);
  }

  console.log("  " + "─".repeat(40));

  // Feature inventory
  const f = result.features;
  if (f.hooks.length > 0) {
    const shown = f.hooks.slice(0, 3).map((h) => `${h.name} (${h.count}x)`).join(", ");
    const more = f.hooks.length > 3 ? ` +${f.hooks.length - 3}` : "";
    console.log(`  Hooks   ${shown}${more}`);
  }
  if (f.skills.length > 0) {
    const shown = f.skills.slice(0, 3).map((s) => `${s.name} (${s.count}x)`).join(", ");
    const more = f.skills.length > 3 ? ` +${f.skills.length - 3}` : "";
    console.log(`  Skills  ${shown}${more}`);
  }
  if (f.mcpServers.length > 0) {
    console.log(`  MCP     ${f.mcpServers.join(", ")}`);
  }
  const toolSummary = f.topTools.slice(0, 4).map((t) => `${t.name} ${t.count}`).join(" · ");
  console.log(`  Tools   ${toolSummary} (+${f.uniqueToolCount - Math.min(4, f.topTools.length)} more)`);

  console.log("  " + "─".repeat(40));
  const hrs = result.features.totalHours >= 1000 ? (result.features.totalHours / 1000).toFixed(1) + "kh" : result.features.totalHours + "h";
  console.log(`  ${hrs} · ${result.sessionCount} sessions · ${result.projectCount} projects`);

  if (result.phase === "early") {
    console.log(`  (early results — stabilizes at 10 sessions)`);
  }
}

function progressBar(score: number, width: number): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function printSetupChecklist(cl: ReturnType<typeof buildSetupChecklist>): void {
  const items = [
    ["CLAUDE.md", cl.hasClaudeMd],
    ["Hooks", cl.hasHooks],
    ["Plugins", cl.hasPlugins],
    ["MCP Servers", cl.hasMcpServers],
    ["Memory", cl.hasMemory],
    ["Rules", cl.hasRules],
  ] as const;

  console.log("  Setup:");
  for (const [label, ok] of items) {
    console.log(`    ${ok ? "✓" : "✗"} ${label}`);
  }
}

// ── Process ──

async function cmdProcess(): Promise<void> {
  if (!acquireLock()) {
    console.log("Another process is running. Skipping.");
    return;
  }

  try {
    const queue = readQueue();
    if (queue.length === 0) {
      console.log("Queue empty. Nothing to process.");
      return;
    }

    const store = loadStore();
    const newSessions: ParsedSession[] = [];
    const processed: string[] = [];

    for (const entry of queue) {
      if (isSessionProcessed(store, entry.sessionId)) {
        processed.push(entry.sessionId);
        continue;
      }

      if (!existsSync(entry.transcriptPath)) {
        logError(`Transcript not found: ${entry.transcriptPath}`);
        processed.push(entry.sessionId);
        continue;
      }

      try {
        const session = await parseTranscript(entry.transcriptPath);
        if (session.events.length > 0) {
          newSessions.push(session);
          store.processedSessionIds.push(entry.sessionId);
        }
        processed.push(entry.sessionId);
      } catch (err) {
        logError(`Failed to parse ${entry.sessionId}: ${err}`);
        processed.push(entry.sessionId);
      }
    }

    // Recompute overall scores from all snapshots
    if (newSessions.length > 0) {
      const config = parseClaudeConfig();
      const allSessions = await gatherAllProcessedSessions(store);
      const sessionsToScore = allSessions.length > 0 ? allSessions : newSessions;
      const setupChecklist = buildSetupChecklist(config);
      const userConfig = loadConfig();

      const result = computeProficiency(
        sessionsToScore,
        config,
        userConfig.username ?? "unknown",
        setupChecklist
      );

      store.lastResult = result;

      // Generate and save badge
      const svg = renderBadge(result, getConfigLocale());
      const badgePath = saveBadge(svg);

      // Push to gist if configured and autoUpload enabled
      if (userConfig.autoUpload && userConfig.gistId && isGhAuthenticated()) {
        const gistResult = updateGist(userConfig.gistId, svg);
        if (!gistResult.success) {
          logError(`Gist push failed: ${gistResult.error}`);
        }
      }

      console.log(`Processed ${newSessions.length} session(s). Badge saved to ${badgePath}`);
    }

    // Remove processed entries from queue (re-reads to avoid race with hook appends)
    writeQueue(new Set(processed));
    saveStore(store);
  } finally {
    releaseLock();
  }
}

async function gatherAllProcessedSessions(store: ReturnType<typeof loadStore>): Promise<ParsedSession[]> {
  // Re-parse transcripts for all stored session IDs that still have files
  const sessions: ParsedSession[] = [];
  const projectsDir = join(CLAUDE_DIR, "projects");
  if (!existsSync(projectsDir)) return sessions;

  const projects = readdirSync(projectsDir);
  for (const proj of projects) {
    const projDir = join(projectsDir, proj);
    try {
      const files = readdirSync(projDir).filter((f) => f.endsWith(".jsonl"));
      for (const file of files) {
        const sessionId = file.replace(".jsonl", "");
        if (store.processedSessionIds.includes(sessionId)) {
          try {
            const session = await parseTranscript(join(projDir, file));
            if (session.events.length > 0) sessions.push(session);
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }

  return sessions;
}

// ── Badge ──

async function cmdBadge(args: string[]): Promise<void> {
  const store = loadStore();
  if (!store.lastResult) {
    console.log("No analysis data. Run 'cc-proficiency analyze' first.");
    return;
  }

  const svg = renderBadge(store.lastResult, getConfigLocale());

  const outputIdx = args.indexOf("--output");
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    writeFileSync(args[outputIdx + 1]!, svg, "utf-8");
    console.log(`Badge written to ${args[outputIdx + 1]}`);
  } else {
    const path = saveBadge(svg);
    console.log(`Badge saved to ${path}`);
  }
}

// ── Push ──

function cmdPush(): void {
  const config = loadConfig();
  const store = loadStore();

  if (!store.lastResult) {
    console.log("No analysis data. Run 'cc-proficiency analyze' first.");
    return;
  }

  const svg = renderBadge(store.lastResult, getConfigLocale());
  saveBadge(svg);

  if (!isGhAuthenticated() || !config.gistId) {
    if (!isGhAuthenticated()) {
      console.log("⚠ GitHub CLI not authenticated.");
      console.log("To enable: gh auth login && cc-proficiency init");
    }
    if (!config.gistId) {
      console.log("No Gist configured. Run 'cc-proficiency init' first.");
    }
    console.log("Badge saved locally to: " + getBadgePath());
    return;
  }

  // Pull remote, merge, push
  const remoteJson = readGistFile(config.gistId, "cc-proficiency.json");
  let remote = remoteJson ? parseRemoteStore(remoteJson) : null;
  if (!remote) remote = emptyRemoteStore(config.username ?? "unknown");

  // Build local session list for merge
  const avgHours = store.lastResult.features.totalHours / Math.max(store.processedSessionIds.length, 1);
  const localSessions = store.processedSessionIds.map((id) => {
    const snap = store.snapshots.find((s) => s.sessionId === id);
    return {
      id,
      date: snap ? getUTCDate(snap.timestamp) : new Date().toISOString().slice(0, 10),
      hours: avgHours,
      project: snap?.project ?? "unknown",
    };
  });

  const merged = mergeIntoRemote(remote, localSessions, store.lastResult);

  // Get totals from merged store
  const totals = getTotalStats(merged);
  const ctx = {
    totalSessions: totals.sessions,
    totalHours: totals.hours,
    totalProjects: totals.projects,
    domains: merged.domains,
    streak: merged.streak,
    features: store.lastResult.features,
    activeDates: merged.streak.activeDates,
  };
  const newAchievements = checkAchievements(ctx, merged.achievements.map((a) => a.id));
  for (const id of newAchievements) {
    merged.achievements.push({ id, unlockedAt: new Date().toISOString() });
    const def = getAchievementDef(id);
    if (def) console.log(`  🏆 Achievement unlocked: ${def.icon} ${def.name}`);
  }

  // Build weekly trend for current week
  const thisWeek = getWeekMonday(new Date().toISOString());
  const localTrend: WeeklyTrend = {
    week: thisWeek,
    domains: Object.fromEntries(store.lastResult.domains.map((d) => [d.id, d.score])),
    hours: store.lastResult.features.totalHours,
    sessions: store.lastResult.sessionCount,
  };
  merged.weeklyTrends = mergeWeeklyTrends(merged.weeklyTrends, [localTrend]);

  // Push SVG + JSON atomically
  const pushResult = pushGistFiles(config.gistId, {
    "cc-proficiency.svg": svg,
    "cc-proficiency.json": JSON.stringify(merged, null, 2),
  });

  if (pushResult.success) {
    const rawUrl = getGistRawUrl(config.username ?? "", config.gistId);
    console.log("✓ Badge + data pushed to Gist");
    console.log(`  ${rawUrl}`);
    console.log(`  ${totals.sessions} sessions · ${totals.hours.toFixed(1)}h · ${merged.achievements.length} achievements · 🔥 ${merged.streak.current}d streak`);
  } else {
    console.log(`✗ Push failed: ${pushResult.error}`);
  }
}

// ── Achievements ──

function cmdAchievements(): void {
  const store = loadStore();
  const config = loadConfig();

  if (!store.lastResult) {
    console.log("No analysis data. Run 'cc-proficiency analyze' first.");
    return;
  }

  // Try to load remote achievements
  let unlockedIds: string[] = [];
  if (config.gistId && isGhAuthenticated()) {
    const remoteJson = readGistFile(config.gistId, "cc-proficiency.json");
    const remote = remoteJson ? parseRemoteStore(remoteJson) : null;
    if (remote) {
      unlockedIds = remote.achievements.map((a) => a.id);
    }
  }

  // Build context from local data
  const result = store.lastResult;
  const ctx = {
    totalSessions: result.sessionCount,
    totalHours: result.features.totalHours,
    totalProjects: result.projectCount,
    domains: result.domains,
    streak: { current: 0, longest: 0 },
    features: result.features,
    activeDates: [],
  };

  // Also check locally
  const newLocal = checkAchievements(ctx, unlockedIds);
  const allUnlocked = new Set([...unlockedIds, ...newLocal]);

  console.log(`\n  Achievements (${allUnlocked.size}/${ACHIEVEMENTS.length})\n`);

  for (const achievement of ACHIEVEMENTS) {
    const unlocked = allUnlocked.has(achievement.id);
    const { current, target } = achievement.progress(ctx);
    const pct = Math.min(100, Math.round((current / target) * 100));
    const bar = progressBar(pct, 12);

    if (unlocked) {
      console.log(`  ${achievement.icon} ${achievement.name.padEnd(18)} ${bar} Done!`);
    } else {
      console.log(`  \u2591  ${achievement.name.padEnd(18)} ${bar} ${current}/${target}`);
    }
  }
  console.log("");
}

// ── Status ──

function cmdStatus(): void {
  const hookLogPath = join(getStoreDir(), "hook.log");
  const queuePath = join(getStoreDir(), "queue.jsonl");
  const store = loadStore();
  const config = loadConfig();

  console.log("\n  cc-proficiency status\n");

  // Config
  console.log(`  Username:    ${config.username ?? "(not set)"}`);
  console.log(`  Gist ID:     ${config.gistId ?? "(not set)"}`);
  console.log(`  Auto-upload: ${config.autoUpload}`);
  console.log(`  Locale:      ${config.locale ?? "en"}`);

  // Store
  console.log(`\n  Sessions processed: ${store.processedSessionIds.length}`);
  console.log(`  Last updated:       ${store.lastUpdated ?? "never"}`);

  // Queue
  const queue = readQueue();
  console.log(`  Queue pending:      ${queue.length}`);

  // Hook log
  if (existsSync(hookLogPath)) {
    const log = readFileSync(hookLogPath, "utf-8").trim().split("\n");
    const recent = log.slice(-10);
    console.log(`\n  Hook log (last ${recent.length} entries):`);
    for (const line of recent) {
      console.log(`    ${line}`);
    }

    // Last hook fire
    const lastQueued = log.filter((l) => l.includes("QUEUED")).pop();
    if (lastQueued) {
      const match = lastQueued.match(/\[(.*?)\]/);
      console.log(`\n  Last hook fired: ${match ? match[1] : "unknown"}`);
    }
  } else {
    console.log("\n  Hook log: no entries yet (hook hasn't fired)");
  }

  // Lock status
  const lockPath = join(getStoreDir(), "queue.lock");
  if (existsSync(lockPath)) {
    try {
      const lockTime = parseInt(readFileSync(lockPath, "utf-8"), 10);
      const age = Math.round((Date.now() - lockTime) / 1000);
      console.log(`  Queue lock:  held (${age}s ago)${age > 60 ? " ← STALE" : ""}`);
    } catch {
      console.log("  Queue lock:  present (unknown age)");
    }
  } else {
    console.log("  Queue lock:  none");
  }

  console.log("");
}

// ── Explain ──

function cmdExplain(): void {
  const store = loadStore();
  if (!store.lastResult) {
    console.log("No analysis data. Run 'cc-proficiency analyze' first.");
    return;
  }

  const result = store.lastResult;
  const sorted = [...result.domains].sort((a, b) => b.score - a.score);
  const weakest = [...result.domains].sort((a, b) => a.score - b.score);

  console.log(`\n  Claude Code Proficiency — @${result.username}\n`);

  console.log("  Strengths:");
  for (const d of sorted) {
    console.log(`    ${d.label.padEnd(14)} ${d.score}/100`);
  }

  const tips: Record<string, string> = {
    "cc-mastery": "Enhance CLAUDE.md with imports, add hooks with matchers, create rules files, use plan mode",
    "tool-mcp": "Chain tools deliberately (Grep→Read→Edit), set up MCP servers, use LSP integration",
    "agentic": "Use subagents with different types (Explore, Plan), try parallel agents and worktrees",
    "prompt-craft": "Structure prompts with markdown lists, provide code blocks and file references",
    "context-mgmt": "Use cross-session memory files, work across multiple projects, update CLAUDE.md",
  };

  console.log("\n  Areas to Improve:");
  for (let i = 0; i < Math.min(2, weakest.length); i++) {
    const d = weakest[i]!;
    console.log(`    ${d.label} (${d.score}/100)`);
    console.log(`       → ${tips[d.id] ?? "Practice using this feature area"}`);
  }

  // Feature inventory detail
  const f = result.features;
  console.log("\n  Feature Usage:");
  if (f.hooks.length > 0)
    console.log(`    Hooks:  ${f.hooks.map((h) => `${h.name} (${h.count}x)`).join(", ")}`);
  if (f.skills.length > 0)
    console.log(`    Skills: ${f.skills.map((s) => `${s.name} (${s.count}x)`).join(", ")}`);
  if (f.mcpServers.length > 0)
    console.log(`    MCP:    ${f.mcpServers.join(", ")}`);
  console.log(`    Tools:  ${f.topTools.map((t) => `${t.name} (${t.count})`).join(", ")} +${f.uniqueToolCount - f.topTools.length} more`);
  console.log(`    Flags:  ${f.usedPlanMode ? "✓ Plan" : "✗ Plan"}  ${f.hasMemory ? "✓ Memory" : "✗ Memory"}  ${f.hasRules ? "✓ Rules" : "✗ Rules"}`);

  console.log(`\n  ${result.sessionCount} sessions · ${result.projectCount} projects\n`);
}

// ── Config ──

function cmdConfig(args: string[]): void {
  const config = loadConfig();

  if (args.length === 0) {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (args.length === 1) {
    const key = args[0] as keyof typeof config;
    if (key in config) {
      console.log(`${key}: ${JSON.stringify(config[key])}`);
    } else {
      console.log(`Unknown key: ${key}`);
    }
    return;
  }

  const [key, value] = args;
  if (key === "username") config.username = value;
  else if (key === "gistId") config.gistId = value;
  else if (key === "autoUpload") config.autoUpload = value === "true";
  else if (key === "public") config.public = value === "true";
  else if (key === "locale") config.locale = value;
  else {
    console.log(`Unknown key: ${key}`);
    return;
  }

  saveConfig(config);
  console.log(`Set ${key} = ${value}`);
}

// ── Uninstall ──

function cmdUninstall(): void {
  console.log("Uninstalling cc-proficiency...\n");

  // Remove hook from settings.json
  const settingsPath = join(CLAUDE_DIR, "settings.json");
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      if (settings.hooks?.Stop) {
        settings.hooks.Stop = (settings.hooks.Stop as Array<{ hooks?: Array<{ command?: string }> }>).filter((group) =>
          !group.hooks?.some((h) => h.command?.includes("cc-proficiency"))
        );
        if (settings.hooks.Stop.length === 0) {
          delete settings.hooks.Stop;
        }
        if (Object.keys(settings.hooks).length === 0) {
          delete settings.hooks;
        }
        writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
        console.log("  ✓ Hook removed from settings.json");
      }
    } catch {
      console.log("  ⚠ Could not update settings.json");
    }
  }

  // Remove local data
  const storeDir = getStoreDir();
  if (existsSync(storeDir)) {
    try {
      const files = readdirSync(storeDir);
      for (const f of files) {
        unlinkSync(join(storeDir, f));
      }
      rmdirSync(storeDir);
      console.log("  ✓ Local data removed");
    } catch {
      console.log("  ⚠ Could not fully remove " + storeDir);
    }
  }

  console.log("\n  cc-proficiency uninstalled. Run 'npm uninstall -g cc-proficiency' to remove the package.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
