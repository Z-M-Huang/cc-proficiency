<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-Proficiency_Badge-7c3aed?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6Ii8+PHBhdGggZD0iTTIgMTdsMTAgNSAxMC01Ii8+PHBhdGggZD0iTTIgMTJsMTAgNSAxMC01Ii8+PC9zdmc+" alt="cc-proficiency" />
</p>

<p align="center">
  <strong>Generate a proficiency badge for your Claude Code usage, aligned with the 5 Claude Certified Architect exam domains.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/cc-proficiency"><img src="https://img.shields.io/npm/v/cc-proficiency?style=flat-square&color=cb3837&logo=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/cc-proficiency"><img src="https://img.shields.io/npm/dm/cc-proficiency?style=flat-square&color=cb3837&logo=npm" alt="npm downloads" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency"><img src="https://img.shields.io/github/stars/Z-M-Huang/cc-proficiency?style=flat-square&logo=github" alt="GitHub stars" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency/issues"><img src="https://img.shields.io/github/issues/Z-M-Huang/cc-proficiency?style=flat-square&logo=github" alt="GitHub issues" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Z-M-Huang/cc-proficiency?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.7+-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/zero-runtime_deps-22c55e?style=flat-square" alt="Zero Runtime Dependencies" />
  <img src="https://img.shields.io/badge/coverage-96%25-brightgreen?style=flat-square" alt="Test Coverage" />
  <img src="https://visitor-badge.laobi.icu/badge?page_id=Z-M-Huang.cc-proficiency&style=flat-square" alt="Visitors" />
</p>

<p align="center">
  <a href="#install">Install</a> &nbsp;·&nbsp;
  <a href="#usage">Usage</a> &nbsp;·&nbsp;
  <a href="#embed-in-your-readme">Embed</a> &nbsp;·&nbsp;
  <a href="#how-scoring-works">Scoring</a> &nbsp;·&nbsp;
  <a href="#privacy">Privacy</a> &nbsp;·&nbsp;
  <a href="./README.zh-CN.md">中文</a>
</p>

---

## What it does

Analyzes your Claude Code session transcripts **locally** with a rule-based engine, scoring usage patterns across 5 domains:

| Domain | Weight | What it measures |
|--------|--------|-----------------|
| **CC Mastery** | 20% | CLAUDE.md, hooks, plugins, plan mode, skills, rules |
| **Tool & MCP** | 20% | Tool chains, MCP servers, LSP, selective edits |
| **Agentic** | 20% | Subagents, parallel execution, worktrees, task management |
| **Prompt Craft** | 20% | Structured prompts, code blocks, error traces, refinement |
| **Context Mgmt** | 20% | Cross-session memory, CLAUDE.md updates, sustained projects |

Also shows **8 feature mini-bars** (Hooks, Plugins, Skills, MCP, Agents, Plan, Memory, Rules) as a heatmap row.

<p align="center">
  <a href="https://github.com/Z-M-Huang/cc-proficiency">
    <img src="https://gist.githubusercontent.com/Z-M-Huang/2717fa94690c459d5093650c87f49868/raw/cc-proficiency.svg" alt="CC Proficiency Badge — Static" />
  </a>
  <br />
  <a href="https://gist.githubusercontent.com/Z-M-Huang/2717fa94690c459d5093650c87f49868/raw/cc-proficiency-animated.svg">Click to see animated version</a>
</p>

> **Disclaimer:** This is an unofficial usage estimate, not an actual Anthropic certification score. Not affiliated with or endorsed by Anthropic.

## Install

```bash
npm install -g cc-proficiency
cc-proficiency init
```

`init` will:
1. Detect your GitHub username (via `gh` CLI)
2. Inject a Stop hook into `~/.claude/settings.json`
3. Create a private GitHub Gist for your badge (if `gh` is authenticated)

If `gh` is not installed or not authenticated, the badge is saved locally to `~/.cc-proficiency/cc-proficiency.svg`.

## Usage

### First-time setup

```bash
$ cc-proficiency init

Initializing cc-proficiency...

  GitHub user: @yourname
  Creating private Gist...
  Gist created: a1b2c3d4e5f6

  Add to your README:
  ![CC Proficiency](https://gist.githubusercontent.com/yourname/a1b2c3d4e5f6/raw/cc-proficiency.svg)

  ✓ Configuration saved to /home/you/.cc-proficiency
  ✓ Hook injected into ~/.claude/settings.json

  Run 'cc-proficiency analyze' to compute your first scores.
```

### Analyze your proficiency

