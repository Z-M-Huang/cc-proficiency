---
id: collaboration-quality
label: Collaboration Quality
description: How effectively does the user partner with Claude?
---

## Q1: Error recovery skill
**Anchors:** 1=errors unresolved (sessions end after errors), 2=slow recovery, 3=basic recovery (continues after errors), 4=recovers and adapts approach, 5=systematic recovery with strategy changes
**Evidence:** Session-meta `tool_errors` and `tool_error_categories` combined with continued tool activity after errors. Sessions where tool_errors > 0 but tool activity continues indicate recovery.

## Q2: Direction clarity (friction)
**Anchors:** 1=frequent misalignment, 2=regular misalignment, 3=occasional misalignment, 4=rare misalignment, 5=consistently clear direction
**Evidence:** Session-meta `tool_errors` rate as weaker proxy for direction issues. When FACET_AVAILABLE: use facets `friction_counts.wrong_approach` rate for direct measurement. Without facets, score conservatively toward 3.

## Q3: Outcome satisfaction
**Anchors:** 1=<30% satisfied, 2=30-50%, 3=50-70%, 4=70-85%, 5=>85%
**Evidence:** Facets `user_satisfaction_counts` when available (precomputed rate). Disclose coverage %. When facets unavailable or coverage <20%, score 3 (insufficient signal).

## Q4: AI leverage effectiveness
**Anchors:** 1=underutilized (1-2 basic tools only), 2=basic usage, 3=adequate leverage, 4=good leverage across tools, 5=maximizes value with advanced features
**Evidence:** Rule-engine FeatureInventory: tool diversity, advanced features used (hooks, skills, MCP, agents). When FACET_AVAILABLE: also use facets `claude_helpfulness` distribution for qualitative depth.

## Q5: Session completion ratio
**Anchors:** 1=<30% of sessions reach substantive work, 2=30-50%, 3=50-70%, 4=70-85%, 5=>85% of sessions reach substantive output
**Evidence:** Session-meta: proportion of non-warmup sessions with substantive tool activity (>5 tool calls) as proxy for reaching meaningful completion.
