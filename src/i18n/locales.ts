export type Locale = "en" | "zh-CN";

export interface LocaleStrings {
  title: string;
  calibrating: string;
  needMore: (n: number) => string;
  sessions: string;
  projects: string;
  setup: string;
  earlyResults: string;
  // Domain labels
  ccMastery: string;
  toolMcp: string;
  agentic: string;
  promptCraft: string;
  contextMgmt: string;
  // Feature mini-bar labels
  hooks: string;
  plugins: string;
  skills: string;
  mcp: string;
  agents: string;
  plan: string;
  memory: string;
  rules: string;
  // Setup checklist
  claudeMd: string;
}

const en: LocaleStrings = {
  title: "Claude Code Proficiency",
  calibrating: "Analyzing usage patterns...",
  needMore: (n) => `Need ${n} more for scoring`,
  sessions: "sessions",
  projects: "projects",
  setup: "Setup",
  earlyResults: "early results",
  ccMastery: "CC Mastery",
  toolMcp: "Tool & MCP",
  agentic: "Agentic",
  promptCraft: "Prompt Craft",
  contextMgmt: "Context Mgmt",
  hooks: "Hooks",
  plugins: "Plugins",
  skills: "Skills",
  mcp: "MCP",
  agents: "Agents",
  plan: "Plan",
  memory: "Memory",
  rules: "Rules",
  claudeMd: "CLAUDE.md",
};

const zhCN: LocaleStrings = {
  title: "Claude Code \u80FD\u529B\u6982\u89C8",
  calibrating: "\u6B63\u5728\u5206\u6790\u4F7F\u7528\u6A21\u5F0F...",
  needMore: (n) => `\u8FD8\u9700 ${n} \u6B21\u4F1A\u8BDD\u624D\u80FD\u8BC4\u5206`,
  sessions: "\u4F1A\u8BDD",
  projects: "\u9879\u76EE",
  setup: "\u914D\u7F6E",
  earlyResults: "\u521D\u6B65\u7ED3\u679C",
  ccMastery: "CC \u638C\u63E1",
  toolMcp: "\u5DE5\u5177 & MCP",
  agentic: "\u667A\u80FD\u4F53",
  promptCraft: "\u63D0\u793A\u8BCD",
  contextMgmt: "\u4E0A\u4E0B\u6587",
  hooks: "\u94A9\u5B50",
  plugins: "\u63D2\u4EF6",
  skills: "\u6280\u80FD",
  mcp: "MCP",
  agents: "\u4EE3\u7406",
  plan: "\u8BA1\u5212",
  memory: "\u8BB0\u5FC6",
  rules: "\u89C4\u5219",
  claudeMd: "CLAUDE.md",
};

const LOCALES: Record<Locale, LocaleStrings> = { en, "zh-CN": zhCN };

export function getLocale(locale: Locale = "en"): LocaleStrings {
  return LOCALES[locale] ?? LOCALES.en;
}

/**
 * Detect locale from environment or config.
 */
export function detectLocale(): Locale {
  // LC_ALL overrides everything, then LC_MESSAGES, then LANG, then LANGUAGE
  const lang = process.env.LC_ALL ?? process.env.LC_MESSAGES ?? process.env.LANG ?? process.env.LANGUAGE ?? "";
  if (lang.startsWith("zh")) return "zh-CN";
  return "en";
}
