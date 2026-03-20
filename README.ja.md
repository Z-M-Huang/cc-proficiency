<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-%E7%86%9F%E7%B7%B4%E5%BA%A6%E3%83%90%E3%83%83%E3%82%B8-7c3aed?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6Ii8+PHBhdGggZD0iTTIgMTdsMTAgNSAxMC01Ii8+PHBhdGggZD0iTTIgMTJsMTAgNSAxMC01Ii8+PC9zdmc+" alt="cc-proficiency" />
</p>

<p align="center">
  <strong>Claude Code の使用状況から熟練度バッジを生成します。Claude Certified Architect 試験の 5 つのドメインに対応。</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/cc-proficiency"><img src="https://img.shields.io/npm/v/cc-proficiency?style=flat-square&color=cb3837&logo=npm" alt="npm バージョン" /></a>
  <a href="https://www.npmjs.com/package/cc-proficiency"><img src="https://img.shields.io/npm/dm/cc-proficiency?style=flat-square&color=cb3837&logo=npm" alt="npm ダウンロード数" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency"><img src="https://img.shields.io/github/stars/Z-M-Huang/cc-proficiency?style=flat-square&logo=github" alt="GitHub stars" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency/issues"><img src="https://img.shields.io/github/issues/Z-M-Huang/cc-proficiency?style=flat-square&logo=github" alt="GitHub issues" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Z-M-Huang/cc-proficiency?style=flat-square" alt="ライセンス" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.7+-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/zero-runtime_deps-22c55e?style=flat-square" alt="ランタイム依存なし" />
  <img src="https://img.shields.io/badge/coverage-96%25-brightgreen?style=flat-square" alt="テストカバレッジ" />
  <img src="https://visitor-badge.laobi.icu/badge?page_id=Z-M-Huang.cc-proficiency&style=flat-square" alt="訪問者" />
</p>

<p align="center">
  <a href="#インストール">インストール</a> &nbsp;&middot;&nbsp;
  <a href="#使い方">使い方</a> &nbsp;&middot;&nbsp;
  <a href="#readme-に埋め込む">埋め込み</a> &nbsp;&middot;&nbsp;
  <a href="#スコアリングの仕組み">スコアリング</a> &nbsp;&middot;&nbsp;
  <a href="#プライバシー">プライバシー</a> &nbsp;&middot;&nbsp;
  <a href="#ローカライゼーション">ローカライゼーション</a> &nbsp;&middot;&nbsp;
  <a href="./README.md">English</a> &middot; <a href="./README.zh-CN.md">中文</a> &middot; <a href="./README.es.md">Espa&ntilde;ol</a> &middot; <a href="./README.fr.md">Fran&ccedil;ais</a> &middot; <strong>日本語</strong> &middot; <a href="./README.ko.md">한국어</a>
</p>

---

## 機能概要

Claude Code のセッション記録を**ローカル**でルールベースのエンジンにより分析し、5 つのドメインにわたる使用パターンを評価します：

| ドメイン | ウェイト | 測定内容 |
|----------|----------|----------|
| **CC Mastery** | 20% | CLAUDE.md、フック、プラグイン、プランモード、スキル、ルール |
| **Tool & MCP** | 20% | 調査チェーン、MCP サーバー、LSP、選択的編集 |
| **Agentic** | 20% | サブエージェント、並列実行、ワークツリー、タスク管理 |
| **Prompt Craft** | 20% | 構造化プロンプト、コードブロック、エラートレース、改善 |
| **Context Mgmt** | 20% | セッション間メモリ、CLAUDE.md 更新、継続プロジェクト |

また、**8 つの機能ミニバー**（Hooks, Plugins, Skills, MCP, Agents, Plan, Memory, Rules）をヒートマップ行として表示します。

<p align="center">
  <a href="https://github.com/Z-M-Huang/cc-proficiency">
    <img src="https://gist.githubusercontent.com/Z-M-Huang/2717fa94690c459d5093650c87f49868/raw/cc-proficiency.svg" alt="CC Proficiency バッジ — 静的" />
  </a>
  <br />
  <a href="https://gist.githubusercontent.com/Z-M-Huang/2717fa94690c459d5093650c87f49868/raw/cc-proficiency-animated.svg">アニメーション版はこちら</a>
