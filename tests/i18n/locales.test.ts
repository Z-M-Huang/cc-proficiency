import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { en } from "../../src/i18n/locales/en.js";
import { zhCN } from "../../src/i18n/locales/zh-CN.js";
import { es } from "../../src/i18n/locales/es.js";
import { fr } from "../../src/i18n/locales/fr.js";
import { ja } from "../../src/i18n/locales/ja.js";
import { ko } from "../../src/i18n/locales/ko.js";
import { detectLocale, isValidLocale, SUPPORTED_LOCALES, getLocaleStrings } from "../../src/i18n/index.js";
import { renderBadge } from "../../src/renderer/svg.js";
import type { AllStrings } from "../../src/i18n/types.js";
import type { ProficiencyResult } from "../../src/types.js";

const ALL_LOCALES: Record<string, AllStrings> = { en, "zh-CN": zhCN, es, fr, ja, ko };

describe("locale files", () => {
  it("all 6 locales load without error", () => {
    expect(Object.keys(ALL_LOCALES)).toHaveLength(6);
    for (const [name, locale] of Object.entries(ALL_LOCALES)) {
      expect(locale.badge.title, `${name} badge.title`).toBeTruthy();
      expect(locale.common.noAnalysisData, `${name} common.noAnalysisData`).toBeTruthy();
    }
  });

  it("function properties work correctly", () => {
    for (const [name, locale] of Object.entries(ALL_LOCALES)) {
      expect(typeof locale.badge.needMore(5), `${name} needMore`).toBe("string");
      expect(typeof locale.common.badgeSavedLocally("/test"), `${name} badgeSavedLocally`).toBe("string");
      expect(typeof locale.cli.explain.sessionsSummary(10, 3), `${name} sessionsSummary`).toBe("string");
      expect(typeof locale.cli.achievements.title(5, 15), `${name} achievements.title`).toBe("string");
    }
  });

  it("all locales have same domain label keys as en", () => {
    const enDomainKeys = Object.keys(en.badge.domainLabels).sort();
    for (const [name, locale] of Object.entries(ALL_LOCALES)) {
      const keys = Object.keys(locale.badge.domainLabels).sort();
      expect(keys, `${name} domainLabels keys`).toEqual(enDomainKeys);
    }
  });

  it("all locales have same feature label keys as en", () => {
    const enFeatureKeys = Object.keys(en.badge.featureLabels).sort();
    for (const [name, locale] of Object.entries(ALL_LOCALES)) {
      const keys = Object.keys(locale.badge.featureLabels).sort();
      expect(keys, `${name} featureLabels keys`).toEqual(enFeatureKeys);
    }
  });

  it("all locales have same achievement keys as en", () => {
    const enAchKeys = Object.keys(en.achievements).sort();
    for (const [name, locale] of Object.entries(ALL_LOCALES)) {
      const keys = Object.keys(locale.achievements).sort();
      expect(keys, `${name} achievement keys`).toEqual(enAchKeys);
    }
  });

  it("getLocaleStrings returns correct locale", () => {
    expect(getLocaleStrings("en").badge.title).toBe("Claude Code Proficiency");
    expect(getLocaleStrings("zh-CN").badge.title).toContain("Claude Code");
    expect(getLocaleStrings("ja").badge.title).toContain("Claude Code");
  });
});

describe("isValidLocale", () => {
  it("accepts supported locales", () => {
    expect(isValidLocale("en")).toBe(true);
    expect(isValidLocale("zh-CN")).toBe(true);
    expect(isValidLocale("es")).toBe(true);
    expect(isValidLocale("fr")).toBe(true);
    expect(isValidLocale("ja")).toBe(true);
    expect(isValidLocale("ko")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isValidLocale("de")).toBe(false);
    expect(isValidLocale("")).toBe(false);
    expect(isValidLocale(undefined)).toBe(false);
    expect(isValidLocale("ZH-CN")).toBe(false);
  });
});

describe("SUPPORTED_LOCALES", () => {
  it("contains all 6 locales", () => {
    expect(SUPPORTED_LOCALES).toHaveLength(6);
    expect(SUPPORTED_LOCALES).toContain("en");
    expect(SUPPORTED_LOCALES).toContain("zh-CN");
    expect(SUPPORTED_LOCALES).toContain("es");
    expect(SUPPORTED_LOCALES).toContain("fr");
    expect(SUPPORTED_LOCALES).toContain("ja");
    expect(SUPPORTED_LOCALES).toContain("ko");
  });
});

