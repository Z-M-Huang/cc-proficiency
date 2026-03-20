<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-%EC%88%99%EB%A0%A8%EB%8F%84_%EB%B0%B0%EC%A7%80-7c3aed?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6Ii8+PHBhdGggZD0iTTIgMTdsMTAgNSAxMC01Ii8+PHBhdGggZD0iTTIgMTJsMTAgNSAxMC01Ii8+PC9zdmc+" alt="cc-proficiency" />
</p>

<p align="center">
  <strong>Claude Code 사용 현황을 기반으로 숙련도 배지를 생성합니다. Claude Certified Architect 시험의 5개 도메인에 맞춰져 있습니다.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/cc-proficiency"><img src="https://img.shields.io/npm/v/cc-proficiency?style=flat-square&color=cb3837&logo=npm" alt="npm 버전" /></a>
  <a href="https://www.npmjs.com/package/cc-proficiency"><img src="https://img.shields.io/npm/dm/cc-proficiency?style=flat-square&color=cb3837&logo=npm" alt="npm 다운로드" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency"><img src="https://img.shields.io/github/stars/Z-M-Huang/cc-proficiency?style=flat-square&logo=github" alt="GitHub stars" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency/issues"><img src="https://img.shields.io/github/issues/Z-M-Huang/cc-proficiency?style=flat-square&logo=github" alt="GitHub issues" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Z-M-Huang/cc-proficiency?style=flat-square" alt="라이선스" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.7+-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/zero-runtime_deps-22c55e?style=flat-square" alt="런타임 의존성 없음" />
  <img src="https://img.shields.io/badge/coverage-96%25-brightgreen?style=flat-square" alt="테스트 커버리지" />
  <img src="https://visitor-badge.laobi.icu/badge?page_id=Z-M-Huang.cc-proficiency&style=flat-square" alt="방문자" />
</p>

<p align="center">
  <a href="#설치">설치</a> &nbsp;&middot;&nbsp;
  <a href="#사용법">사용법</a> &nbsp;&middot;&nbsp;
  <a href="#readme에-삽입하기">삽입</a> &nbsp;&middot;&nbsp;
  <a href="#스코어링-방식">스코어링</a> &nbsp;&middot;&nbsp;
  <a href="#개인정보-보호">개인정보</a> &nbsp;&middot;&nbsp;
  <a href="#현지화">현지화</a> &nbsp;&middot;&nbsp;
  <a href="./README.md">English</a> &middot; <a href="./README.zh-CN.md">中文</a> &middot; <a href="./README.es.md">Espa&ntilde;ol</a> &middot; <a href="./README.fr.md">Fran&ccedil;ais</a> &middot; <a href="./README.ja.md">日本語</a> &middot; <strong>한국어</strong>
</p>

---

## 기능 소개

Claude Code 세션 기록을 **로컬**에서 규칙 기반 엔진으로 분석하여, 5개 도메인의 사용 패턴을 평가합니다:

| 도메인 | 비중 | 측정 내용 |
|--------|------|-----------|
| **CC Mastery** | 20% | CLAUDE.md, 훅, 플러그인, 플랜 모드, 스킬, 규칙 |
| **Tool & MCP** | 20% | 조사 체인, MCP 서버, LSP, 선택적 편집 |
| **Agentic** | 20% | 서브에이전트, 병렬 실행, 워크트리, 작업 관리 |
| **Prompt Craft** | 20% | 구조화된 프롬프트, 코드 블록, 오류 추적, 개선 |
| **Context Mgmt** | 20% | 세션 간 메모리, CLAUDE.md 업데이트, 지속 프로젝트 |

또한 **8개 기능 미니바**(Hooks, Plugins, Skills, MCP, Agents, Plan, Memory, Rules)를 히트맵 행으로 표시합니다.

<p align="center">
  <a href="https://github.com/Z-M-Huang/cc-proficiency">
    <img src="https://gist.githubusercontent.com/Z-M-Huang/2717fa94690c459d5093650c87f49868/raw/cc-proficiency.svg" alt="CC Proficiency 배지 — 정적" />
  </a>
  <br />
  <a href="https://gist.githubusercontent.com/Z-M-Huang/2717fa94690c459d5093650c87f49868/raw/cc-proficiency-animated.svg">애니메이션 버전 보기</a>