```bash
$ cc-proficiency analyze --full

Running full analysis...
  Claude Code Proficiency — @yourname
  ────────────────────────────────────────
  CC Mastery     ███████████████░░░░░   77  ●
  Tool & MCP     ███████████████████░   96  ◐
  Agentic        ██████████████░░░░░░   69  ◐
  Prompt Craft   ████████████████░░░░   81  ◐
  Context Mgmt   ████████████████████  100  ●
  ────────────────────────────────────────
  Hooks   Edit (1411x), Bash (928x), Write (542x) +5
  Skills  dev-buddy-once (5x), chatroom (2x) +5
  Tools   Read 2046 · Bash 1045 · Write 379 · Edit 367 (+12 more)
  ────────────────────────────────────────
  139 sessions · 4 projects
```

### Get improvement tips

```bash
$ cc-proficiency explain

  Claude Code Proficiency — @yourname

  Strengths:
    Context Mgmt   100/100
    Tool & MCP      96/100
    Prompt Craft    81/100
    CC Mastery      77/100
    Agentic         69/100

  Areas to Improve:
    Agentic (69/100)
       → Try more CC features: subagents, MCP servers, skills,
         plan mode, worktrees
    CC Mastery (77/100)
       → Enhance CLAUDE.md with imports, add hooks with matchers,
         create rules files

  Feature Usage:
    Hooks:  Edit (1411x), Bash (928x), Write (542x) +5
    Skills: dev-buddy-once (5x), chatroom (2x) +5
    Tools:  Read (2046), Bash (1045), Write (379) +12 more
    Flags:  ✓ Plan  ✓ Memory  ✗ Rules

  139 sessions · 4 projects
```

### Generate and push your badge

```bash
# Save badge locally
$ cc-proficiency badge --output my-badge.svg
Badge written to my-badge.svg

# Or push directly to your Gist
$ cc-proficiency push
✓ Badge pushed to Gist
  https://gist.githubusercontent.com/yourname/a1b2c3d4e5f6/raw/cc-proficiency.svg
```

### Automatic updates (zero effort)

After `init`, a Stop hook runs automatically after every Claude Code session:

```
You use Claude Code normally
  → Session ends
  → Hook queues the session (<1s, invisible to you)
  → Background process analyzes + updates your badge
  → Your README badge reflects your latest scores
```

No manual steps needed after setup.

### Without GitHub CLI

If you don't have `gh` installed or prefer local-only mode:

```bash
$ cc-proficiency init

  ⚠ GitHub CLI not authenticated.
  Badge will be saved locally to: ~/.cc-proficiency/cc-proficiency.svg
  To enable auto-upload: gh auth login && cc-proficiency init

$ cc-proficiency analyze --full
$ cc-proficiency badge --output badge.svg
```

## Embed in your README

After running `cc-proficiency init`, add this to your README:

```markdown
<!-- Static badge -->
![Claude Code Proficiency](https://gist.githubusercontent.com/<username>/<gist-id>/raw/cc-proficiency.svg)

<!-- Animated badge (click to view) -->
[Click to see animated version](https://gist.githubusercontent.com/<username>/<gist-id>/raw/cc-proficiency-animated.svg)
```

Both badges update automatically after each Claude Code session (via the Stop hook).

## Progressive Badge

The badge adapts based on how much data is available:

| Phase | Sessions | What's shown |
|-------|----------|-------------|
| **Calibrating** | 0–2 | Setup checklist + progress toward first scoring |
| **Early Results** | 3–9 | 5 domain bars + 8 feature mini-bars (low-confidence indicators ○) |
| **Full Badge** | 10+ | Full domain bars, feature heatmap, confidence dots (● ◐ ○) |

## Improve your scores

The **[Gamification Guide](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide)** covers:

- First day through expert-level progression path
- Tips for each of the 5 domains
- How to unlock all 15 achievements
- What drives each feature mini-bar from 0 to 100
- Streak system and leaderboard

> **[Gamification Guide](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide)** | **[游戏化攻略（中文）](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide-zh)**

## How scoring works

### Rule-based engine

cc-proficiency uses a **pattern-matching rule engine** with ~55 rules across 5 domains instead of counting tool calls. Each rule detects a specific behavior pattern and awards points by tier:

| Tier | Points | Example Rule |
|------|--------|-------------|
| **Beginner** | 5 pts | Has global CLAUDE.md |
| **Intermediate** | 10–15 pts | Investigation chain: Grep → Read → Edit |
| **Advanced** | 15–25 pts | Parallel agents with different subagent types |
| **Anti-pattern** | -5 to -10 pts | 5+ parallel tools with >50% error rate |

### 5 Domain Bars

| Domain | What it measures |
|--------|-----------------|
| **CC Mastery** | CLAUDE.md structure, hooks with matchers, plugins, plan mode, skills, rules files |
| **Tool & MCP** | Investigation chains, Read-before-Edit, tool variety, MCP server usage, LSP, selective edits |
| **Agentic** | Subagent type variety, parallel agents, background runs, worktrees, task management |
| **Prompt Craft** | Structured requests, code blocks, error traces, file references, iterative refinement |
| **Context Mgmt** | Active memory files, CLAUDE.md updates, sustained projects, session depth |

