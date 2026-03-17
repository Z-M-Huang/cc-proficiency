import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { parseTranscript } from "../../parsers/transcript-parser.js";
import { parseClaudeConfig, buildSetupChecklist } from "../../parsers/config-parser.js";
import { computeProficiency } from "../../scoring/engine.js";
import { loadStore, isSessionProcessed } from "../../store/local-store.js";
import type { ParsedSession } from "../../types.js";
import type { ConfigSignals } from "../../parsers/config-parser.js";

const CLAUDE_DIR = join(homedir(), ".claude");

export async function gatherData(full: boolean): Promise<{ sessions: ParsedSession[]; config: ConfigSignals }> {
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

export function runAnalysis(
  sessions: ParsedSession[],
  config: ConfigSignals,
  username: string
): ReturnType<typeof computeProficiency> {
  const setupChecklist = buildSetupChecklist(config);
  return computeProficiency(sessions, config, username, setupChecklist);
}
