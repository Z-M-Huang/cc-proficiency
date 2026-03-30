import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { AIDomainId, ParsedRubric, ParsedRubricCriterion, ParsedRubricDomain } from "../types.js";

const DOMAIN_FILES: readonly string[] = [
  "goal-achievement.md",
  "collaboration-quality.md",
  "workflow-mastery.md",
  "growth-learning.md",
  "verification-quality.md",
];

function getRubricDir(): string {
  // dist/scoring/rubric-loader.js -> ../../docs/ai-grading/
  return join(__dirname, "..", "..", "docs", "ai-grading");
}

function readRubricFile(dir: string, filename: string): string {
  const path = join(dir, filename);
  try {
    return readFileSync(path, "utf-8");
  } catch {
    throw new Error(`Missing rubric file: ${filename}`);
  }
}

interface Frontmatter {
  id: string;
  label: string;
  description: string;
}

function parseFrontmatter(content: string, filename: string): { frontmatter: Frontmatter; body: string } {
  const parts = content.split("---");
  if (parts.length < 3) {
    throw new Error(`Invalid frontmatter in ${filename}: missing --- delimiters`);
  }
  const raw = parts[1].trim();
  const fm: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    fm[key] = value;
  }
  if (!fm["id"] || !fm["label"] || !fm["description"]) {
    throw new Error(`Invalid frontmatter in ${filename}: missing id, label, or description`);
  }
  return {
    frontmatter: { id: fm["id"], label: fm["label"], description: fm["description"] },
    body: parts.slice(2).join("---").trim(),
  };
}

function parseCriteria(body: string, filename: string): ParsedRubricCriterion[] {
  const sections = body.split(/^## /m).filter(Boolean);
  const criteria: ParsedRubricCriterion[] = [];
  for (const section of sections) {
    const lines = section.trim().split("\n");
    const heading = lines[0];
    const match = heading.match(/^(Q\d+):\s*(.+)/);
    if (!match) {
      throw new Error(`Invalid criterion heading in ${filename}: ${heading}`);
    }
    const q = match[1];
    const title = match[2].trim();
    const text = lines.slice(1).join("\n");
    const anchorsMatch = text.match(/\*\*Anchors:\*\*\s*(.+)/);
    const evidenceMatch = text.match(/\*\*Evidence:\*\*\s*(.+)/);
    if (!anchorsMatch || !evidenceMatch) {
      throw new Error(`Missing Anchors or Evidence in ${filename} ${q}`);
    }
    criteria.push({ q, title, anchors: anchorsMatch[1].trim(), evidence: evidenceMatch[1].trim() });
  }
  return criteria;
}

function parseDomainFile(dir: string, filename: string): ParsedRubricDomain {
  const content = readRubricFile(dir, filename);
  const { frontmatter, body } = parseFrontmatter(content, filename);
  const criteria = parseCriteria(body, filename);
  if (criteria.length === 0) {
    throw new Error(`No criteria found in ${filename}`);
  }
  return { id: frontmatter.id as AIDomainId, label: frontmatter.label, description: frontmatter.description, criteria };
}

export function loadRubric(): ParsedRubric {
  const dir = getRubricDir();
  const domains = DOMAIN_FILES.map(f => parseDomainFile(dir, f));
  const antiGaming = readRubricFile(dir, "anti-gaming.md");
  const systemPromptHeader = readRubricFile(dir, "system-prompt-header.md");
  return { domains, antiGaming, systemPromptHeader };
}

export function buildPromptFromRubric(rubric: ParsedRubric): string {
  const parts: string[] = [rubric.systemPromptHeader, ""];
  for (const domain of rubric.domains) {
    parts.push(`### ${domain.label}`);
    parts.push(`*${domain.description}*\n`);
    for (const c of domain.criteria) {
      parts.push(`## ${c.q}: ${c.title}`);
      parts.push(`**Anchors:** ${c.anchors}`);
      parts.push(`**Evidence:** ${c.evidence}\n`);
    }
  }
  parts.push(rubric.antiGaming);
  return parts.join("\n");
}
