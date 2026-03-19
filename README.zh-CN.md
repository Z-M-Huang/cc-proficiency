<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-能力徽章-7c3aed?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6Ii8+PHBhdGggZD0iTTIgMTdsMTAgNSAxMC01Ii8+PHBhdGggZD0iTTIgMTJsMTAgNSAxMC01Ii8+PC9zdmc+" alt="cc-proficiency" />
</p>

<p align="center">
  <strong>为你的 Claude Code 使用生成能力徽章，对齐 Claude Certified Architect 认证考试的 5 个领域。</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/cc-proficiency"><img src="https://img.shields.io/npm/v/cc-proficiency?style=flat-square&color=cb3837&logo=npm" alt="npm 版本" /></a>
  <a href="https://www.npmjs.com/package/cc-proficiency"><img src="https://img.shields.io/npm/dm/cc-proficiency?style=flat-square&color=cb3837&logo=npm" alt="npm 下载量" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency"><img src="https://img.shields.io/github/stars/Z-M-Huang/cc-proficiency?style=flat-square&logo=github" alt="GitHub stars" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency/issues"><img src="https://img.shields.io/github/issues/Z-M-Huang/cc-proficiency?style=flat-square&logo=github" alt="GitHub issues" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Z-M-Huang/cc-proficiency?style=flat-square" alt="许可证" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.7+-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/zero-runtime_deps-22c55e?style=flat-square" alt="零运行时依赖" />
  <img src="https://img.shields.io/badge/coverage-96%25-brightgreen?style=flat-square" alt="测试覆盖率" />
  <img src="https://visitor-badge.laobi.icu/badge?page_id=Z-M-Huang.cc-proficiency&style=flat-square" alt="访客" />
</p>

<p align="center">
  <a href="#安装">安装</a> &nbsp;·&nbsp;
  <a href="#使用方法">使用</a> &nbsp;·&nbsp;
  <a href="#嵌入到你的-readme">嵌入</a> &nbsp;·&nbsp;
  <a href="#评分系统">评分</a> &nbsp;·&nbsp;
  <a href="#隐私">隐私</a> &nbsp;·&nbsp;
  <a href="./README.md">English</a>
</p>

---

## 功能介绍

使用**基于规则的引擎**在本地分析你的 Claude Code 会话记录，从 5 个领域评估你的使用模式：

| 领域 | 权重 | 衡量内容 |
|------|------|---------|
| **CC 掌握** | 20% | CLAUDE.md、钩子、插件、计划模式、技能、规则文件 |
| **工具 & MCP** | 20% | 调查链、MCP 服务器、LSP、选择性编辑 |
| **智能体** | 20% | 子代理、并行执行、工作树、任务管理 |
| **提示词** | 20% | 结构化请求、代码块、错误跟踪、迭代优化 |
| **上下文** | 20% | 跨会话记忆、CLAUDE.md 更新、持续项目 |

另外还有 **8 个特性迷你条**（钩子、插件、技能、MCP、代理、计划、记忆、规则），以热力图形式展示各特性的使用程度。

<p align="center">
  <a href="https://github.com/Z-M-Huang/cc-proficiency">
    <img src="https://gist.githubusercontent.com/Z-M-Huang/2717fa94690c459d5093650c87f49868/raw/cc-proficiency.svg" alt="CC Proficiency 徽章 — 静态" />
  </a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency">
    <img src="https://gist.githubusercontent.com/Z-M-Huang/2717fa94690c459d5093650c87f49868/raw/cc-proficiency-animated.svg" alt="CC Proficiency 徽章 — 动画" />
  </a>
</p>

> **声明：** 这是一个非官方的使用评估工具，不代表 Anthropic 官方认证分数。与 Anthropic 无关联。

## 安装

```bash
npm install -g cc-proficiency
cc-proficiency init
```

