import type {
  RawTranscriptEntry,
  NormalizedEvent,
  ContentBlock,
} from "../types.js";

/**
 * Normalize a raw JSONL transcript entry into an internal NormalizedEvent.
 * Unknown types → UnknownEvent (logged, not crashed).
 * Missing fields → undefined (signal extractors handle gracefully).
 */
export function normalizeEntry(raw: RawTranscriptEntry): NormalizedEvent[] {
  const base = {
    sessionId: raw.sessionId ?? "",
    timestamp: raw.timestamp ?? "",
  };

  switch (raw.type) {
    case "user":
      return normalizeUserEntry(raw, base);
    case "assistant":
      return normalizeAssistantEntry(raw, base);
    case "progress":
      return normalizeProgressEntry(raw, base);
    case "system":
      return normalizeSystemEntry(raw, base);
    case "file-history-snapshot":
      return [{ kind: "file_snapshot", ...base }];
    default:
      return [{ kind: "unknown", ...base, rawType: raw.type ?? "undefined" }];
  }
}

function normalizeUserEntry(
  raw: RawTranscriptEntry,
  base: { sessionId: string; timestamp: string }
): NormalizedEvent[] {
  const events: NormalizedEvent[] = [];
  const msg = raw.message;
  if (!msg) return events;

  // User prompt (string content = actual user message)
  if (typeof msg.content === "string") {
    events.push({
      kind: "user_prompt",
      ...base,
      content: msg.content,
      permissionMode: raw.permissionMode,
    });
    return events;
  }

  // Tool results (array content)
  if (Array.isArray(msg.content)) {
    for (const block of msg.content) {
      if (block.type === "tool_result") {
        events.push({
          kind: "tool_result",
          ...base,
          toolId: block.tool_use_id ?? "",
          isError: block.is_error === true,
        });
      }
    }
  }

  return events;
}

function normalizeAssistantEntry(
  raw: RawTranscriptEntry,
  base: { sessionId: string; timestamp: string }
): NormalizedEvent[] {
  const events: NormalizedEvent[] = [];
  const msg = raw.message;
  if (!msg || !Array.isArray(msg.content)) return events;

  for (const block of msg.content as ContentBlock[]) {
    if (block.type === "tool_use" && block.name) {
      events.push({
        kind: "tool_call",
        ...base,
        toolName: block.name,
        toolId: block.id ?? "",
        input: (block.input as Record<string, unknown>) ?? {},
        callerType: block.caller?.type,
      });
    }
  }

  return events;
}

function normalizeProgressEntry(
  raw: RawTranscriptEntry,
  base: { sessionId: string; timestamp: string }
): NormalizedEvent[] {
  if (raw.data?.type === "hook_progress") {
    return [
      {
        kind: "hook_progress",
        ...base,
        hookEvent: raw.data.hookEvent ?? "",
        hookName: raw.data.hookName ?? "",
        command: raw.data.command ?? "",
      },
    ];
  }
  return [{ kind: "unknown", ...base, rawType: `progress:${raw.data?.type ?? "unknown"}` }];
}

function normalizeSystemEntry(
  raw: RawTranscriptEntry,
  base: { sessionId: string; timestamp: string }
): NormalizedEvent[] {
  if (raw.subtype === "stop_hook_summary") {
    return [
      {
        kind: "system_stop",
        ...base,
        hookCount: raw.hookCount ?? 0,
        preventedContinuation: raw.preventedContinuation ?? false,
      },
    ];
  }
  return [{ kind: "unknown", ...base, rawType: `system:${raw.subtype ?? "unknown"}` }];
}