</p>

> **면책 조항:** 이것은 비공식 사용 추정이며, Anthropic의 실제 인증 점수가 아닙니다. Anthropic과 무관합니다.

## 설치

```bash
npm install -g cc-proficiency
cc-proficiency init
```

`init`은 다음을 수행합니다:
1. GitHub 사용자명 감지 (`gh` CLI 사용)
2. `~/.claude/settings.json`에 Stop 훅 주입
3. 배지용 비공개 GitHub Gist 생성 (`gh`가 인증된 경우)

`gh`가 설치되지 않았거나 인증되지 않은 경우, 배지는 `~/.cc-proficiency/cc-proficiency.svg`에 로컬로 저장됩니다.

## 사용법

### 초기 설정

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

### 숙련도 분석

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

### 개선 팁 확인

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

### 배지 생성 및 푸시

```bash
# 배지를 로컬에 저장
$ cc-proficiency badge --output my-badge.svg
Badge written to my-badge.svg

# 또는 Gist에 직접 푸시
$ cc-proficiency push
✓ Badge pushed to Gist
  https://gist.githubusercontent.com/yourname/a1b2c3d4e5f6/raw/cc-proficiency.svg
```

### 자동 업데이트 (무설정)

`init` 후, Claude Code 세션이 종료될 때마다 Stop 훅이 자동으로 실행됩니다:

```
평소처럼 Claude Code 사용
  → 세션 종료
  → 훅이 세션을 큐에 추가 (<1초, 사용자에게 보이지 않음)
  → 백그라운드 프로세스가 분석 + 배지 업데이트
  → README의 배지에 최신 점수 반영
```

설정 후 수동 작업이 필요 없습니다.

### GitHub CLI 없이 사용

`gh`가 설치되지 않았거나 로컬 전용 모드를 선호하는 경우:

```bash
$ cc-proficiency init

  ⚠ GitHub CLI not authenticated.
  Badge will be saved locally to: ~/.cc-proficiency/cc-proficiency.svg
  To enable auto-upload: gh auth login && cc-proficiency init

$ cc-proficiency analyze --full
$ cc-proficiency badge --output badge.svg
```

## README에 삽입하기

`cc-proficiency init`을 실행한 후, README에 다음을 추가합니다:

```markdown
<!-- 정적 배지 -->
![Claude Code Proficiency](https://gist.githubusercontent.com/<username>/<gist-id>/raw/cc-proficiency.svg)

<!-- 애니메이션 배지 (클릭하여 보기) -->
[애니메이션 버전 보기](https://gist.githubusercontent.com/<username>/<gist-id>/raw/cc-proficiency-animated.svg)
```

두 배지 모두 Claude Code 세션마다 자동 업데이트됩니다 (Stop 훅 경유).

## 점진적 배지

배지는 사용 가능한 데이터 양에 따라 자동 조정됩니다:

| 단계 | 세션 수 | 표시 내용 |
|------|---------|-----------|
| **보정 중** | 0–2 | 설정 체크리스트 + 첫 스코어링을 향한 진행률 |
| **초기 결과** | 3–9 | 5개 도메인 바 + 8개 기능 미니바 (낮은 신뢰도 표시 ○) |
| **전체 배지** | 10+ | 전체 도메인 바, 기능 히트맵, 신뢰도 점 (● ◐ ○) |

## 점수 개선하기

**[게이미피케이션 가이드](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide)**에서 다루는 내용:

- 첫날부터 전문가 수준까지의 진행 경로
- 5개 도메인 각각에 대한 팁
- 15개 업적 전체 잠금 해제 방법
- 각 기능 미니바를 0에서 100으로 올리는 요인
- 스트릭 시스템과 리더보드

> **[Gamification Guide](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide)** | **[游戏化攻略（中文）](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide-zh)**

## 스코어링 방식

### 규칙 기반 엔진

cc-proficiency는 도구 호출 횟수를 세는 대신, 5개 도메인에 걸쳐 ~55개의 규칙을 가진 **패턴 매칭 규칙 엔진**을 사용합니다. 각 규칙은 특정 행동 패턴을 감지하고 티어별로 점수를 부여합니다:

