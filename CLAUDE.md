# cc-proficiency

Claude Code proficiency badge generator. Analyzes session transcripts to produce SVG badges.

## Architecture

- **Hook**: `hooks/session-end.ts` — Stop hook writes to queue (<1s)
- **Queue**: `src/store/queue.ts` — append-only JSONL, dedupe by session_id
- **Parsers**: `src/parsers/` — streaming JSONL with per-line error handling
- **Scoring**: `src/scoring/` — 5 domains + outcome multiplier, saturating curves
- **Renderer**: `src/renderer/svg.ts` — dark theme SVG, colorblind accessible
- **CLI**: `src/cli.ts` — init, analyze, process, badge, push, explain, config, uninstall

## Key conventions

- Node.js + TypeScript, compiled to `dist/`
- Zero runtime dependencies (only node built-ins)
- All file I/O uses `node:fs` — no third-party filesystem libs
- GitHub operations use `gh` CLI via `execFileSync` (not `exec`)
- Privacy: no file paths, transcript content, or code in `store.json` or SVG
- Tests: vitest, fixtures in `tests/fixtures/`

## Commands

```
npm run build      # compile TS → dist/
npm test           # run vitest
npm run typecheck  # tsc --noEmit
```
