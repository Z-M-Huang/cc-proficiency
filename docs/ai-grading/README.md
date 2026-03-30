# AI Grading Rubrics

This directory contains the rubric files used by cc-proficiency's AI grading system.

## How It Works

The AI grading system evaluates Claude Code usage across 5 outcome-focused domains.
Each domain has its own markdown file with criteria, numeric anchors, and evidence
descriptions. At grading time, the rubric loader reads these files and assembles a
prompt for evaluation.

## File Structure

| File | Purpose |
|------|---------|
| `system-prompt-header.md` | Role definition and output format for the AI evaluator |
| `goal-achievement.md` | Domain 1: Goal clarity, achievement rate, complexity |
| `collaboration-quality.md` | Domain 2: Friction recovery, direction clarity, feedback |
| `workflow-mastery.md` | Domain 3: Session strategy, efficiency, coordination |
| `growth-learning.md` | Domain 4: Trajectory improvements over time |
| `verification-quality.md` | Domain 5: Outcome reliability, error handling, refinement |
| `anti-gaming.md` | Shared anti-gaming rules applied across all domains |

## Editing Rubrics

Each domain file uses a simple format:

1. **Frontmatter** (YAML-like, between `---` delimiters): `id`, `label`, `description`
2. **Criteria sections**: `## Q1: Title` followed by `**Anchors:**` and `**Evidence:**`

Changes to these files take effect on the next `cc-proficiency ai-grade` run.
No code changes are required. The rubric content hash is part of the cache key,
so edits automatically invalidate cached results.

## Scoring

- Each criterion is scored 1-5 by the AI evaluator
- Totals, levels, and achievements are computed deterministically (not by the AI)
- When data is insufficient for a criterion, the AI scores it 3 (neutral)