| 티어 | 점수 | 규칙 예시 |
|------|------|-----------|
| **초급** | 5 pts | 글로벌 CLAUDE.md 보유 |
| **중급** | 10–15 pts | 조사 체인: Grep → Read → Edit |
| **고급** | 15–25 pts | 다양한 서브에이전트 유형의 병렬 에이전트 |
| **안티패턴** | -5 ~ -10 pts | 5+ 병렬 도구에서 오류율 >50% |

### 5개 도메인 바

| 도메인 | 측정 내용 |
|--------|-----------|
| **CC Mastery** | CLAUDE.md 구조, 매처 포함 훅, 플러그인, 플랜 모드, 스킬, 규칙 파일 |
| **Tool & MCP** | 조사 체인, Read-before-Edit, 도구 다양성, MCP 서버 사용, LSP, 선택적 편집 |
| **Agentic** | 서브에이전트 유형 다양성, 병렬 에이전트, 백그라운드 실행, 워크트리, 작업 관리 |
| **Prompt Craft** | 구조화된 요청, 코드 블록, 오류 추적, 파일 참조, 반복적 개선 |
| **Context Mgmt** | 활성 메모리 파일, CLAUDE.md 업데이트, 지속 프로젝트, 세션 깊이 |

### 8개 기능 미니바

도메인 바 아래에 기능별 깊이를 보여주는 히트맵 행이 있습니다:

`Hooks · Plugins · Skills · MCP · Agents · Plan · Memory · Rules`

각 미니바는 기능을 한 번 사용해 봤는지가 아니라 실제 사용량을 반영하는 대수 곡선의 **깊이 기반 스코어링**을 사용합니다. 훅이 구성되면 ~30점을 획득하고, 수백 개의 세션에서 훅이 실행되면 100에 가까워집니다. 자세한 내용은 [게이미피케이션 가이드](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide)를 참조하세요.

### 버킷 집계와 상한

점수는 단순 합계가 아닙니다. 각 도메인에는 상한이 있는 버킷이 있습니다:

| 버킷 | 최대 점수 | 소스 |
|------|----------|------|
| **Config** | 25 pts | 설정 기반 규칙 (CLAUDE.md, 훅, 플러그인; 즉시 사용 가능) |
| **Behavior** | 75 pts | 행동 기반 규칙 (트랜스크립트 패턴; 시간이 지남에 따라 성장) |
| **Penalty** | -15 pts 최대 | 안티패턴 감점 |

이것의 의미:
- **신규 설치**는 도메인당 최대 ~25의 설정 점수를 획득 가능 (보정 중에는 2.0x 스케일링으로 ~50까지 증가)
- **보정 후** (10+ 세션) 설정만으로는 도메인당 ~25가 상한; 트랜스크립트 증거가 나머지를 견인
- **안티패턴에는 상한**이 있으므로, 몇 번의 나쁜 세션이 점수를 파괴하지 않음

### 단계 인식 가중치

설정 증거는 보정 중에 더 무겁게, 트랜스크립트가 축적됨에 따라 더 가볍게 가중됩니다:

| 단계 | 세션 수 | 설정 스케일 | 행동 스케일 |
|------|---------|------------|------------|
| 보정 중 | 0–2 | 2.0× | 0.8× |
| 초기 | 3–9 | 1.5× | 1.0× |
| 전체 | 10+ | 1.0× | 1.15× |

### 부정 행위 방지

- 규칙은 **세션당 상한 적용**으로 발동됩니다; 같은 도구를 100번 반복해도 효과 없음
- **안티패턴 규칙**은 나쁜 습관에 대해 점수를 감점합니다 (산발적 병렬 호출, 구조화되지 않은 텍스트)
- 각 규칙에 `maxPerSession`이 있습니다; 조사 체인은 세션당 3회 상한
- 설정 점수는 **25가 상한**이므로, 플러그인만 설치해서 도메인을 최대화할 수 없음

## 개인정보 보호

| 항목 | 처리 방식 |
|------|-----------|
| **데이터 위치** | 모든 분석은 **로컬 머신**에서 수행됩니다 |
| **저장 내용** | 집계 카운트, 비율, 불리언 플래그만 저장 (파일 경로, 코드, 프롬프트 없음) |
| **Gist 가시성** | **기본적으로 비공개** (비밀 URL, 프로필에 표시되지 않음) |
| **오프라인 모드** | `gh` CLI 없이 완전히 오프라인으로 작동 (로컬 전용 모드) |
| **CI/CD** | 비대화형 세션은 자동으로 감지 및 제외됩니다 |