</p>

> **免責事項：** これは非公式の使用推定であり、Anthropic の公式認定スコアではありません。Anthropic とは無関係です。

## インストール

```bash
npm install -g cc-proficiency
cc-proficiency init
```

`init` は以下を行います：
1. GitHub ユーザー名を検出（`gh` CLI 経由）
2. `~/.claude/settings.json` に Stop フックを注入
3. バッジ用のプライベート GitHub Gist を作成（`gh` が認証済みの場合）

`gh` がインストールされていないか認証されていない場合、バッジはローカルの `~/.cc-proficiency/cc-proficiency.svg` に保存されます。

## 使い方

### 初回セットアップ

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

### 熟練度を分析する

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

### 改善のヒントを取得

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

### バッジの生成とプッシュ

```bash
# バッジをローカルに保存
$ cc-proficiency badge --output my-badge.svg
Badge written to my-badge.svg

# または Gist に直接プッシュ
$ cc-proficiency push
✓ Badge pushed to Gist
  https://gist.githubusercontent.com/yourname/a1b2c3d4e5f6/raw/cc-proficiency.svg
```

### 自動更新（手間ゼロ）

`init` 後、Claude Code のセッション終了時に Stop フックが自動実行されます：

```
通常通り Claude Code を使用
  → セッション終了
  → フックがセッションをキューに追加（<1秒、ユーザーには見えません）
  → バックグラウンドプロセスが分析 + バッジを更新
  → README のバッジに最新スコアが反映
```

セットアップ後の手動操作は不要です。

### GitHub CLI なしで使う

`gh` がインストールされていない、またはローカルのみのモードを好む場合：

```bash
$ cc-proficiency init

  ⚠ GitHub CLI not authenticated.
  Badge will be saved locally to: ~/.cc-proficiency/cc-proficiency.svg
  To enable auto-upload: gh auth login && cc-proficiency init

$ cc-proficiency analyze --full
$ cc-proficiency badge --output badge.svg
```

## README に埋め込む

`cc-proficiency init` を実行した後、README に以下を追加します：

```markdown
<!-- 静的バッジ -->
![Claude Code Proficiency](https://gist.githubusercontent.com/<username>/<gist-id>/raw/cc-proficiency.svg)

<!-- アニメーションバッジ（クリックで表示） -->
[アニメーション版はこちら](https://gist.githubusercontent.com/<username>/<gist-id>/raw/cc-proficiency-animated.svg)
```

両方のバッジは Claude Code のセッションごとに自動更新されます（Stop フック経由）。

## プログレッシブバッジ

利用可能なデータ量に応じてバッジが適応します：

| フェーズ | セッション数 | 表示内容 |
|----------|--------------|----------|
| **キャリブレーション** | 0–2 | セットアップチェックリスト + 初回スコアリングへの進捗 |
| **初期結果** | 3–9 | 5 つのドメインバー + 8 つの機能ミニバー（低信頼度インジケーター ○） |
| **フルバッジ** | 10+ | 完全なドメインバー、機能ヒートマップ、信頼度ドット（● ◐ ○） |

## スコアを改善する

**[ゲーミフィケーションガイド](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide)** では以下をカバーしています：

- 初日からエキスパートレベルまでの進行パス
- 5 つのドメインそれぞれのヒント
- 15 個の実績すべてをアンロックする方法
- 各機能ミニバーを 0 から 100 にする要因
- ストリークシステムとリーダーボード

> **[Gamification Guide](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide)** | **[游戏化攻略（中文）](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide-zh)**

## スコアリングの仕組み

### ルールベースエンジン

cc-proficiency はツール呼び出しを数えるのではなく、5 つのドメインにわたる ~55 のルールを持つ**パターンマッチングルールエンジン**を使用します。各ルールは特定の行動パターンを検出し、ティア別にポイントを付与します：