`init` 会：
1. 检测你的 GitHub 用户名（通过 `gh` CLI）
2. 在 `~/.claude/settings.json` 中注入 Stop 钩子
3. 创建一个私有 GitHub Gist 用于存放徽章（如果 `gh` 已认证）

如果 `gh` 未安装或未认证，徽章将保存到本地 `~/.cc-proficiency/cc-proficiency.svg`。

## 使用方法

### 分析你的能力

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
  139 sessions · 4 projects
```

### 获取改进建议

```bash
$ cc-proficiency explain

  Claude Code Proficiency — @yourname

  Strengths:
    Context Mgmt   100/100
    Tool & MCP      96/100
    Prompt Craft    81/100

  Areas to Improve:
    Agentic (69/100)
       → 使用不同类型的子代理、尝试并行代理和工作树
    CC Mastery (77/100)
       → 增强 CLAUDE.md、添加带匹配器的钩子、创建规则文件
```

### 生成和推送徽章

```bash
# 保存到本地
$ cc-proficiency badge --output my-badge.svg

# 推送到 GitHub Gist
$ cc-proficiency push
```

### 切换到中文徽章

```bash
cc-proficiency config locale zh-CN
cc-proficiency badge
```

### 自动更新（零操作）

`init` 之后，每次 Claude Code 会话结束时 Stop 钩子自动运行：

```
正常使用 Claude Code
  → 会话结束
  → 钩子将会话加入队列（<1秒，无感知）
  → 后台进程分析 + 更新徽章
  → README 中的徽章自动反映最新分数
