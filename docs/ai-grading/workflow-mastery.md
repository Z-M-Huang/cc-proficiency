---
id: workflow-mastery
label: Workflow Mastery
description: How sophisticated and efficient are the user's work patterns?
---

## Q1: Session strategy diversity
**Anchors:** 1=all sessions same type/pattern, 2=mostly one type, 3=2-3 distinct types, 4=strategic variety, 5=strategic type selection matched to goals
**Evidence:** Session-meta `tool_counts` patterns to derive session types (read-heavy, edit-heavy, bash-heavy, mixed). When FACET_AVAILABLE: use facets `session_type` distribution for explicit classification.

## Q2: Investigation discipline
**Anchors:** 1=no read-before-edit behavior, 2=rarely investigates first, 3=occasional investigation, 4=regular read-then-edit pattern, 5=systematic investigation-first discipline
**Evidence:** Rule-engine aggregate signals: `tool-read-before-edit` and `tool-investigation-chain` fire counts. Higher fire rates indicate disciplined investigation before action.

## Q3: Configuration maturity
**Anchors:** 1=bare default setup, 2=minimal customization, 3=some configuration present, 4=well-configured environment, 5=sophisticated setup with hooks, plugins, MCP, rules, memory
**Evidence:** Rule-engine ConfigSignals: presence and count of hooks, plugins, CLAUDE.md, MCP servers, custom rules, memory usage, agents, skills. More sophisticated setup = higher maturity.

## Q4: Tool repertoire effectiveness
**Anchors:** 1=uses only 1-2 tools, 2=narrow tool range, 3=varied tool usage, 4=broad repertoire with appropriate selection, 5=right tool for each job with high entropy across sessions
**Evidence:** Session-meta `tool_counts` distribution entropy across sessions. Look for breadth of tool types used AND variation in tool mix between sessions (not same pattern every time).

## Q5: Shipping behavior
**Anchors:** 1=no evidence of shipping, 2=rare evidence, 3=occasional evidence, 4=regular shipping signals, 5=consistent commit and push discipline
**Evidence:** Session-meta `git_commits` and `git_pushes` when present. This is a sparse signal — DO NOT penalize absence (score 3 when insufficient data). Only reward when evidence is present. One-directional criterion.