describe("detectLocale", () => {
  const envKeys = ["LC_ALL", "LC_MESSAGES", "LANG", "LANGUAGE"] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of envKeys) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of envKeys) {
      if (saved[k] !== undefined) process.env[k] = saved[k];
      else delete process.env[k];
    }
  });

  it("returns zh-CN for Chinese locale", () => {
    process.env.LANG = "zh_CN.UTF-8";
    expect(detectLocale()).toBe("zh-CN");
  });

  it("returns es for Spanish locale", () => {
    process.env.LANG = "es_ES.UTF-8";
    expect(detectLocale()).toBe("es");
  });

  it("returns fr for French locale", () => {
    process.env.LC_ALL = "fr_FR.UTF-8";
    expect(detectLocale()).toBe("fr");
  });

  it("returns ja for Japanese locale", () => {
    process.env.LANG = "ja_JP.UTF-8";
    expect(detectLocale()).toBe("ja");
  });

  it("returns ko for Korean locale", () => {
    process.env.LANG = "ko_KR.UTF-8";
    expect(detectLocale()).toBe("ko");
  });

  it("returns en for C locale", () => {
    process.env.LC_ALL = "C";
    expect(detectLocale()).toBe("en");
  });

  it("returns en for empty env", () => {
    expect(detectLocale()).toBe("en");
  });

  it("LC_ALL takes priority over LANG", () => {
    process.env.LC_ALL = "ja_JP.UTF-8";
    process.env.LANG = "es_ES.UTF-8";
    expect(detectLocale()).toBe("ja");
  });

  it("handles LANGUAGE with colons", () => {
    process.env.LANGUAGE = "ko:en";
    expect(detectLocale()).toBe("ko");
  });
});

// ── Regression tests for locale-switch behavior ──

function makeResult(overrides: Partial<ProficiencyResult> = {}): ProficiencyResult {
  return {
    username: "testuser",
    timestamp: "2026-03-16T12:00:00Z",
    domains: [
      { id: "cc-mastery", label: "CC Mastery", score: 78, weight: 0.2, confidence: "high", dataPoints: 50 },
      { id: "tool-mcp", label: "Tool & MCP", score: 55, weight: 0.2, confidence: "medium", dataPoints: 25 },
      { id: "agentic", label: "Agentic", score: 82, weight: 0.2, confidence: "high", dataPoints: 60 },
      { id: "prompt-craft", label: "Prompt Craft", score: 65, weight: 0.2, confidence: "high", dataPoints: 55 },
      { id: "context-mgmt", label: "Context Mgmt", score: 90, weight: 0.2, confidence: "high", dataPoints: 45 },
    ],
    features: {
      hooks: [], skills: [], mcpServers: [],
      topTools: [{ name: "Read", count: 100 }],
      totalToolCalls: 100, uniqueToolCount: 5,
      usedPlanMode: true, hasMemory: true, hasRules: false,
      hasAgents: false, hasSkills: false, totalHours: 10,
    },
    sessionCount: 20, projectCount: 3, phase: "full",
    setupChecklist: {
      hasClaudeMd: true, hasHooks: true, hasPlugins: false,
      hasMcpServers: false, hasMemory: true, hasRules: false,
      hasAgents: false, hasSkills: false,
    },
    ...overrides,
  };
}

describe("renderer uses <switch> with all locale domain labels", () => {
  it("badge contains Chinese domain labels via systemLanguage switch", () => {
    const svg = renderBadge(makeResult());
    expect(svg).toContain("CC 精通");
    expect(svg).toContain('systemLanguage="zh"');
  });

  it("badge contains Japanese domain labels via systemLanguage switch", () => {
    const svg = renderBadge(makeResult());
    expect(svg).toContain("CC熟練");
    expect(svg).toContain('systemLanguage="ja"');
  });

  it("badge contains Korean domain labels via systemLanguage switch", () => {
    const svg = renderBadge(makeResult());
    expect(svg).toContain("CC 마스터리");
    expect(svg).toContain('systemLanguage="ko"');
  });

  it("badge contains English domain labels as fallback (no systemLanguage)", () => {
    const svg = renderBadge(makeResult());
    // English fallback text appears without systemLanguage attribute
    expect(svg).toContain("CC Mastery");
    expect(svg).toContain("<switch>");
  });
});

describe("zh-CN specific translation conventions", () => {
  it("token is NOT 令牌", () => {
    expect(zhCN.badge.tokensPrefix).toBe("Token");
    expect(zhCN.badge.tokensPrefix).not.toBe("令牌");
    expect(zhCN.formatting.tokensLabel).toContain("Token");
    expect(zhCN.formatting.tokensLabel).not.toContain("令牌");
  });

  it("feature labels are English", () => {
    expect(zhCN.badge.featureLabels.hooks).toBe("Hooks");
    expect(zhCN.badge.featureLabels.plugins).toBe("Plugins");
    expect(zhCN.badge.featureLabels.skills).toBe("Skills");
    expect(zhCN.badge.featureLabels.agents).toBe("Agents");
  });
});

describe("renderer tokenLine uses <switch> with locale prefixes", () => {
  it("badge contains Token (zh-CN) and tokens (en) via switch", () => {
    const svg = renderBadge(makeResult(), { tokens24h: 1000, tokens30d: 5000 });
    expect(svg).toContain("Token");   // zh-CN prefix
    expect(svg).toContain("tokens");  // en fallback prefix
  });

  it("badge contains Japanese token prefix via switch", () => {
    const svg = renderBadge(makeResult(), { tokens24h: 1000, tokens30d: 5000 });
    expect(svg).toContain("トークン");
  });
});
