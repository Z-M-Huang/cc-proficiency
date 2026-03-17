import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { RawTranscriptEntry, NormalizedEvent, ParsedSession } from "../types.js";
import { normalizeEntry } from "./normalizer.js";

/**
 * Parse a session transcript JSONL file using streaming (handles 10MB+ files).
 * Per-line try/catch: malformed lines are skipped with warning.
 */
export async function parseTranscript(filePath: string): Promise<ParsedSession> {
  const events: NormalizedEvent[] = [];
  let sessionId = "";
  let version = "";
  let project = "";
  let firstTimestamp = "";
  let lastTimestamp = "";

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const raw: RawTranscriptEntry = JSON.parse(line);

      // Extract session metadata from first entry
      if (!sessionId && raw.sessionId) {
        sessionId = raw.sessionId;
      }
      if (!version && raw.version) {
        version = raw.version;
      }
      if (!project && raw.cwd) {
        project = sanitizeProjectSlug(raw.cwd);
      }
      if (!firstTimestamp && raw.timestamp) {
        firstTimestamp = raw.timestamp;
      }
      if (raw.timestamp) {
        lastTimestamp = raw.timestamp;
      }

      const normalized = normalizeEntry(raw);
      events.push(...normalized);
    } catch {
      // Malformed line — skip silently (could log to error.log in production)
    }
  }

  return {
    sessionId,
    startTime: firstTimestamp,
    endTime: lastTimestamp,
    project,
    events,
    version,
  };
}

/**
 * Sanitize a cwd path into a project slug.
 * "/app/my-project" → "my-project"
 * Strips leading path components, keeps only the last segment.
 */
export function sanitizeProjectSlug(cwd: string): string {
  const parts = cwd.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "unknown";
}

/**
 * Count parallel tool calls in a session.
 * Multiple tool_call events with the same timestamp in a single assistant turn.
 */
export function countParallelToolCalls(events: NormalizedEvent[]): number {
  const toolCalls = events.filter((e) => e.kind === "tool_call");
  if (toolCalls.length < 2) return 0;

  let parallelCount = 0;
  const byTimestamp = new Map<string, number>();

  for (const tc of toolCalls) {
    const count = (byTimestamp.get(tc.timestamp) ?? 0) + 1;
    byTimestamp.set(tc.timestamp, count);
  }

  for (const count of byTimestamp.values()) {
    if (count > 1) {
      parallelCount += count;
    }
  }

  return parallelCount;
}

/**
 * Detect deliberate tool chaining workflows.
 * E.g., Grep → Read → Edit sequences.
 */
export function countDeliberateWorkflows(events: NormalizedEvent[]): number {
  const toolCalls = events.filter((e) => e.kind === "tool_call");
  let workflowCount = 0;

  for (let i = 0; i < toolCalls.length - 2; i++) {
    const a = toolCalls[i] as { toolName: string };
    const b = toolCalls[i + 1] as { toolName: string };
    const c = toolCalls[i + 2] as { toolName: string };

    // Grep/Glob → Read → Edit/Write
    if (
      (a.toolName === "Grep" || a.toolName === "Glob") &&
      b.toolName === "Read" &&
      (c.toolName === "Edit" || c.toolName === "Write")
    ) {
      workflowCount++;
    }
  }

  return workflowCount;
}