| ティア | ポイント | ルール例 |
|--------|----------|----------|
| **初級** | 5 pts | グローバル CLAUDE.md がある |
| **中級** | 10–15 pts | 調査チェーン：Grep → Read → Edit |
| **上級** | 15–25 pts | 異なるサブエージェントタイプによる並列エージェント |
| **アンチパターン** | -5 ~ -10 pts | 5+ 並列ツールでエラー率 >50% |

### 5 つのドメインバー

| ドメイン | 測定内容 |
|----------|----------|
| **CC Mastery** | CLAUDE.md 構造、マッチャー付きフック、プラグイン、プランモード、スキル、ルールファイル |
| **Tool & MCP** | 調査チェーン、Read-before-Edit、ツールの多様性、MCP サーバー使用、LSP、選択的編集 |
| **Agentic** | サブエージェントタイプの多様性、並列エージェント、バックグラウンド実行、ワークツリー、タスク管理 |
| **Prompt Craft** | 構造化リクエスト、コードブロック、エラートレース、ファイル参照、反復的改善 |
| **Context Mgmt** | アクティブメモリファイル、CLAUDE.md 更新、継続プロジェクト、セッション深度 |

### 8 つの機能ミニバー

ドメインバーの下に、機能ごとの深度を示すヒートマップ行があります：

`Hooks · Plugins · Skills · MCP · Agents · Plan · Memory · Rules`

各ミニバーは**深度ベースのスコアリング**を使用し、機能を一度試しただけでなく実際の使用状況を反映する対数曲線を採用しています。フックを設定すると ~30 ポイント獲得できます。数百のセッションでフックを発火させると 100 に近づきます。詳細は[ゲーミフィケーションガイド](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide)をご覧ください。

### バケット集約とキャップ

スコアは単純な合計ではありません。各ドメインにはキャップ付きバケットがあります：

| バケット | 最大ポイント | ソース |
|----------|-------------|--------|
| **Config** | 25 pts | 設定ベースのルール（CLAUDE.md、フック、プラグイン、即座に利用可能） |
| **Behavior** | 75 pts | 行動ベースのルール（トランスクリプトパターン、時間とともに成長） |
| **Penalty** | -15 pts 最大 | アンチパターンの減点 |

これは以下を意味します：
- **新規インストール**はドメインごとに最大 ~25 の設定ポイントを獲得可能（キャリブレーション中は 2.0x スケーリングにより ~50 に増加）
- **キャリブレーション後**（10+ セッション）設定だけではドメインごとに ~25 が上限。トランスクリプトの証拠が残りを推進
- **アンチパターンにはキャップ**があるため、数回の悪いセッションでスコアが壊滅することはありません

### フェーズ対応の重み付け

設定の証拠はキャリブレーション中により重く、トランスクリプトが蓄積されるにつれて軽く重み付けされます：

| フェーズ | セッション数 | 設定スケール | 行動スケール |
|----------|--------------|-------------|-------------|
| キャリブレーション | 0–2 | 2.0× | 0.8× |
| 初期 | 3–9 | 1.5× | 1.0× |
| フル | 10+ | 1.0× | 1.15× |

### 不正防止

- ルールは**セッションごとにキャップ付き**で発動します。同じツールを 100 回繰り返しても効果はありません
- **アンチパターンルール**は悪い習慣に対してポイントを減点します（散発的な並列呼び出し、構造化されていないテキストの壁）
- 各ルールには `maxPerSession` があります。調査チェーンはセッションごとに 3 回が上限
- 設定スコアは **25 がキャップ**なので、プラグインをインストールするだけではドメインを最大化できません

## プライバシー

| 項目 | 対応方法 |
|------|----------|
| **データの場所** | すべての分析は**ローカルマシン**上で行われます |
| **保存内容** | 集計カウント、比率、ブールフラグのみ（ファイルパス、コード、プロンプトなし） |
| **Gist の可視性** | **デフォルトでプライベート**（秘密 URL、プロフィールには非表示） |
| **オフラインモード** | `gh` CLI なしで完全にオフラインで動作（ローカルのみモード） |
| **CI/CD** | 非対話型セッションは自動的に検出・除外されます |