```

## 嵌入到你的 README

运行 `cc-proficiency init` 后，在 README 中添加：

```markdown
<!-- 静态徽章 -->
![Claude Code Proficiency](https://gist.githubusercontent.com/<用户名>/<gist-id>/raw/cc-proficiency.svg)

<!-- 动画徽章（加载时进度条填充） -->
![Claude Code Proficiency](https://gist.githubusercontent.com/<用户名>/<gist-id>/raw/cc-proficiency-animated.svg)
```

## 渐进式徽章

徽章根据可用数据量自动调整：

| 阶段 | 会话数 | 展示内容 |
|------|--------|---------|
| **校准中** | 0–2 | 配置检查清单 + 进度 |
| **初步结果** | 3–9 | 5 个领域条 + 8 个特性迷你条（低置信度 ○） |
| **完整徽章** | 10+ | 完整领域条、特性热力图、置信度圆点（● ◐ ○） |

## 提升分数

**[游戏化攻略](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide-zh)** 涵盖：

- 从第一天到专家级的进阶路径
- 5 个领域的提升技巧
- 解锁全部 15 个成就的方法
- 每个特性迷你条从 0 到 100 的具体指南
- 连续打卡和排行榜

> **[游戏化攻略（中文）](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide-zh)** | **[Gamification Guide (English)](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide)**

## 评分系统

### 基于规则的引擎

cc-proficiency 使用 **~55 条模式匹配规则**，而不是简单计数：

| 级别 | 分值 | 示例规则 |
|------|------|---------|
| **入门** | 5 分 | 拥有全局 CLAUDE.md |
| **中级** | 10-15 分 | 调查链：Grep → Read → Edit |
| **高级** | 15-25 分 | 使用不同类型的并行子代理 |
| **反模式** | -5 至 -10 分 | 5+ 并行工具且错误率 >50% |

### 5 个领域条

| 领域 | 衡量内容 |
|------|---------|
| **CC 掌握** | CLAUDE.md 结构、带匹配器的钩子、插件、计划模式、技能、规则文件 |
| **工具 & MCP** | 调查链、先读后改、工具多样性、MCP 服务器、LSP、选择性编辑 |
| **智能体** | 子代理类型多样性、并行代理、后台运行、工作树、任务管理 |
| **提示词** | 结构化请求、代码块、错误跟踪、文件引用、迭代优化 |
| **上下文** | 活跃记忆文件、CLAUDE.md 更新、持续项目、会话深度 |

### 8 个特性迷你条

领域条下方，热力图行展示各特性的使用深度：

`钩子 · 插件 · 技能 · MCP · 代理 · 计划 · 记忆 · 规则`

每个迷你条使用**深度评分**，对数曲线反映实际使用情况，不只看你是否试过某个功能。配置钩子能拿到 ~30 分；在数百个会话中触发钩子才能接近 100 分。详见[游戏化攻略](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide-zh)。

### 桶聚合与上限

| 桶 | 最大分值 | 来源 |
|----|---------|------|
| **配置** | 25 分 | 配置规则（CLAUDE.md、钩子、插件，立即可用） |
| **行为** | 75 分 | 行为规则（会话模式，随时间增长） |
| **惩罚** | -15 分上限 | 反模式扣分 |

### 阶段感知权重

| 阶段 | 会话数 | 配置缩放 | 行为缩放 |
|------|--------|---------|---------|
| 校准中 | 0–2 | 2.0× | 0.8× |
| 初步 | 3–9 | 1.5× | 1.0× |
| 完整 | 10+ | 1.0× | 1.15× |

### 防作弊

- 规则**按会话上限触发**，重复相同工具 100 次无效
- **反模式规则**对不良习惯扣分
- 每条规则有 `maxPerSession`，调查链每会话上限 3 次
- 配置分数**上限 25**，仅安装插件无法达到满分

## 隐私

| 关注点 | 处理方式 |
|--------|---------|
| **数据位置** | 所有分析**在本地机器**上进行 |
| **存储内容** | 仅存储聚合计数、比率和布尔标志（无文件路径、代码或提示词） |
| **Gist 可见性** | **默认私有**（秘密 URL，不在个人资料中列出） |
| **离线模式** | 无需 `gh` CLI 即可完全离线工作（仅本地模式） |
| **CI/CD** | 非交互式会话自动检测并排除 |

## 命令

| 命令 | 描述 |
|------|------|
| `cc-proficiency init` | 设置钩子和 Gist |
| `cc-proficiency analyze [--full]` | 解析会话并计算分数 |
| `cc-proficiency process` | 处理钩子队列中的会话 |
| `cc-proficiency badge [--output <文件>]` | 生成 SVG 徽章 |
| `cc-proficiency push` | 上传徽章到 Gist |
| `cc-proficiency explain` | 显示分数驱动因素和建议 |
| `cc-proficiency achievements` | 查看成就进度 |
| `cc-proficiency status` | 显示钩子活动、队列和配置 |
| `cc-proficiency config [键] [值]` | 查看/设置配置 |
| `cc-proficiency config locale zh-CN` | 切换到中文徽章 |
| `cc-proficiency share [--remove]` | 加入或退出社区排行榜 |
| `cc-proficiency leaderboard` | 查看社区排名 |
| `cc-proficiency uninstall` | 移除钩子和清理数据 |

## 架构

```
Stop 钩子触发 (< 1秒)
  → 将会话路径写入 ~/.cc-proficiency/queue.jsonl
  → 启动 `cc-proficiency process` 作为后台子进程

cc-proficiency process
  → 获取 queue.lock（超过60秒视为过期 → 强制获取）
  → 按 session_id 去重
  → 解析会话记录（流式 JSONL，逐行错误处理）
  → 触发规则 → 计算分数 → 渲染 SVG
  → 推送到 Gist（如已配置）或保存到本地
  → 原子替换队列
```

## 贡献

欢迎贡献！请先开一个 issue 讨论你想要做的改动。

```bash
git clone https://github.com/Z-M-Huang/cc-proficiency.git
cd cc-proficiency
npm install
npm test              # 200 tests
npm run build         # 编译到 dist/
npm run typecheck     # tsc --noEmit
```

## 许可证

[Apache 2.0](LICENSE)

---

<p align="center">
  <sub>使用 Claude Code 构建。与 Anthropic 无关联。</sub>
</p>
