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

7. **analyze**: Run `node dist/cli/index.js analyze --full` — must produce output containing domain scores or "No sessions found". If sessions are found, output should contain `Tokens:` followed by `/24h` and `/30d` (token consumption status). Must not error.

8. **explain**: Run `node dist/cli/index.js explain` — must produce output containing the locale-appropriate strengths label (e.g., `Strengths:` for en, `优势：` for zh-CN) or "No analysis data" / the locale equivalent. Must not error.

9. **achievements**: Run `node dist/cli/index.js achievements` — must produce output containing the locale-appropriate achievements title (e.g., `Achievements (` for en) or "No analysis data" / the locale equivalent. Must not error.

10. **status**: Run `node dist/cli/index.js status` — must produce output containing `cc-proficiency status`. Must not error.

11. **config**: Run `node dist/cli/index.js config` — must produce valid JSON output containing `autoUpload`. Must not error.

12. **badge**: Run `node dist/cli/index.js badge` — must produce output containing `Badge saved to`. The generated SVG is a multi-locale badge using SVG `<switch>` elements. Must not error.

12b. **badge --animated**: Run `node dist/cli/index.js badge --animated` — must produce output containing `Badge saved to` and the path must contain `animated`. Must not error.

13. **process**: Run `node dist/cli/index.js process` — must produce output containing `Queue empty` or `Processed`. Must not error. (This exercises the mergeAndPush path when sessions are queued.)

14. **leaderboard**: Run `node dist/cli/index.js leaderboard` — must produce output containing `Leaderboard` (either rankings or "unavailable"). Must not error.

15. **share (error path)**: Run `node dist/cli/index.js share` — if already on leaderboard, must print "Already on the leaderboard". If not, must either proceed or print a prerequisite error. Must not crash. (NOTE: do not test with `--remove` as it would delete real data.)

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
    - If `tokenLog` exists, it must be an array where each entry has: `sessionId` (string), `timestamp` (valid ISO 8601), `tokens` (number >= 0)
    - If `processedSessionIds` is non-empty and sessions have been analyzed, `tokenLog` should be non-empty (tokens are extracted from transcripts during analyze/process)

18. **Validate config** (`~/.cc-proficiency/config.json`):
    - File must exist and be valid JSON
    - Must have `autoUpload` (boolean) and `public` (boolean)
    - If `locale` is set, must be one of: `en`, `zh-CN`, `es`, `fr`, `ja`, `ko`

19. **Validate SVG badge** (`~/.cc-proficiency/cc-proficiency.svg`):
    - File must exist and be non-empty
    - Must start with `<svg` and contain `xmlns="http://www.w3.org/2000/svg"`
    - Must contain the username from store.json's `lastResult.username`
    - Must contain `<switch>` elements and `systemLanguage` attributes (multi-locale auto-detection)
    - Must contain domain labels from ALL locales in the same SVG (e.g., `CC Mastery` AND `CC 精通` AND `CC熟練` must all be present)
    - Must be well-formed XML — validate that it ends with `</svg>`
    - File size should be between 2KB and 50KB (sanity check)
    - If store.json `lastResult.streak` is set, SVG must contain the streak emoji 🔥
    - If store.json `lastResult.achievementCount` is set and > 0, SVG must contain the trophy emoji 🏆
    - If store.json `tokenLog` has entries within the last 30 days with tokens > 0, SVG must contain `tokens` and `/24h` and `/30d`

