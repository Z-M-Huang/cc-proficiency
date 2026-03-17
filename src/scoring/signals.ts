import type {
  NormalizedEvent,
  ToolCallEvent,
  UserPromptEvent,
  ExtractedSignals,
  CCMasterySignals,
  ToolMcpSignals,
  AgenticSignals,
  PromptCraftSignals,
  ContextMgmtSignals,
  OutcomeSignals,
  ParsedSession,
} from "../types.js";
import type { ConfigSignals } from "../parsers/config-parser.js";
import {
  countParallelToolCalls,
  countDeliberateWorkflows,
} from "../parsers/transcript-parser.js";

/**
 * Extract all signals from parsed sessions + config.
 */
export function extractSignals(
  sessions: ParsedSession[],
  config: ConfigSignals
): ExtractedSignals {
  const allEvents = sessions.flatMap((s) => s.events);

  return {
    ccMastery: extractCCMasterySignals(allEvents, config),
    toolMcp: extractToolMcpSignals(allEvents, config),
    agentic: extractAgenticSignals(allEvents, sessions),
    promptCraft: extractPromptCraftSignals(allEvents),
    contextMgmt: extractContextMgmtSignals(sessions, config),
    outcomes: extractOutcomeSignals(allEvents),
  };
}

function extractCCMasterySignals(
  events: NormalizedEvent[],
  config: ConfigSignals
): CCMasterySignals {
  const toolCalls = events.filter((e) => e.kind === "tool_call") as ToolCallEvent[];

  // Check which plugins were actually used in transcripts
  const toolNames = new Set(toolCalls.map((tc) => tc.toolName));
  const pluginToolPrefixes = config.pluginNames.map((name) => {
    const parts = name.split("@");
    return parts[0]!;
  });
  let pluginsUsed = 0;
  for (const prefix of pluginToolPrefixes) {
    if ([...toolNames].some((t) => t.toLowerCase().includes(prefix.toLowerCase()))) {
      pluginsUsed++;
    }
  }

  // Unique skills
  const skillCalls = toolCalls.filter((tc) => tc.toolName === "Skill");
  const uniqueSkills = new Set(
    skillCalls.map((tc) => String(tc.input?.skill ?? ""))
  );

  // Plan mode
  const userPrompts = events.filter((e) => e.kind === "user_prompt") as UserPromptEvent[];
  const usedPlanMode = userPrompts.some((p) => p.permissionMode === "plan");

  return {
    hasGlobalClaudeMd: config.hasGlobalClaudeMd,
    globalClaudeMdHasImports: config.globalClaudeMdHasImports,
    projectClaudeMdCount: config.projectClaudeMdCount,
    hasCustomHooks: config.hasCustomHooks,
    hookWithMatcherCount: config.hookWithMatcherCount,
    pluginCount: config.pluginCount,
    pluginsUsedInTranscripts: pluginsUsed,
    uniqueSkillsUsed: uniqueSkills.size,
    usedPlanMode,
    hasRulesFiles: config.hasRulesFiles,
  };
}

function extractToolMcpSignals(
  events: NormalizedEvent[],
  _config: ConfigSignals
): ToolMcpSignals {
  const toolCalls = events.filter((e) => e.kind === "tool_call") as ToolCallEvent[];
  const uniqueTools = new Set(toolCalls.map((tc) => tc.toolName));

  // MCP servers — tools prefixed with mcp__
  const mcpTools = toolCalls.filter((tc) => tc.toolName.startsWith("mcp__"));
  const mcpServers = new Set(
    mcpTools.map((tc) => {
      // mcp__serverName__toolName → serverName
      const parts = tc.toolName.split("__");
      return parts.length >= 2 ? parts[1]! : tc.toolName;
    })
  );

  // LSP tool calls
  const lspCalls = toolCalls.filter((tc) => tc.toolName === "LSP");

  // Edit success rate: edits NOT followed by another edit within 2 tool calls
  const editCalls = toolCalls.filter(
    (tc) => tc.toolName === "Edit" || tc.toolName === "Write"
  );
  let successfulEdits = 0;
  for (let i = 0; i < editCalls.length; i++) {
    const editIdx = toolCalls.indexOf(editCalls[i]!);
    const next1 = toolCalls[editIdx + 1];
    const next2 = toolCalls[editIdx + 2];
    const isCorrectiveReEdit =
      (next1?.toolName === "Edit" || next1?.toolName === "Write") ||
      (next2?.toolName === "Edit" && next1?.toolName === "Read");
    if (!isCorrectiveReEdit) {
      successfulEdits++;
    }
  }

  return {
    uniqueToolsUsed: uniqueTools.size,
    uniqueMcpServersUsed: mcpServers.size,
    lspToolCallCount: lspCalls.length,
    deliberateWorkflowCount: countDeliberateWorkflows(events),
    editSuccessRate: editCalls.length > 0 ? successfulEdits / editCalls.length : 0.5, // neutral when no data
    totalToolCalls: toolCalls.length,
  };
}

