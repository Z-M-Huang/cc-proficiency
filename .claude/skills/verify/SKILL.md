# Verify

Run all verification checks to ensure cc-proficiency builds, lints, passes tests, all CLI commands work, and output artifacts are valid.

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

Run each command via Bash (`node dist/cli/index.js <cmd>`) and verify expected output:

5. **version**: Must print `cc-proficiency v` followed by a semver string.

6. **help**: Run with no args — must print usage text containing `Commands:`.

7. **analyze**: Run `node dist/cli/index.js analyze --full` — must produce output containing domain scores or "No sessions found". Must not error.

8. **explain**: Run `node dist/cli/index.js explain` — must produce output containing `Strengths:` or "No analysis data". Must not error.

9. **achievements**: Run `node dist/cli/index.js achievements` — must produce output containing `Achievements (` or "No analysis data". Must not error.

10. **status**: Run `node dist/cli/index.js status` — must produce output containing `cc-proficiency status`. Must not error.

11. **config**: Run `node dist/cli/index.js config` — must produce valid JSON output containing `autoUpload`. Must not error.

12. **badge**: Run `node dist/cli/index.js badge` — must produce output containing `Badge saved to`. Must not error.

13. **process**: Run `node dist/cli/index.js process` — must produce output containing `Queue empty` or `Processed`. Must not error. (This exercises the mergeAndPush path when sessions are queued.)

### Step 3 — Path contracts

Verify all critical runtime paths resolve correctly after build. Run via Bash:

14. **hook -> CLI processor**: `node -e "const fs=require('fs'),p=require('path').join('dist/hooks','..','cli','index.js');console.log(fs.existsSync(p))"` — must print `true`

15. **CLI -> hook script**: `node -e "const fs=require('fs'),p=require('path').join('dist/cli/services','..','..','hooks','session-end.js');console.log(fs.existsSync(p))"` — must print `true`

16. **CLI -> package.json**: `node -e "const fs=require('fs'),p=require('path').join('dist/cli','..','..','package.json');console.log(fs.existsSync(p))"` — must print `true`

### Step 4 — Output artifact validation

17. **Validate local store** (`~/.cc-proficiency/store.json`):
    - File must exist and be valid JSON
    - Must have `processedSessionIds` (array of strings)
    - Must have `lastResult` with: `username` (string), `timestamp` (ISO 8601), `domains` (array of 5), `features` (object), `sessionCount` (number >= 0), `phase` (one of: `calibrating`, `early`, `full`), `setupChecklist` (object)
    - Each domain in `lastResult.domains` must have: `id`, `label`, `score` (0-100), `weight`, `confidence` (one of: `low`, `medium`, `high`), `dataPoints`
    - `lastUpdated` must be a valid ISO 8601 timestamp

18. **Validate config** (`~/.cc-proficiency/config.json`):
    - File must exist and be valid JSON
    - Must have `autoUpload` (boolean) and `public` (boolean)
    - If `locale` is set, must be one of: `en`, `zh-CN`

19. **Validate SVG badge** (`~/.cc-proficiency/cc-proficiency.svg`):
    - File must exist and be non-empty
    - Must start with `<svg` and contain `xmlns="http://www.w3.org/2000/svg"`
    - Must contain the username from store.json's `lastResult.username`
    - Must contain all 5 domain labels: `CC Mastery`, `Tool`, `Agentic`, `Prompt`, `Context`
    - Must be well-formed XML — validate that it ends with `</svg>`
    - File size should be between 2KB and 50KB (sanity check)
    - If store.json `lastResult.streak` is set, SVG must contain the streak emoji 🔥
    - If store.json `lastResult.achievementCount` is set and > 0, SVG must contain the trophy emoji 🏆

20. **Validate hook log** (`~/.cc-proficiency/hook.log`):
    - If the file exists, each non-empty line must match the pattern `[ISO_TIMESTAMP] MESSAGE`
    - If it does not exist, that is OK (hook hasn't fired yet) — note this as "not yet created"

### Step 5 — Locale detection

21. **Locale precedence**: Run via Bash:
    ```
    node -e "process.env.LC_ALL='zh_CN.UTF-8'; process.env.LANG='en_US.UTF-8'; const {detectLocale}=require('./dist/i18n/locales.js'); console.log(detectLocale())"
    ```
    Must print `zh-CN` (LC_ALL overrides LANG).

22. **Locale fallback**: Run via Bash:
    ```
    node -e "delete process.env.LC_ALL; delete process.env.LC_MESSAGES; process.env.LANG='en_US.UTF-8'; const {detectLocale}=require('./dist/i18n/locales.js'); console.log(detectLocale())"
    ```
    Must print `en`.

### Step 6 — File size check

23. **Source file sizes**: Run `wc -l src/**/*.ts src/*.ts | sort -rn | head -8` via Bash. Flag any file over 300 lines that is NOT `types.ts` or `scoring/rules.ts`.

### Report

Report a summary table at the end:

```
| Check              | Status |
|--------------------|--------|
| Typecheck          | ...    |
| Lint               | ...    |
| Tests (N passed)   | ...    |
| Build              | ...    |
| CLI: version       | ...    |
| CLI: help          | ...    |
| CLI: analyze       | ...    |
| CLI: explain       | ...    |
| CLI: achievements  | ...    |
| CLI: status        | ...    |
| CLI: config        | ...    |
| CLI: badge         | ...    |
| CLI: process       | ...    |
| Path contracts     | ...    |
| Store JSON         | ...    |
| Config JSON        | ...    |
| SVG badge          | ...    |
| Hook log           | ...    |
| Locale precedence  | ...    |
| Locale fallback    | ...    |
| File sizes         | ...    |
```

If all checks pass, end with: **All checks passed.**

If any check fails, end with: **FAILED** and list the failing checks with details.
