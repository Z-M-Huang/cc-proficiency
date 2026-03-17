import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { HistoryEntry } from "../types.js";

export interface HistorySignals {
  totalEntries: number;
  uniqueProjects: Set<string>;
  uniqueCommands: Set<string>;
  pastedContentCount: number;
  sessionIds: Set<string>;
}

/**
 * Parse ~/.claude/history.jsonl to extract usage signals.
 * Streaming line-by-line with per-line error handling.
 */
export async function parseHistory(filePath: string): Promise<HistorySignals> {
  const result: HistorySignals = {
    totalEntries: 0,
    uniqueProjects: new Set(),
    uniqueCommands: new Set(),
    pastedContentCount: 0,
    sessionIds: new Set(),
  };

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const entry: HistoryEntry = JSON.parse(line);
      result.totalEntries++;

      if (entry.project) {
        result.uniqueProjects.add(entry.project);
      }
      if (entry.sessionId) {
        result.sessionIds.add(entry.sessionId);
      }

      // Slash commands (display starts with /)
      if (entry.display && entry.display.startsWith("/")) {
        const command = entry.display.split(" ")[0]!;
        result.uniqueCommands.add(command);
      }

      // Pasted content
      if (entry.pastedContents && Object.keys(entry.pastedContents).length > 0) {
        result.pastedContentCount++;
      }
    } catch {
      // Malformed line — skip
    }
  }

  return result;
}
