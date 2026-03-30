---
id: goal-achievement
label: Goal Achievement
description: How effectively does the user define and accomplish objectives?
---

## Q1: Goal clarity & specificity
**Anchors:** 1=vague single-word goals, 2=basic intent visible, 3=clear goals with context, 4=well-defined with constraints, 5=expert-level framing with success criteria
**Evidence:** Session-meta `first_prompt` word count and structure (available on all sessions). When FACET_AVAILABLE: also use facets `underlying_goal` text quality for richer assessment.

## Q2: Achievement rate
**Anchors:** 1=<20% achieved, 2=20-40%, 3=40-60%, 4=60-80%, 5=>80%
**Evidence:** Facets `outcome` distribution when available (precomputed achieved_rate). Disclose coverage %. When facets unavailable or coverage <20%, score 3 (insufficient signal).

## Q3: Session purposefulness
**Anchors:** 1=mostly warmups/idle, 2=many warmups or abandoned, 3=mixed productive and idle, 4=mostly productive, 5=consistently productive sessions
**Evidence:** Session-meta warmup ratio from `first_prompt` pattern detection (e.g., "Respond with OK"). Tool activity ratio: sessions with >0 tool calls / total sessions.

## Q4: Project engagement depth
**Anchors:** 1=single project one-off, 2=few projects shallow, 3=some sustained engagement, 4=multi-session projects, 5=deep multi-session projects with sustained effort
**Evidence:** Session-meta `project_path`: sessions per unique project distribution. Look for projects with repeated engagement over time rather than breadth alone.

## Q5: Task completion signals
**Anchors:** 1=mostly abandoned (low tool activity), 2=many sessions end early, 3=mixed completion evidence, 4=most sessions show substantive work, 5=consistently substantive tool activity indicating completion
**Evidence:** Session-meta: sessions with >5 tool calls as proxy for substantive work. Proportion of non-warmup sessions with meaningful tool activity. Do NOT penalize sparse `lines_added` — use tool call volume as primary proxy.
