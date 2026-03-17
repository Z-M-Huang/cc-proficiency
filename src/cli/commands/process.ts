import { existsSync } from "node:fs";
import { parseTranscript } from "../../parsers/transcript-parser.js";
import { parseClaudeConfig, buildSetupChecklist } from "../../parsers/config-parser.js";
import { computeProficiency } from "../../scoring/engine.js";
import { renderBadge } from "../../renderer/svg.js";
import { loadStore, saveStore, isSessionProcessed, loadConfig, saveBadge, logError } from "../../store/local-store.js";
import { readQueue, writeQueue, acquireLock, releaseLock } from "../../store/queue.js";
import { isGhAuthenticated, updateGist } from "../../gist/uploader.js";
import { gatherAllProcessedSessions } from "../services/sessions.js";
import { getConfigLocale } from "../utils/locale.js";
import type { ParsedSession } from "../../types.js";

export async function cmdProcess(): Promise<void> {
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

      const svg = renderBadge(result, getConfigLocale());
      const badgePath = saveBadge(svg);

      if (userConfig.autoUpload && userConfig.gistId && isGhAuthenticated()) {
        const gistResult = updateGist(userConfig.gistId, svg);
        if (!gistResult.success) {
          logError(`Gist push failed: ${gistResult.error}`);
        }
      }

      console.log(`Processed ${newSessions.length} session(s). Badge saved to ${badgePath}`);
    }

    writeQueue(new Set(processed));
    saveStore(store);
  } finally {
    releaseLock();
  }
}
