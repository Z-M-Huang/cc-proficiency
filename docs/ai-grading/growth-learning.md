---
id: growth-learning
label: Growth & Learning
description: Is the user improving over time? Requires sufficient data for meaningful trends.
---

## Q1: Friction trajectory
**Anchors:** 1=increasing friction over time, 2=slightly increasing, 3=flat or insufficient data, 4=slightly declining, 5=clearly declining friction
**Evidence:** Facets `friction_counts` first-half vs second-half comparison when available (requires >=20 facets). When FACET_AVAILABLE and SUFFICIENT_FOR_TRENDS: use facet trend. Otherwise score 3 (insufficient for trend analysis).

## Q2: Tool adoption curve
**Anchors:** 1=static tool usage throughout, 2=minimal new tools, 3=gradual adoption of new tools, 4=steady new tool adoption, 5=consistent new tool types appearing in later sessions
**Evidence:** Session-meta: new `tool_counts` key types appearing in chronologically later sessions vs earlier sessions. Compare tool vocabulary in first-half vs second-half of session history.

## Q3: Feature adoption progression
**Anchors:** 1=basic features only, 2=mostly basic, 3=some intermediate features, 4=intermediate plus some advanced, 5=advanced features adopted (agents, worktrees, MCP, task management, skills)
**Evidence:** Rule-engine FeatureInventory: presence of advanced-tier features. Classify features into basic (Read, Edit, Bash), intermediate (Grep, Glob, hooks), advanced (agents, worktrees, MCP, task mgmt, skills).

## Q4: Capability breadth expansion
**Anchors:** 1=narrow and unchanging, 2=minimal expansion, 3=some variety growth, 4=steady breadth increase, 5=broad and growing capability set
**Evidence:** Session-meta: unique `tool_counts` keys across time windows. Compare distinct tool types used in early sessions vs recent sessions. Growth in unique tool types indicates expanding capability.

## Q5: Resilience development
**Anchors:** 1=same failures repeat consistently, 2=slow improvement, 3=mixed or insufficient data, 4=good learning from errors, 5=learns from errors — decreasing error rate over time
**Evidence:** Session-meta: `tool_errors` rate trend over chronological session windows (declining = learning). When FACET_AVAILABLE: also use facets `friction_detail` to judge if same friction types recur. Without facets, use error rate trend alone.
