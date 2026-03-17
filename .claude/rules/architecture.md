# Architecture Rules

## Module Boundaries
- `src/cli/` -- CLI entry point + command handlers (no business logic)
- `src/scoring/` -- Rule engine, signal extraction, domain scoring
- `src/parsers/` -- Read and normalize external data (transcripts, config, history)
- `src/store/` -- Local persistence, remote sync, queue, achievements
- `src/gist/` -- GitHub Gist operations (gh CLI wrapper)
- `src/renderer/` -- SVG badge generation
- `src/i18n/` -- Locale definitions

## CLI Commands
- Each command lives in its own file under `src/cli/commands/`
- CLI files should only: parse args, call business logic, format output
- No business logic in CLI layer -- delegate to scoring/store modules

## Adding New Features
- New scoring rules: add to `src/scoring/rules.ts` array
- New achievements: add to `src/store/achievements.ts` array
- New CLI commands: create `src/cli/commands/<name>.ts`
- New locale: add to `src/i18n/locales.ts`

## Dependencies
- Zero runtime dependencies (only node builtins + optional sharp)
- gh CLI is external -- always handle absence gracefully
- All file I/O uses node:fs -- no third-party filesystem libs

## Repo-Specific Invariants
- Hook code (`hooks/session-end.ts`) MUST be self-contained -- it compiles separately via `hooks/tsconfig.json`
- CI detection is intentionally duplicated in hooks (keep comment: "Duplicated from ci-detect.ts -- keep in sync")
- Changing `dist/` layout requires updating ALL of: package.json bin, hook processor path, CLI `__dirname` references, and `injectHook()` path. Always verify with `npm run build && cc-proficiency version`
- Public exports in `src/index.ts` are the library API -- do not remove exports without a major version bump
- `src/scoring/rules.ts` is a data-driven array -- it's intentionally large and exempt from file size limits

## Testing
- Every new module needs a corresponding test file
- Tests go in `tests/<module-path>/` mirroring `src/`
- Use fixture files for transcript/config test data
- Mock `homedir()` for store/queue tests (vi.mock pattern)
- Gaming/fairness tests for any scoring changes
