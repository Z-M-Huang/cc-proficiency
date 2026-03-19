import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { parseTranscript } from "../../parsers/transcript-parser.js";
import { parseClaudeConfig, buildSetupChecklist } from "../../parsers/config-parser.js";
import { computeProficiency } from "../../scoring/engine.js";
import { loadStore, isSessionProcessed, loadConfig } from "../../store/local-store.js";
import { isGhAuthenticated } from "../../gist/uploader.js";
import { mergeRemoteConfig } from "../../store/config-sync.js";
import type { ParsedSession } from "../../types.js";
import type { ConfigSignals } from "../../parsers/config-parser.js";

const CLAUDE_DIR = join(homedir(), ".claude");

export async function gatherData(full: boolean): Promise<{ sessions: ParsedSession[]; config: ConfigSignals }> {
  const realStore = loadStore();
  const knownCwds = [...new Set([process.cwd(), ...(realStore.knownProjectCwds ?? [])])];
  const config = getConfigWithSync(knownCwds);
  const sessions: ParsedSession[] = [];
  const store = full ? { processedSessionIds: [] as string[] } : realStore;

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

export async function gatherAllProcessedSessions(store: ReturnType<typeof loadStore>): Promise<ParsedSession[]> {
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

export function getConfigWithSync(cwds?: string[]): ConfigSignals {
  let config = parseClaudeConfig(cwds);
  const userConfig = loadConfig();
  if (userConfig.gistId && isGhAuthenticated()) {
    config = mergeRemoteConfig(config, userConfig.gistId);
  }
  return config;
}

export function runAnalysis(
  sessions: ParsedSession[],
  config: ConfigSignals,
  username: string
): ReturnType<typeof computeProficiency> {
  const setupChecklist = buildSetupChecklist(config);
  return computeProficiency(sessions, config, username, setupChecklist);
}
