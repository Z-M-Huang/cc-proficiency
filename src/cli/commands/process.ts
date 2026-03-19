import { existsSync } from "node:fs";
import { parseTranscript } from "../../parsers/transcript-parser.js";
import { buildSetupChecklist } from "../../parsers/config-parser.js";
import { computeProficiency } from "../../scoring/engine.js";
import { renderBadge } from "../../renderer/svg.js";
import { loadStore, saveStore, isSessionProcessed, loadConfig, saveBadge, logError, upsertTokenLog, computeTokenWindows } from "../../store/local-store.js";
import { readQueue, writeQueue, acquireLock, releaseLock } from "../../store/queue.js";
import { isGhAuthenticated, readGistFile } from "../../gist/uploader.js";
import { getConfigWithSync, gatherAllProcessedSessions } from "../services/sessions.js";
import { mergeAndPush } from "../services/publishing.js";
import { getConfigLocale } from "../utils/locale.js";
import { buildSnapshotPayload, parseSnapshotsFile } from "../../store/config-sync.js";
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

    // Always persist queue cwds, even if no new sessions scored
    const queueCwds = queue.map((e) => e.cwd).filter(Boolean);
    const knownCwds = store.knownProjectCwds ?? [];
    const allCwds = [...new Set([...knownCwds, ...queueCwds])];
    store.knownProjectCwds = allCwds;

    if (newSessions.length > 0) {
      // Build token log entries from newly parsed sessions
      upsertTokenLog(store, newSessions.map((s) => ({
        sessionId: s.sessionId,
        timestamp: s.endTime,
        tokens: s.totalTokens,
      })));

      const config = getConfigWithSync(allCwds.length > 0 ? allCwds : undefined);
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

      // Save local badge first (always works, even offline)
      const tokenWindows = computeTokenWindows(store.tokenLog);
      const svg = renderBadge(result, getConfigLocale(), tokenWindows);
      const badgePath = saveBadge(svg);

      // Push SVG + JSON atomically (preserves achievements/streak)
      if (userConfig.autoUpload && userConfig.gistId && isGhAuthenticated()) {
        // Build config snapshot from already-computed config (no re-scan)
        const existing = readGistFile(userConfig.gistId, "config-snapshots.json");
        const parsed = existing ? parseSnapshotsFile(existing) : null;
        const configSnapshotJson = JSON.stringify(buildSnapshotPayload(parsed, config));

        const pushResult = mergeAndPush(
          store,
          result,
          userConfig.gistId,
          userConfig.username ?? "unknown",
          false,
          configSnapshotJson
        );
        if (!pushResult.success) {
          logError(`Gist push failed: ${pushResult.error}`);
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