### 8 Feature Mini-Bars

Below the domain bars, a heatmap row shows depth per feature:

`Hooks · Plugins · Skills · MCP · Agents · Plan · Memory · Rules`

Each mini-bar uses **depth-based scoring** with logarithmic curves that reflect actual usage, not just whether you've tried a feature once. Having hooks configured gets you ~30; firing them across hundreds of sessions gets you closer to 100. See the [Gamification Guide](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide) for details.

### Bucket aggregation with caps

Scores are not raw sums. Each domain has capped buckets:

| Bucket | Max Points | Source |
|--------|-----------|--------|
| **Config** | 25 pts | Config-based rules (CLAUDE.md, hooks, plugins; available immediately) |
| **Behavior** | 75 pts | Behavior-based rules (transcript patterns; grow over time) |
| **Penalty** | -15 pts max | Anti-pattern deductions |

This means:
- **Fresh installs** can score up to ~25 raw config points per domain (boosted to ~50 during calibration via 2.0x scaling)
- **After calibration** (10+ sessions) config alone caps at ~25 per domain; transcript evidence drives the rest
- **Anti-patterns are capped**, so a few bad sessions don't destroy your score

### Phase-aware weighting

Config evidence is weighted more heavily during calibration, less as transcripts accumulate:

| Phase | Sessions | Config scale | Behavior scale |
|-------|----------|-------------|---------------|
| Calibrating | 0–2 | 2.0× | 0.8× |
| Early | 3–9 | 1.5× | 1.0× |
| Full | 10+ | 1.0× | 1.15× |

### Anti-gaming

- Rules fire **per-session with caps**; repeating the same tool 100x doesn't help
- **Anti-pattern rules** deduct points for bad habits (shotgun parallel calls, unstructured walls of text)
- Each rule has `maxPerSession`; investigation chains cap at 3 per session
- Config scores are **capped at 25**, so you can't max a domain by just installing plugins

## Privacy

| Concern | How it's handled |
|---------|-----------------|
| **Data location** | All analysis happens **locally** on your machine |
| **What's stored** | Only aggregate counts, ratios, and boolean flags (no file paths, code, or prompts) |
| **Gist visibility** | **Private by default** (secret URL, not listed on your profile) |
| **Offline mode** | Works fully offline without `gh` CLI (local-only mode) |
| **CI/CD** | Non-interactive sessions are automatically detected and excluded |

## Commands

| Command | Description |
|---------|-------------|
| `cc-proficiency init` | Set up hooks and Gist |
| `cc-proficiency analyze [--full]` | Parse sessions and compute scores |
| `cc-proficiency process` | Process queued sessions from hook |
| `cc-proficiency badge [--output <file>]` | Generate SVG badge |
| `cc-proficiency push` | Upload badge to Gist |
| `cc-proficiency explain` | Show score drivers and tips |
| `cc-proficiency achievements` | View achievement progress |
| `cc-proficiency status` | Show hook activity, queue, and config |
| `cc-proficiency config [key] [value]` | View/set configuration |
| `cc-proficiency share [--remove]` | Join or leave the community leaderboard |
| `cc-proficiency leaderboard` | View community rankings |
| `cc-proficiency update` | Update to the latest version |
| `cc-proficiency uninstall` | Remove hooks and clean up |

### Community Leaderboard

Opt into the community leaderboard to compare your proficiency with other Claude Code users:

```bash
# Join the leaderboard (creates a separate public profile)
$ cc-proficiency share

# View rankings
$ cc-proficiency leaderboard

# Leave the leaderboard
$ cc-proficiency share --remove
```

Your private data (session details, project names, file paths) is never shared. Only scores, streak, and achievement count are public. See the [wiki](https://github.com/Z-M-Huang/cc-proficiency/wiki) for full documentation.

## Architecture

```
Stop hook fires (< 1s)
  → Writes session path to ~/.cc-proficiency/queue.jsonl
  → Spawns `cc-proficiency process` as detached child

cc-proficiency process
  → Acquires queue.lock (stale >60s → break)
  → Deduplicates by session_id
  → Parses transcripts (streaming JSONL, per-line error handling)
  → Extracts signals → computes scores → renders SVG
  → Pushes to Gist (if configured) or saves locally
  → Atomically rotates queue
```

## Contributing

Contributions welcome! Please open an issue first to discuss what you'd like to change.

```bash
git clone https://github.com/Z-M-Huang/cc-proficiency.git
cd cc-proficiency
npm install
npm test              # 200 tests
npm run build         # compile to dist/
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run check         # typecheck + lint + test
```

## License

[Apache 2.0](LICENSE)

---

<p align="center">
  <sub>Built with Claude Code. Not affiliated with or endorsed by Anthropic.</sub>
</p>
