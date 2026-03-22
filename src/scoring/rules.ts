import type { DomainId, NormalizedEvent, ToolCallEvent, UserPromptEvent } from "../types.js";
import type { ConfigSignals } from "../parsers/config-parser.js";

// ── Rule Types ──

export type FeatureTag = "hooks" | "plugins" | "skills" | "mcp" | "agents" | "plan" | "memory" | "rules";
export type EvidenceType = "config" | "behavior";
export type RuleTier = "beginner" | "intermediate" | "advanced" | "anti-pattern";

export interface ScoringRule {
  id: string;
  domain: DomainId;
  tier: RuleTier;
  points: number; // negative for anti-patterns
  featureTags: FeatureTag[];
  evidenceType: EvidenceType;
  maxPerSession: number; // cap per session to prevent gaming
  reason: string;
  detect: (ctx: RuleContext) => number; // returns number of times rule fires (0 = didn't fire)
}

export interface RuleContext {
  events: NormalizedEvent[];
  config: ConfigSignals;
  sessionCount: number;
  projectCount: number;
  projectSessionCounts: Map<string, number>;
}

export interface RuleFire {
  ruleId: string;
  domain: DomainId;
  tier: RuleTier;
  points: number;
  featureTags: FeatureTag[];
  evidenceType: EvidenceType;
  count: number; // times fired (capped by maxPerSession)
}

// ── Helper: get tool calls from events ──
function toolCalls(events: NormalizedEvent[]): ToolCallEvent[] {
  return events.filter((e) => e.kind === "tool_call") as ToolCallEvent[];
}

function userPrompts(events: NormalizedEvent[]): UserPromptEvent[] {
  return events.filter((e) => e.kind === "user_prompt") as UserPromptEvent[];
}

// ── All Rules ──