20. **Validate animated SVG badge** (`~/.cc-proficiency/cc-proficiency-animated.svg`):
    - File must exist and be non-empty
    - Must start with `<svg` and contain `xmlns="http://www.w3.org/2000/svg"`
    - Must contain SMIL `<animate` elements (proves it's the animated variant, not a copy of the static badge)
    - Must contain `attributeName="width"` (bar-fill animation) and `attributeName="opacity"` (fade-in animation)
    - Must contain `calcMode="spline"` (eased animation, not linear)
    - Must contain `fill="freeze"` (animations hold their end state)
    - Must contain the username from store.json's `lastResult.username`
    - Must contain `<switch>` elements and `systemLanguage` attributes (multi-locale auto-detection, same as static SVG)
    - Must contain domain labels from ALL locales (e.g., `CC Mastery` AND `CC 精通` must both be present)
    - Must contain all 8 mini-bar feature labels (for `en`: `Hooks`, `Plugins`, `Skills`, `MCP`, `Agents`, `Plan`, `Memory`, `Rules`)
    - Must be well-formed XML — validate that it ends with `</svg>`
    - Height must match the static badge: extract `height="N"` from both files and verify they are equal
    - File size should be between 4KB and 80KB (animated SVG is larger due to `<animate>` elements)
    - If the static badge contains a token line (`tokens` and `/24h`), the animated badge must also contain it

21. **Validate hook log** (`~/.cc-proficiency/hook.log`):
    - If the file exists, each non-empty line must match the pattern `[ISO_TIMESTAMP] MESSAGE`
    - If it does not exist, that is OK (hook hasn't fired yet) — note this as "not yet created"

### Step 5 — Feature scoring validation

24. **Feature scores are graduated**: Load store.json's `lastResult.features.featureScores`. Verify:
    - Must be an object with all 8 keys: `hooks`, `plugins`, `skills`, `mcp`, `agents`, `plan`, `memory`, `rules`
    - All values must be integers between 0 and 100
    - At least one value must be between 1 and 99 (not all binary 0/100 — proves graduated scoring works)

25. **Explain Flags line**: Run `node dist/cli/index.js explain` and verify the output contains all 5 feature flags: `Plan`, `Memory`, `Rules`, `Agents`, `Skills` (each preceded by ✓ or ✗).

26. **SVG mini-bars complete**: Load the SVG badge file. Verify it contains all 8 mini-bar labels: `Hooks`, `Plugins`, `Skills`, `MCP`, `Agents`, `Plan`, `Memory`, `Rules`.

27. **SetupChecklist complete**: Load store.json's `lastResult.setupChecklist`. Verify it has all 8 boolean fields: `hasClaudeMd`, `hasHooks`, `hasPlugins`, `hasMcpServers`, `hasMemory`, `hasRules`, `hasAgents`, `hasSkills`.

28. **Project-level config detection**: Run via Bash:
    ```
    node -e "const {parseClaudeConfig}=require('./dist/parsers/config-parser.js'); const c=parseClaudeConfig(); console.log(JSON.stringify({rulesFileCount:c.rulesFileCount,hasRulesFiles:c.hasRulesFiles,hasCustomSkills:c.hasCustomSkills,hasCustomAgents:c.hasCustomAgents,pluginCount:c.pluginCount}))"
    ```
    Verify:
    - `rulesFileCount` must be a number >= 0
    - `hasRulesFiles` must be a boolean
    - `hasCustomSkills` must be a boolean
    - `hasCustomAgents` must be a boolean
    - `pluginCount` must be a number >= 0

29. **Multi-project config merging**: Run via Bash:
    ```
    node -e "const {parseClaudeConfig}=require('./dist/parsers/config-parser.js'); const c1=parseClaudeConfig(['/nonexistent']); const c2=parseClaudeConfig(); console.log('empty-cwd-rules:'+c1.rulesFileCount, 'cwd-rules:'+c2.rulesFileCount)"
    ```
    Verify:
    - Calling with a nonexistent path must not crash (returns 0 for project-level signals)
    - Calling without args (defaults to `process.cwd()`) must return >= 0

30. **Known project cwds persistence**: Load store.json. Verify:
    - `knownProjectCwds` field exists and is an array (may be empty on first run, or contain paths from prior sessions)
    - If the array has entries, each must be a non-empty string
    - Run `node dist/cli/index.js analyze --full` — after running, reload store.json and verify `knownProjectCwds` contains `process.cwd()` (the current project directory should always be persisted)

### Step 6 — Locale detection and i18n

31. **Locale precedence**: Run via Bash:
    ```
    node -e "process.env.LC_ALL='zh_CN.UTF-8'; process.env.LANG='en_US.UTF-8'; const {detectLocale}=require('./dist/i18n/index.js'); console.log(detectLocale())"
    ```
    Must print `zh-CN` (LC_ALL overrides LANG).

32. **Locale fallback**: Run via Bash:
    ```
    node -e "delete process.env.LC_ALL; delete process.env.LC_MESSAGES; process.env.LANG='en_US.UTF-8'; const {detectLocale}=require('./dist/i18n/index.js'); console.log(detectLocale())"
    ```
    Must print `en`.

33b. **All 6 locales load**: Run via Bash:
    ```
    node -e "const {SUPPORTED_LOCALES,getLocaleStrings}=require('./dist/i18n/index.js'); for(const l of SUPPORTED_LOCALES){const s=getLocaleStrings(l); console.log(l+': '+s.badge.title)}"
    ```
    Must print 6 lines, one per locale, each with a non-empty title.

33c. **SVG switch elements with correct structure**: Run via Bash:
    ```
    grep -c '<switch>' ~/.cc-proficiency/cc-proficiency.svg
    ```
    Must return > 0 (proves multi-locale `<switch>` elements are present). Additionally verify:
    - Each `<switch>` block contains `systemLanguage="zh"`, `systemLanguage="es"`, `systemLanguage="fr"`, `systemLanguage="ja"`, `systemLanguage="ko"` entries
    - The last `<text>` in each `<switch>` has NO `systemLanguage` attribute (English fallback)
    - Feature labels from ja locale (e.g., `フック`, `プラグイン`) AND ko locale (e.g., `훅`, `플러그인`) must be present (proves non-English feature labels are wrapped)
    - Token prefix variants must be present if token line exists (e.g., `tokens`, `Token`, `トークン`, `토큰`)

33d. **Calibrating badge switch**: If store.json has `lastResult.phase` = `calibrating`, generate a badge and verify it also contains `<switch>` elements with all locale variants of the calibrating status text. (Skip if phase is not calibrating.)

33e. **Badge always multi-locale**: Run `node dist/cli/index.js badge --output /tmp/test-multi.svg 2>&1`. Verify the output SVG contains `<switch>` elements — the badge is always multi-locale regardless of arguments.

33f. **Config locale validation**: Run via Bash:
    ```
    node dist/cli/index.js config locale invalid-locale 2>&1
    ```
    Must print an error about invalid locale, not silently save it.

### Step 7 — File size check

34. **Source file sizes**: Run `wc -l src/**/*.ts src/*.ts | sort -rn | head -8` via Bash. Flag any file over 300 lines that is NOT `types.ts` or `scoring/rules.ts`.

### Report

Report a summary table at the end:

```
| Check                   | Status |
|-------------------------|--------|
| Typecheck               | ...    |
| Lint                    | ...    |
| Tests (N passed)        | ...    |
| Build                   | ...    |
| CLI: version            | ...    |
| CLI: help               | ...    |
| CLI: analyze            | ...    |
| CLI: explain            | ...    |
| CLI: achievements       | ...    |
| CLI: status             | ...    |
| CLI: config             | ...    |
| CLI: badge              | ...    |
| CLI: badge --animated   | ...    |
| CLI: process            | ...    |
| CLI: leaderboard        | ...    |
| CLI: share              | ...    |
| Path contracts          | ...    |
| Store JSON              | ...    |
| Config JSON             | ...    |
| SVG badge               | ...    |
| Animated SVG badge      | ...    |
| Hook log                | ...    |
| Feature scores          | ...    |
| Explain Flags           | ...    |
| SVG mini-bars           | ...    |
| SetupChecklist          | ...    |
| Project-level config    | ...    |
| Multi-project merge     | ...    |
| Known cwds persistence  | ...    |
| Token log in store      | ...    |
| Token line in SVG       | ...    |
| Locale precedence       | ...    |
| Locale fallback         | ...    |
| All 6 locales load      | ...    |
| SVG switch structure    | ...    |
| Calibrating switch      | ...    |
| Badge always multi-locale| ...   |
| Config locale validation| ...    |
| File sizes              | ...    |
```

If all checks pass, end with: **All checks passed.**

If any check fails, end with: **FAILED** and list the failing checks with details.