## 현지화

cc-proficiency는 6개 언어를 지원합니다: English, 中文, Español, Français, 日本語, 한국어.

`init` 시 시스템 환경에서 로케일이 자동 감지됩니다. 변경하려면:

```bash
cc-proficiency config locale zh-CN   # 중국어
cc-proficiency config locale es       # 스페인어
cc-proficiency config locale fr       # 프랑스어
cc-proficiency config locale ja       # 일본어
cc-proficiency config locale ko       # 한국어
cc-proficiency config locale en       # 영어 (기본값)
```

SVG 배지는 SVG `<switch>` 요소와 `systemLanguage` 속성을 사용하여 보는 사람의 선호 언어로 자동 표시됩니다. 6개 언어 모두 하나의 SVG 파일에 포함되어 있어 로케일별로 별도의 배지를 생성할 필요가 없습니다.

### 번역 기여

새 언어를 추가하려면 `src/i18n/locales/en.ts`를 `src/i18n/locales/<code>.ts`로 복사하고, 모든 문자열을 번역한 후, `src/i18n/index.ts`에 로케일을 등록하세요.

## 명령어

| 명령어 | 설명 |
|--------|------|
| `cc-proficiency init` | 훅 및 Gist 설정 |
| `cc-proficiency analyze [--full]` | 세션 분석 및 점수 계산 |
| `cc-proficiency process` | 훅에서 대기 중인 세션 처리 |
| `cc-proficiency badge [--output <파일>]` | SVG 배지 생성 |
| `cc-proficiency push` | 배지를 Gist에 업로드 |
| `cc-proficiency explain` | 점수 요인 및 팁 표시 |
| `cc-proficiency achievements` | 업적 진행 상황 보기 |
| `cc-proficiency status` | 훅 활동, 큐, 설정 표시 |
| `cc-proficiency config [키] [값]` | 설정 보기/변경 |
| `cc-proficiency share [--remove]` | 커뮤니티 리더보드 참가/탈퇴 |
| `cc-proficiency leaderboard` | 커뮤니티 랭킹 보기 |
| `cc-proficiency update` | 최신 버전으로 업데이트 |
| `cc-proficiency uninstall` | 훅 제거 및 정리 |

### 커뮤니티 리더보드

커뮤니티 리더보드에 참가하여 다른 Claude Code 사용자와 숙련도를 비교하세요:

```bash
# 리더보드 참가 (별도의 공개 프로필 생성)
$ cc-proficiency share

# 랭킹 보기
$ cc-proficiency leaderboard

# 리더보드 탈퇴
$ cc-proficiency share --remove
```

개인 데이터(세션 세부 정보, 프로젝트 이름, 파일 경로)는 공유되지 않습니다. 점수, 스트릭, 업적 수만 공개됩니다. 전체 문서는 [wiki](https://github.com/Z-M-Huang/cc-proficiency/wiki)를 참조하세요.

## 아키텍처

```
Stop 훅 발동 (< 1s)
  → 세션 경로를 ~/.cc-proficiency/queue.jsonl에 기록
  → `cc-proficiency process`를 분리된 자식 프로세스로 실행

cc-proficiency process
  → queue.lock 획득 (60초 초과 시 만료 → 강제 획득)
  → session_id로 중복 제거
  → 트랜스크립트 분석 (스트리밍 JSONL, 라인별 오류 처리)
  → 시그널 추출 → 점수 계산 → SVG 렌더링
  → Gist에 푸시 (설정된 경우) 또는 로컬에 저장
  → 큐를 원자적으로 교체
```

## 기여하기

기여를 환영합니다! 변경하고 싶은 내용에 대해 먼저 issue를 열어 논의해 주세요.

```bash
git clone https://github.com/Z-M-Huang/cc-proficiency.git
cd cc-proficiency
npm install
npm test              # 200 tests
npm run build         # dist/로 컴파일
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run check         # typecheck + lint + test
```

## 라이선스

[Apache 2.0](LICENSE)

---

<p align="center">
  <sub>Claude Code로 구축되었습니다. Anthropic과 무관합니다.</sub>
</p>