## ローカライゼーション

cc-proficiency は 6 つの言語をサポートしています：English、中文、Español、Français、日本語、한국어。

`init` 時にシステム環境からロケールが自動検出されます。変更するには：

```bash
cc-proficiency config locale zh-CN   # 中国語
cc-proficiency config locale es       # スペイン語
cc-proficiency config locale fr       # フランス語
cc-proficiency config locale ja       # 日本語
cc-proficiency config locale ko       # 韓国語
cc-proficiency config locale en       # 英語（デフォルト）
```

SVG バッジは、SVG `<switch>` 要素と `systemLanguage` 属性を使用して、閲覧者の優先言語で自動的に表示されます。6 つの言語すべてが単一の SVG ファイルに埋め込まれており、ロケールごとに別々のバッジを生成する必要はありません。

### 翻訳への貢献

新しい言語を追加するには、`src/i18n/locales/en.ts` を `src/i18n/locales/<code>.ts` にコピーし、すべての文字列を翻訳して、`src/i18n/index.ts` にロケールを登録してください。

## コマンド

| コマンド | 説明 |
|----------|------|
| `cc-proficiency init` | フックと Gist のセットアップ |
| `cc-proficiency analyze [--full]` | セッションを解析してスコアを計算 |
| `cc-proficiency process` | フックからのキュー済みセッションを処理 |
| `cc-proficiency badge [--output <ファイル>]` | SVG バッジを生成 |
| `cc-proficiency push` | バッジを Gist にアップロード |
| `cc-proficiency explain` | スコアの要因とヒントを表示 |
| `cc-proficiency achievements` | 実績の進捗を表示 |
| `cc-proficiency status` | フックの活動、キュー、設定を表示 |
| `cc-proficiency config [キー] [値]` | 設定の表示/変更 |
| `cc-proficiency share [--remove]` | コミュニティリーダーボードに参加/退出 |
| `cc-proficiency leaderboard` | コミュニティランキングを表示 |
| `cc-proficiency update` | 最新バージョンに更新 |
| `cc-proficiency uninstall` | フックの削除とクリーンアップ |

### コミュニティリーダーボード

コミュニティリーダーボードに参加して、他の Claude Code ユーザーと熟練度を比較しましょう：

```bash
# リーダーボードに参加（別途公開プロフィールを作成）
$ cc-proficiency share

# ランキングを表示
$ cc-proficiency leaderboard

# リーダーボードから退出
$ cc-proficiency share --remove
```

プライベートデータ（セッション詳細、プロジェクト名、ファイルパス）は共有されません。スコア、ストリーク、実績数のみが公開されます。完全なドキュメントは [wiki](https://github.com/Z-M-Huang/cc-proficiency/wiki) をご覧ください。

## アーキテクチャ

```
Stop フックが発火 (< 1s)
  → セッションパスを ~/.cc-proficiency/queue.jsonl に書き込み
  → `cc-proficiency process` をデタッチされた子プロセスとして起動

cc-proficiency process
  → queue.lock を取得（60秒超で古いとみなし → 強制取得）
  → session_id で重複排除
  → トランスクリプトを解析（ストリーミング JSONL、行ごとのエラーハンドリング）
  → シグナル抽出 → スコア計算 → SVG レンダリング
  → Gist にプッシュ（設定済みの場合）またはローカルに保存
  → キューをアトミックにローテーション
```

## コントリビューション

コントリビューション歓迎です！変更したい内容について、まず issue を開いて議論してください。

```bash
git clone https://github.com/Z-M-Huang/cc-proficiency.git
cd cc-proficiency
npm install
npm test              # 200 tests
npm run build         # dist/ にコンパイル
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run check         # typecheck + lint + test
```

## ライセンス

[Apache 2.0](LICENSE)

---

<p align="center">
  <sub>Claude Code で構築。Anthropic とは無関係です。</sub>
</p>