function extractAgenticSignals(
  events: NormalizedEvent[],
  sessions: ParsedSession[]
): AgenticSignals {
  const toolCalls = events.filter((e) => e.kind === "tool_call") as ToolCallEvent[];

  // Subagents
  const agentCalls = toolCalls.filter((tc) => tc.toolName === "Agent");
  const subagentTypes = new Set(
    agentCalls.map((tc) => String(tc.input?.subagent_type ?? "general-purpose"))
  );

  // Worktree
  const usedWorktree = toolCalls.some(
    (tc) => tc.toolName === "EnterWorktree" || tc.toolName === "ExitWorktree"
  );

  // Task management
  const usedTaskMgmt = toolCalls.some(
    (tc) => tc.toolName === "TaskCreate" || tc.toolName === "TaskUpdate"
  );

  // Multi-session projects
  const projectSessions = new Map<string, Set<string>>();
  for (const session of sessions) {
    const existing = projectSessions.get(session.project) ?? new Set();
    existing.add(session.sessionId);
    projectSessions.set(session.project, existing);
  }
  const multiSessionProjects = [...projectSessions.values()].filter(
    (s) => s.size > 1
  ).length;

  return {
    uniqueSubagentTypes: subagentTypes.size,
    totalSubagentCalls: agentCalls.length,
    parallelToolCallCount: countParallelToolCalls(events),
    usedWorktree,
    multiSessionProjectCount: multiSessionProjects,
    usedTaskManagement: usedTaskMgmt,
  };
}

function extractPromptCraftSignals(
  events: NormalizedEvent[]
): PromptCraftSignals {
  const userPrompts = events.filter(
    (e) => e.kind === "user_prompt"
  ) as UserPromptEvent[];

  // Structured prompts (contain markdown indicators)
  const structuredCount = userPrompts.filter((p) => {
    const c = p.content;
    return (
      c.includes("- ") ||
      c.includes("* ") ||
      c.includes("1. ") ||
      c.includes("## ") ||
      c.includes("```") ||
      c.includes("| ")
    );
  }).length;

  // Iterative refinement: consecutive prompts in same session that refine
  // (not just any consecutive prompt — look for refinement patterns)
  let refinementCount = 0;
  for (let i = 1; i < userPrompts.length; i++) {
    const prev = userPrompts[i - 1]!;
    const curr = userPrompts[i]!;
    if (curr.sessionId !== prev.sessionId) continue;
    // Refinement indicators: references to prior work, corrections, adjustments
    const c = curr.content.toLowerCase();
    const isRefinement =
      c.includes("instead") ||
      c.includes("actually") ||
      c.includes("change") ||
      c.includes("also") ||
      c.includes("but ") ||
      c.includes("wait") ||
      c.includes("no,") ||
      c.includes("not that") ||
      c.includes("update") ||
      c.includes("fix") ||
      c.includes("modify");
    if (isRefinement) refinementCount++;
  }

  // Unique commands (from prompt content starting with /)
  const commands = new Set<string>();
  for (const p of userPrompts) {
    if (p.content.startsWith("/")) {
      const cmd = p.content.split(" ")[0]!;
      commands.add(cmd);
    }
  }

  // Context provision: prompts with code blocks, file references, or error traces
  // (not just long prompts — look for actual context signals)
  const contextCount = userPrompts.filter((p) => {
    const c = p.content;
    const hasCodeBlock = c.includes("```");
    const hasFilePath = /[\w/\\]+\.\w{1,4}/.test(c) && (c.includes("/") || c.includes("\\"));
    const hasErrorTrace = c.includes("Error:") || c.includes("error:") || c.includes("at ") && c.includes("(");
    // Require at least one concrete context signal, not just length
    return hasCodeBlock || hasFilePath || hasErrorTrace;
  }).length;

  return {
    structuredPromptRatio:
      userPrompts.length > 0 ? structuredCount / userPrompts.length : 0,
    iterativeRefinementCount: refinementCount,
    uniqueCommandsUsed: commands.size,
    contextProvisionCount: contextCount,
    totalPrompts: userPrompts.length,
  };
}

