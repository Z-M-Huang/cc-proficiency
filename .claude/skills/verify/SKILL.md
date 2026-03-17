# Verify

Run all verification checks to ensure cc-proficiency builds, lints, passes tests, the CLI works, and output artifacts are valid.

## Usage

Run `/verify` after making code changes to confirm nothing is broken.

## Instructions

Run ALL of the following steps in order, stopping on the first failure:

### Step 1 — Code quality

1. **Typecheck**: Run `npx tsc --noEmit` via Bash. If it fails, report the errors and stop.

2. **Lint**: Run `npx eslint src/ hooks/` via Bash. If it fails, report the errors and stop.

3. **Test**: Run `npm test` via Bash. If any tests fail, report which ones and stop.

4. **Build**: Run `npm run build` via Bash. If it fails, report the errors and stop.

### Step 2 — CLI smoke tests

5. **CLI version**: Run `node dist/cli/index.js version` via Bash — must print `cc-proficiency v` followed by a semver string.

6. **CLI help**: Run `node dist/cli/index.js` (no args) via Bash — must print usage text containing `Commands:`.

### Step 3 — Path contracts

Verify all critical runtime paths resolve correctly after build. Run via Bash:

7. **hook -> CLI processor**: `node -e "const fs=require('fs'),p=require('path').join('dist/hooks','..','cli','index.js');console.log(fs.existsSync(p))"` — must print `true`

8. **CLI -> hook script**: `node -e "const fs=require('fs'),p=require('path').join('dist/cli/services','..','..','hooks','session-end.js');console.log(fs.existsSync(p))"` — must print `true`

9. **CLI -> package.json**: `node -e "const fs=require('fs'),p=require('path').join('dist/cli','..','..','package.json');console.log(fs.existsSync(p))"` — must print `true`

### Step 4 — Output artifact validation

Run a full analysis and validate the generated artifacts:

10. **Run analysis**: Run `node dist/cli/index.js analyze --full` via Bash. If it errors, report and stop.

11. **Validate local store** (`~/.cc-proficiency/store.json`):
    - File must exist and be valid JSON
    - Must have `processedSessionIds` (array of strings)
    - Must have `lastResult` with: `username` (string), `timestamp` (ISO 8601), `domains` (array of 5), `features` (object), `sessionCount` (number >= 0), `phase` (one of: `calibrating`, `early`, `full`), `setupChecklist` (object)
    - Each domain in `lastResult.domains` must have: `id`, `label`, `score` (0-100), `weight`, `confidence` (one of: `low`, `medium`, `high`), `dataPoints`
    - `lastUpdated` must be a valid ISO 8601 timestamp

12. **Validate config** (`~/.cc-proficiency/config.json`):
    - File must exist and be valid JSON
    - Must have `autoUpload` (boolean) and `public` (boolean)

13. **Generate badge**: Run `node dist/cli/index.js badge` via Bash.

14. **Validate SVG badge** (`~/.cc-proficiency/cc-proficiency.svg`):
    - File must exist and be non-empty
    - Must start with `<svg` and contain `xmlns="http://www.w3.org/2000/svg"`
    - Must contain the username from store.json's `lastResult.username`
    - Must contain all 5 domain labels: `CC Mastery`, `Tool`, `Agentic`, `Prompt`, `Context`
    - Must contain the phase indicator (e.g., `Calibrating` for calibrating phase, or domain score bars for early/full)
    - Must be well-formed XML (no unclosed tags) — validate with `node -e "..."` using a basic check that it ends with `</svg>`
    - File size should be between 2KB and 50KB (sanity check)

15. **Validate hook log** (`~/.cc-proficiency/hook.log`):
    - If the file exists, each non-empty line must match the pattern `[ISO_TIMESTAMP] MESSAGE`
    - If it does not exist, that is OK (hook hasn't fired yet) — note this as "not yet created"

### Step 5 — File size check

16. **Source file sizes**: Run `wc -l src/**/*.ts src/*.ts | sort -rn | head -8` via Bash. Flag any file over 300 lines that is NOT `types.ts` or `scoring/rules.ts`.

### Report

Report a summary table at the end:

```
| Check            | Status |
|------------------|--------|
| Typecheck        | ...    |
| Lint             | ...    |
| Tests (N passed) | ...    |
| Build            | ...    |
| CLI smoke        | ...    |
| Path contracts   | ...    |
| Analysis run     | ...    |
| Store JSON       | ...    |
| Config JSON      | ...    |
| SVG badge        | ...    |
| Hook log         | ...    |
| File sizes       | ...    |
```

If all checks pass, end with: **All checks passed.**

If any check fails, end with: **FAILED** and list the failing checks with details.