export const RULES: ScoringRule[] = [

  // ═══════════════════════════════════════
  // DOMAIN 1: CC MASTERY (18 rules)
  // ═══════════════════════════════════════

  // Config-based (available immediately)
  {
    id: "ccm-claudemd-exists",
    domain: "cc-mastery", tier: "beginner", points: 5, featureTags: [],
    evidenceType: "config", maxPerSession: 1, reason: "Has global CLAUDE.md",
    detect: (ctx) => ctx.config.hasGlobalClaudeMd ? 1 : 0,
  },
  {
    id: "ccm-claudemd-structured",
    domain: "cc-mastery", tier: "intermediate", points: 10, featureTags: [],
    evidenceType: "config", maxPerSession: 1, reason: "CLAUDE.md has imports/structured sections",
    detect: (ctx) => ctx.config.globalClaudeMdHasImports ? 1 : 0,
  },
  {
    id: "ccm-project-claudemd",
    domain: "cc-mastery", tier: "intermediate", points: 10, featureTags: [],
    evidenceType: "config", maxPerSession: 1, reason: "Has project-level CLAUDE.md",
    detect: (ctx) => ctx.config.projectClaudeMdCount > 0 ? 1 : 0,
  },
  {
    id: "ccm-hooks-exist",
    domain: "cc-mastery", tier: "intermediate", points: 10, featureTags: ["hooks"],
    evidenceType: "config", maxPerSession: 1, reason: "Has custom hooks configured",
    detect: (ctx) => ctx.config.hasCustomHooks ? 1 : 0,
  },
  {
    id: "ccm-hooks-with-matchers",
    domain: "cc-mastery", tier: "advanced", points: 15, featureTags: ["hooks"],
    evidenceType: "config", maxPerSession: 1, reason: "Hooks with specific tool matchers (e.g., PreToolUse:Edit)",
    detect: (ctx) => ctx.config.hookWithMatcherCount >= 2 ? 1 : 0,
  },
  {
    id: "ccm-plugins-installed",
    domain: "cc-mastery", tier: "beginner", points: 5, featureTags: ["plugins"],
    evidenceType: "config", maxPerSession: 1, reason: "Has plugins installed",
    detect: (ctx) => ctx.config.pluginCount >= 1 ? 1 : 0,
  },
  {
    id: "ccm-plugins-diverse",
    domain: "cc-mastery", tier: "intermediate", points: 10, featureTags: ["plugins"],
    evidenceType: "config", maxPerSession: 1, reason: "5+ plugins installed (diverse ecosystem)",
    detect: (ctx) => ctx.config.pluginCount >= 5 ? 1 : 0,
  },
  {
    id: "ccm-rules-files",
    domain: "cc-mastery", tier: "advanced", points: 10, featureTags: ["rules"],
    evidenceType: "config", maxPerSession: 1, reason: "Has .claude/rules/ files configured",
    detect: (ctx) => ctx.config.hasRulesFiles ? 1 : 0,
  },
  {
    id: "ccm-custom-agents",
    domain: "cc-mastery", tier: "advanced", points: 10, featureTags: ["agents"],
    evidenceType: "config", maxPerSession: 1, reason: "Has custom agent definitions (.claude/agents/)",
    detect: (ctx) => ctx.config.hasCustomAgents ? 1 : 0,
  },
  {
    id: "ccm-custom-skills",
    domain: "cc-mastery", tier: "advanced", points: 10, featureTags: ["skills"],
    evidenceType: "config", maxPerSession: 1, reason: "Has custom skill definitions (.claude/skills/)",
    detect: (ctx) => ctx.config.hasCustomSkills ? 1 : 0,
  },
  {
    id: "ccm-effort-high",
    domain: "cc-mastery", tier: "beginner", points: 5, featureTags: [],
    evidenceType: "config", maxPerSession: 1, reason: "Effort level set to high",
    detect: (ctx) => ctx.config.effortLevel === "high" ? 1 : 0,
  },

  // Behavior-based (need transcripts)
  {
    id: "ccm-plan-mode-used",
    domain: "cc-mastery", tier: "intermediate", points: 10, featureTags: ["plan"],
    evidenceType: "behavior", maxPerSession: 1, reason: "Used plan mode for deliberate design",
    detect: (ctx) => userPrompts(ctx.events).some((p) => p.permissionMode === "plan") ? 1 : 0,
  },
  {
    id: "ccm-skill-invoked",
    domain: "cc-mastery", tier: "intermediate", points: 10, featureTags: ["skills"],
    evidenceType: "behavior", maxPerSession: 1, reason: "Invoked a skill (slash command)",
    detect: (ctx) => toolCalls(ctx.events).some((tc) => tc.toolName === "Skill") ? 1 : 0,
  },
  {
    id: "ccm-diverse-skills",
    domain: "cc-mastery", tier: "advanced", points: 15, featureTags: ["skills"],
    evidenceType: "behavior", maxPerSession: 1, reason: "Used 3+ different skills",
    detect: (ctx) => {
      const skills = new Set(toolCalls(ctx.events).filter((tc) => tc.toolName === "Skill").map((tc) => String(tc.input?.skill ?? "")));
      return skills.size >= 3 ? 1 : 0;
    },
  },
  {
    id: "ccm-hooks-firing",
    domain: "cc-mastery", tier: "intermediate", points: 10, featureTags: ["hooks"],
    evidenceType: "behavior", maxPerSession: 1, reason: "Hooks actively fire during sessions",
    detect: (ctx) => ctx.events.some((e) => e.kind === "hook_progress" && e.hookEvent !== "SessionStart") ? 1 : 0,
  },

  // ═══════════════════════════════════════
  // DOMAIN 2: TOOL & MCP (16 rules)
  // ═══════════════════════════════════════

  // Beginner
  {
    id: "tool-used-3-types",
    domain: "tool-mcp", tier: "beginner", points: 5, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Used 3+ different tool types",
    detect: (ctx) => new Set(toolCalls(ctx.events).map((tc) => tc.toolName)).size >= 3 ? 1 : 0,
  },
  {
    id: "tool-used-search",
    domain: "tool-mcp", tier: "beginner", points: 5, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Used search tools (Grep or Glob)",
    detect: (ctx) => toolCalls(ctx.events).some((tc) => tc.toolName === "Grep" || tc.toolName === "Glob") ? 1 : 0,
  },

  // Intermediate
  {
    id: "tool-investigation-chain",
    domain: "tool-mcp", tier: "intermediate", points: 15, featureTags: [],
    evidenceType: "behavior", maxPerSession: 3, reason: "Investigation chain: Grep/Glob → Read → Edit",
    detect: (ctx) => {
      const tcs = toolCalls(ctx.events);
      let count = 0;
      for (let i = 0; i < tcs.length - 2; i++) {
        if ((tcs[i]!.toolName === "Grep" || tcs[i]!.toolName === "Glob") &&
            tcs[i + 1]!.toolName === "Read" &&
            (tcs[i + 2]!.toolName === "Edit" || tcs[i + 2]!.toolName === "Write")) {
          count++;
        }
      }
      return count;
    },
  },
  {
    id: "tool-read-before-edit",
    domain: "tool-mcp", tier: "intermediate", points: 10, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Read before Edit (understand before modify)",
    detect: (ctx) => {
      const tcs = toolCalls(ctx.events);
      for (let i = 0; i < tcs.length - 1; i++) {
        if (tcs[i]!.toolName === "Read" && (tcs[i + 1]!.toolName === "Edit" || tcs[i + 1]!.toolName === "Write")) return 1;
      }
      return 0;
    },
  },
  {
    id: "tool-5-types-session",
    domain: "tool-mcp", tier: "intermediate", points: 10, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "5+ tool types in one session (versatility)",
    detect: (ctx) => new Set(toolCalls(ctx.events).map((tc) => tc.toolName)).size >= 5 ? 1 : 0,
  },
  {
    id: "tool-selective-edit",
    domain: "tool-mcp", tier: "intermediate", points: 10, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Selective Edit (replace_all=false, specific old_string)",
    detect: (ctx) => toolCalls(ctx.events).some((tc) =>
      tc.toolName === "Edit" && tc.input?.replace_all === false && typeof tc.input?.old_string === "string" && (tc.input.old_string as string).length > 10
    ) ? 1 : 0,
  },

  // Advanced
  {
    id: "tool-mcp-used",
    domain: "tool-mcp", tier: "advanced", points: 15, featureTags: ["mcp"],
    evidenceType: "behavior", maxPerSession: 1, reason: "Used MCP tools in session",
    detect: (ctx) => toolCalls(ctx.events).some((tc) => tc.toolName.startsWith("mcp__")) ? 1 : 0,
  },
  {
    id: "tool-mcp-multi-server",
    domain: "tool-mcp", tier: "advanced", points: 20, featureTags: ["mcp"],
    evidenceType: "behavior", maxPerSession: 1, reason: "Used 2+ different MCP servers",
    detect: (ctx) => {
      const servers = new Set(toolCalls(ctx.events).filter((tc) => tc.toolName.startsWith("mcp__")).map((tc) => tc.toolName.split("__")[1]));
      return servers.size >= 2 ? 1 : 0;
    },
  },
  {
    id: "tool-lsp-before-edit",
    domain: "tool-mcp", tier: "advanced", points: 15, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "LSP used before file operation (semantic navigation)",
    detect: (ctx) => {
      const tcs = toolCalls(ctx.events);
      for (let i = 0; i < tcs.length - 1; i++) {
        if (tcs[i]!.toolName === "LSP" && (tcs[i + 1]!.toolName === "Read" || tcs[i + 1]!.toolName === "Edit")) return 1;
      }
      return 0;
    },
  },
  {
    id: "tool-mcp-configured",
    domain: "tool-mcp", tier: "intermediate", points: 10, featureTags: ["mcp"],
    evidenceType: "config", maxPerSession: 1, reason: "MCP servers configured",
    detect: (ctx) => ctx.config.hasMcpServers ? 1 : 0,
  },

  // Anti-patterns
  {
    id: "tool-anti-shotgun",
    domain: "tool-mcp", tier: "anti-pattern", points: -10, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Shotgun pattern: 5+ parallel tools with >50% errors",
    detect: (ctx) => {
      const tcs = toolCalls(ctx.events);
      const results = ctx.events.filter((e) => e.kind === "tool_result");
      const byTs = new Map<string, number>();
      for (const tc of tcs) { byTs.set(tc.timestamp, (byTs.get(tc.timestamp) ?? 0) + 1); }
      for (const [ts, count] of byTs) {
        if (count >= 5) {
          const errors = results.filter((r) => r.kind === "tool_result" && r.timestamp === ts && (r as { isError: boolean }).isError).length;
          if (errors / count > 0.5) return 1;
        }
      }
      return 0;
    },
  },

  // ═══════════════════════════════════════
  // DOMAIN 3: AGENTIC (14 rules)
  // ═══════════════════════════════════════

  {
    id: "agent-used",
    domain: "agentic", tier: "beginner", points: 5, featureTags: ["agents"],
    evidenceType: "behavior", maxPerSession: 1, reason: "Used Agent tool",
    detect: (ctx) => toolCalls(ctx.events).some((tc) => tc.toolName === "Agent") ? 1 : 0,
  },
  {
    id: "agent-multi-types",
    domain: "agentic", tier: "intermediate", points: 15, featureTags: ["agents"],
    evidenceType: "behavior", maxPerSession: 1, reason: "Used 2+ different subagent types",
    detect: (ctx) => {
      const types = new Set(toolCalls(ctx.events).filter((tc) => tc.toolName === "Agent").map((tc) => String(tc.input?.subagent_type ?? "general-purpose")));
      return types.size >= 2 ? 1 : 0;
    },
  },
  {
    id: "agent-detailed-prompt",
    domain: "agentic", tier: "intermediate", points: 10, featureTags: ["agents"],
    evidenceType: "behavior", maxPerSession: 1, reason: "Agent call with detailed prompt (>100 chars)",
    detect: (ctx) => toolCalls(ctx.events).some((tc) => tc.toolName === "Agent" && typeof tc.input?.prompt === "string" && (tc.input.prompt as string).length > 100) ? 1 : 0,
  },
  {
    id: "agent-resume",
    domain: "agentic", tier: "advanced", points: 15, featureTags: ["agents"],
    evidenceType: "behavior", maxPerSession: 1, reason: "Resumed an agent (continuing prior work)",
    detect: (ctx) => toolCalls(ctx.events).some((tc) => tc.toolName === "Agent" && tc.input?.resume) ? 1 : 0,
  },
  {
    id: "agent-parallel",
    domain: "agentic", tier: "advanced", points: 20, featureTags: ["agents"],
    evidenceType: "behavior", maxPerSession: 1, reason: "Parallel agents dispatched (same timestamp)",
    detect: (ctx) => {
      const agentCalls = toolCalls(ctx.events).filter((tc) => tc.toolName === "Agent");
      const byTs = new Map<string, number>();
      for (const ac of agentCalls) { byTs.set(ac.timestamp, (byTs.get(ac.timestamp) ?? 0) + 1); }
      return [...byTs.values()].some((c) => c >= 2) ? 1 : 0;
    },
  },
  {
    id: "agent-background",
    domain: "agentic", tier: "intermediate", points: 10, featureTags: ["agents"],
    evidenceType: "behavior", maxPerSession: 1, reason: "Agent with run_in_background (async workflow)",
    detect: (ctx) => toolCalls(ctx.events).some((tc) => tc.toolName === "Agent" && tc.input?.run_in_background === true) ? 1 : 0,
  },
  {
    id: "agent-worktree",
    domain: "agentic", tier: "advanced", points: 15, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Used worktree isolation",
    detect: (ctx) => toolCalls(ctx.events).some((tc) => tc.toolName === "EnterWorktree" || tc.input?.isolation === "worktree") ? 1 : 0,
  },
  {
    id: "agent-task-mgmt",
    domain: "agentic", tier: "intermediate", points: 10, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Used task management (TaskCreate/TaskUpdate)",
    detect: (ctx) => toolCalls(ctx.events).some((tc) => tc.toolName === "TaskCreate" || tc.toolName === "TaskUpdate") ? 1 : 0,
  },
  {
    id: "agent-parallel-tools",
    domain: "agentic", tier: "intermediate", points: 10, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Parallel tool execution (multiple tools same timestamp)",
    detect: (ctx) => {
      const tcs = toolCalls(ctx.events);
      const byTs = new Map<string, number>();
      for (const tc of tcs) { byTs.set(tc.timestamp, (byTs.get(tc.timestamp) ?? 0) + 1); }
      return [...byTs.values()].some((c) => c >= 2) ? 1 : 0;
    },
  },
  {
    id: "agent-multi-session-project",
    domain: "agentic", tier: "intermediate", points: 10, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Multi-session project (sustained work)",
    detect: (ctx) => [...ctx.projectSessionCounts.values()].some((c) => c >= 3) ? 1 : 0,
  },

  // ═══════════════════════════════════════
  // DOMAIN 4: PROMPT CRAFT (14 rules)
  // ═══════════════════════════════════════

  {
    id: "prompt-basic-effort",
    domain: "prompt-craft", tier: "beginner", points: 5, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Prompts with meaningful content (>20 chars avg)",
    detect: (ctx) => {
      const prompts = userPrompts(ctx.events);
      if (prompts.length === 0) return 0;
      const avgLen = prompts.reduce((sum, p) => sum + p.content.length, 0) / prompts.length;
      return avgLen > 20 ? 1 : 0;
    },
  },
  {
    id: "prompt-structured-request",
    domain: "prompt-craft", tier: "intermediate", points: 15, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Structured request with markdown list or numbering",
    detect: (ctx) => userPrompts(ctx.events).some((p) => /[-*]\s.+\n[-*]\s/m.test(p.content) || /\d+\.\s.+\n\d+\.\s/m.test(p.content)) ? 1 : 0,
  },
  {
    id: "prompt-code-block",
    domain: "prompt-craft", tier: "intermediate", points: 15, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Provided code block for context",
    detect: (ctx) => userPrompts(ctx.events).some((p) => p.content.includes("```")) ? 1 : 0,
  },
  {
    id: "prompt-error-trace",
    domain: "prompt-craft", tier: "intermediate", points: 15, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Included error trace for debugging",
    detect: (ctx) => userPrompts(ctx.events).some((p) => /Error:|error:|at\s.+\(/.test(p.content)) ? 1 : 0,
  },
  {
    id: "prompt-file-reference",
    domain: "prompt-craft", tier: "intermediate", points: 10, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Referenced specific file path",
    detect: (ctx) => userPrompts(ctx.events).some((p) => /[\w/\\]+\.\w{1,4}/.test(p.content) && (p.content.includes("/") || p.content.includes("\\"))) ? 1 : 0,
  },
  {
    id: "prompt-iterative-refinement",
    domain: "prompt-craft", tier: "intermediate", points: 10, featureTags: [],
    evidenceType: "behavior", maxPerSession: 3, reason: "Iterative refinement (collaborative correction)",
    detect: (ctx) => {
      const prompts = userPrompts(ctx.events);
      let count = 0;
      for (let i = 1; i < prompts.length; i++) {
        if (prompts[i]!.sessionId !== prompts[i - 1]!.sessionId) continue;
        const c = prompts[i]!.content.toLowerCase();
        if (/instead|actually|change|also|but |wait|no,|not that|update|fix|modify/.test(c)) count++;
      }
      return count;
    },
  },
  {
    id: "prompt-slash-commands",
    domain: "prompt-craft", tier: "advanced", points: 15, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Used 3+ different slash commands",
    detect: (ctx) => {
      const commands = new Set(userPrompts(ctx.events).filter((p) => p.content.startsWith("/")).map((p) => p.content.split(" ")[0]));
      return commands.size >= 3 ? 1 : 0;
    },
  },
  {
    id: "prompt-context-first",
    domain: "prompt-craft", tier: "advanced", points: 15, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Context-first approach: code block + file ref + clear request",
    detect: (ctx) => userPrompts(ctx.events).some((p) => p.content.includes("```") && /[\w/]+\.\w{2,4}/.test(p.content) && p.content.length > 100) ? 1 : 0,
  },

  // Anti-patterns
  {
    id: "prompt-anti-wall-of-text",
    domain: "prompt-craft", tier: "anti-pattern", points: -5, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Wall of text >2000 chars without structure or code",
    detect: (ctx) => userPrompts(ctx.events).some((p) =>
      p.content.length > 2000 && !p.content.includes("```") && !p.content.includes("- ") && !p.content.includes("1. ") && !/Error:|error:/.test(p.content)
    ) ? 1 : 0,
  },

  // ═══════════════════════════════════════
  // DOMAIN 5: CONTEXT MGMT (13 rules)
  // ═══════════════════════════════════════

  // Config-based
  {
    id: "ctx-memory-exists",
    domain: "context-mgmt", tier: "intermediate", points: 10, featureTags: ["memory"],
    evidenceType: "config", maxPerSession: 1, reason: "Has memory files configured",
    detect: (ctx) => ctx.config.hasMemoryFiles ? 1 : 0,
  },
  {
    id: "ctx-memory-active",
    domain: "context-mgmt", tier: "advanced", points: 15, featureTags: ["memory"],
    evidenceType: "config", maxPerSession: 1, reason: "Memory files actively maintained (recent mtime)",
    detect: (ctx) => ctx.config.activeMemoryFileCount >= 2 ? 1 : 0,
  },
  {
    id: "ctx-memory-diverse",
    domain: "context-mgmt", tier: "advanced", points: 15, featureTags: ["memory"],
    evidenceType: "config", maxPerSession: 1, reason: "3+ memory files (rich cross-session context)",
    detect: (ctx) => ctx.config.memoryFileCount >= 3 ? 1 : 0,
  },

  // Behavior-based
  {
    id: "ctx-multi-project",
    domain: "context-mgmt", tier: "beginner", points: 5, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Works on 2+ projects",
    detect: (ctx) => ctx.projectCount >= 2 ? 1 : 0,
  },
  {
    id: "ctx-sustained-project",
    domain: "context-mgmt", tier: "intermediate", points: 15, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Sustained project work (3+ sessions on same project)",
    detect: (ctx) => [...ctx.projectSessionCounts.values()].some((c) => c >= 3) ? 1 : 0,
  },
  {
    id: "ctx-claudemd-consulted",
    domain: "context-mgmt", tier: "intermediate", points: 10, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Read CLAUDE.md during session (checking guidelines)",
    detect: (ctx) => toolCalls(ctx.events).some((tc) =>
      tc.toolName === "Read" && typeof tc.input?.file_path === "string" && (tc.input.file_path as string).includes("CLAUDE.md")
    ) ? 1 : 0,
  },
  {
    id: "ctx-claudemd-updated",
    domain: "context-mgmt", tier: "advanced", points: 20, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Updated CLAUDE.md (evolving project knowledge)",
    detect: (ctx) => toolCalls(ctx.events).some((tc) =>
      tc.toolName === "Edit" && typeof tc.input?.file_path === "string" && (tc.input.file_path as string).includes("CLAUDE.md")
    ) ? 1 : 0,
  },
  {
    id: "ctx-memory-write",
    domain: "context-mgmt", tier: "advanced", points: 15, featureTags: ["memory"],
    evidenceType: "behavior", maxPerSession: 1, reason: "Created/updated memory file during session",
    detect: (ctx) => toolCalls(ctx.events).some((tc) =>
      (tc.toolName === "Write" || tc.toolName === "Edit") &&
      typeof tc.input?.file_path === "string" && (tc.input.file_path as string).includes("memory/")
    ) ? 1 : 0,
  },
  {
    id: "ctx-hooks-engaged",
    domain: "context-mgmt", tier: "intermediate", points: 10, featureTags: ["hooks"],
    evidenceType: "behavior", maxPerSession: 1, reason: "Custom hooks triggered and acknowledged",
    detect: (ctx) => {
      const hookEvents = ctx.events.filter((e) => e.kind === "hook_progress");
      return hookEvents.length >= 3 ? 1 : 0; // multiple hooks firing = active integration
    },
  },
  {
    id: "ctx-session-depth",
    domain: "context-mgmt", tier: "intermediate", points: 10, featureTags: [],
    evidenceType: "behavior", maxPerSession: 1, reason: "Session with 10+ user prompts (deep engagement)",
    detect: (ctx) => userPrompts(ctx.events).length >= 10 ? 1 : 0,
  },
];
