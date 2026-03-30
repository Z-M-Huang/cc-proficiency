---
id: verification-quality
label: Verification & Quality
description: Does the user produce reliable, validated results?
---

## Q1: Outcome reliability
**Anchors:** 1=<30% achieved, 2=30-50%, 3=50-70%, 4=70-85%, 5=>85%
**Evidence:** Facets `outcome` success rate when available (precomputed). Disclose coverage %. When facets unavailable or coverage <20%, score 3 (insufficient signal — this criterion is coverage-gated).

## Q2: Error handling quality
**Anchors:** 1=ignores errors entirely, 2=fixes occasionally, 3=fixes some errors, 4=systematic error handling, 5=low error rate with systematic recovery
**Evidence:** Session-meta: `tool_errors` / total tool calls ratio across sessions. Lower ratio = better error management. Also consider `tool_error_categories` for pattern analysis — diverse error types with low rates suggest sophisticated usage.

## Q3: Investigation thoroughness
**Anchors:** 1=trial-and-error only, 2=minimal investigation, 3=some investigation before action, 4=regular investigation patterns, 5=systematic investigation with LSP, read-before-edit, and investigation chains
**Evidence:** Rule-engine aggregate signals: `tool-investigation-chain` fire count, LSP usage indicators, `tool-read-before-edit` patterns. Higher aggregate scores indicate thorough verification habits.

## Q4: Iterative refinement discipline
**Anchors:** 1=one-shot only (no iteration), 2=rare iteration, 3=some iteration, 4=regular iterative patterns, 5=systematic iteration with multiple edit cycles
**Evidence:** Session-meta: sessions with multiple Edit tool calls indicating iterative refinement. When FACET_AVAILABLE: also use facets `session_type=iterative_refinement` rate for explicit classification.

## Q5: Course-correction capability
**Anchors:** 1=never corrects course after errors, 2=eventual correction, 3=moderate recovery, 4=quick recovery, 5=rapid recovery — sessions with errors continue to substantial tool activity
**Evidence:** Session-meta: sessions with `tool_errors` > 0 that continue to substantial tool activity afterward (>5 tool calls after first error). Higher continuation ratio = better course-correction ability.