function extractContextMgmtSignals(
  sessions: ParsedSession[],
  config: ConfigSignals
): ContextMgmtSignals {
  const projects = new Set(sessions.map((s) => s.project));

  // Session durations in minutes
  const durations = sessions
    .map((s) => {
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      if (isNaN(start) || isNaN(end)) return 0;
      return (end - start) / 60000;
    })
    .filter((d) => d > 0);

  return {
    memoryFileCount: config.memoryFileCount,
    activeMemoryFiles: config.activeMemoryFileCount,
    projectCount: projects.size,
    sessionCount: sessions.length,
    sessionDurations: durations,
  };
}

function extractOutcomeSignals(events: NormalizedEvent[]): OutcomeSignals {
  const toolCalls = events.filter((e) => e.kind === "tool_call") as ToolCallEvent[];
  const toolResults = events.filter((e) => e.kind === "tool_result");

  // Edit acceptance rate
  const editCalls = toolCalls.filter(
    (tc) => tc.toolName === "Edit" || tc.toolName === "Write"
  );
  let cleanEdits = 0;
  for (let i = 0; i < editCalls.length; i++) {
    const editIdx = toolCalls.indexOf(editCalls[i]!);
    const next = toolCalls[editIdx + 1];
    if (!next || (next.toolName !== "Edit" && next.toolName !== "Write")) {
      cleanEdits++;
    }
  }
  const editAcceptanceRate =
    editCalls.length > 0 ? cleanEdits / editCalls.length : 0.5; // neutral when no data

  // Error recovery: errors followed by non-error results
  const errors = toolResults.filter((r) => r.kind === "tool_result" && (r as { isError: boolean }).isError);
  let recoveries = 0;
  for (const err of errors) {
    const errIdx = events.indexOf(err);
    // Look ahead for successful operations
    for (let j = errIdx + 1; j < Math.min(errIdx + 5, events.length); j++) {
      if (events[j]?.kind === "tool_result" && !(events[j] as { isError: boolean }).isError) {
        recoveries++;
        break;
      }
    }
  }
  const errorRecoveryRate = errors.length > 0 ? recoveries / errors.length : 0.5; // neutral when no data

  // Permission mode progression
  const userPrompts = events.filter(
    (e) => e.kind === "user_prompt"
  ) as UserPromptEvent[];
  const modes = userPrompts
    .map((p) => p.permissionMode)
    .filter(Boolean) as string[];
  let progression = 0;
  if (modes.length > 1) {
    const hasBypass = modes.includes("bypassPermissions");
    const hasDefault = modes.some((m) => m !== "bypassPermissions" && m !== "plan");
    if (hasBypass && hasDefault) progression = 0.5; // mixed usage
    if (hasBypass && !hasDefault) progression = -0.5; // always bypass
    if (!hasBypass) progression = 1; // responsible defaults
  }

  return {
    editAcceptanceRate,
    permissionModeProgression: progression,
    errorRecoveryRate,
    repeatFailureRate: 0,
  };
}
