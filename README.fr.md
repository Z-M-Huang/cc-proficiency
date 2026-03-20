<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-Badge_de_Comp%C3%A9tence-7c3aed?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6Ii8+PHBhdGggZD0iTTIgMTdsMTAgNSAxMC01Ii8+PHBhdGggZD0iTTIgMTJsMTAgNSAxMC01Ii8+PC9zdmc+" alt="cc-proficiency" />
</p>

<p align="center">
  <strong>G&eacute;n&eacute;rez un badge de comp&eacute;tence pour votre utilisation de Claude Code, align&eacute; sur les 5 domaines de l'examen Claude Certified Architect.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/cc-proficiency"><img src="https://img.shields.io/npm/v/cc-proficiency?style=flat-square&color=cb3837&logo=npm" alt="version npm" /></a>
  <a href="https://www.npmjs.com/package/cc-proficiency"><img src="https://img.shields.io/npm/dm/cc-proficiency?style=flat-square&color=cb3837&logo=npm" alt="t&eacute;l&eacute;chargements npm" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency"><img src="https://img.shields.io/github/stars/Z-M-Huang/cc-proficiency?style=flat-square&logo=github" alt="GitHub stars" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency/issues"><img src="https://img.shields.io/github/issues/Z-M-Huang/cc-proficiency?style=flat-square&logo=github" alt="GitHub issues" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Z-M-Huang/cc-proficiency?style=flat-square" alt="Licence" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.7+-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/zero-runtime_deps-22c55e?style=flat-square" alt="Z&eacute;ro d&eacute;pendances runtime" />
  <img src="https://img.shields.io/badge/coverage-96%25-brightgreen?style=flat-square" alt="Couverture de tests" />
  <img src="https://visitor-badge.laobi.icu/badge?page_id=Z-M-Huang.cc-proficiency&style=flat-square" alt="Visiteurs" />
</p>

<p align="center">
  <a href="#installation">Installation</a> &nbsp;&middot;&nbsp;
  <a href="#utilisation">Utilisation</a> &nbsp;&middot;&nbsp;
  <a href="#int%C3%A9grer-dans-votre-readme">Int&eacute;grer</a> &nbsp;&middot;&nbsp;
  <a href="#comment-fonctionne-le-scoring">Scoring</a> &nbsp;&middot;&nbsp;
  <a href="#confidentialit%C3%A9">Confidentialit&eacute;</a> &nbsp;&middot;&nbsp;
  <a href="#localisation">Localisation</a> &nbsp;&middot;&nbsp;
  <a href="./README.md">English</a> &middot; <a href="./README.zh-CN.md">中文</a> &middot; <a href="./README.es.md">Espa&ntilde;ol</a> &middot; <strong>Fran&ccedil;ais</strong> &middot; <a href="./README.ja.md">日本語</a> &middot; <a href="./README.ko.md">한국어</a>
</p>

---

## Ce que &ccedil;a fait

Analyse vos transcriptions de sessions Claude Code **localement** avec un moteur bas&eacute; sur des r&egrave;gles, &eacute;valuant les mod&egrave;les d'utilisation dans 5 domaines :

| Domaine | Poids | Ce qu'il mesure |
|---------|-------|-----------------|
| **CC Mastery** | 20% | CLAUDE.md, hooks, plugins, mode plan, skills, r&egrave;gles |
| **Tool & MCP** | 20% | Cha&icirc;nes d'investigation, serveurs MCP, LSP, &eacute;ditions s&eacute;lectives |
| **Agentic** | 20% | Sous-agents, ex&eacute;cution parall&egrave;le, worktrees, gestion de t&acirc;ches |
| **Prompt Craft** | 20% | Prompts structur&eacute;s, blocs de code, traces d'erreurs, raffinement |
| **Context Mgmt** | 20% | M&eacute;moire inter-sessions, mises &agrave; jour CLAUDE.md, projets soutenus |

Affiche &eacute;galement **8 mini-barres de fonctionnalit&eacute;s** (Hooks, Plugins, Skills, MCP, Agents, Plan, Memory, Rules) sous forme de carte thermique.

<p align="center">
  <a href="https://github.com/Z-M-Huang/cc-proficiency">
    <img src="https://gist.githubusercontent.com/Z-M-Huang/2717fa94690c459d5093650c87f49868/raw/cc-proficiency.svg" alt="Badge CC Proficiency &mdash; Statique" />
  </a>
  <br />
  <a href="https://gist.githubusercontent.com/Z-M-Huang/2717fa94690c459d5093650c87f49868/raw/cc-proficiency-animated.svg">Cliquez pour voir la version anim&eacute;e</a>
</p>

> **Avertissement :** Ceci est une estimation d'utilisation non officielle, pas un score de certification Anthropic r&eacute;el. Non affili&eacute; &agrave; ni approuv&eacute; par Anthropic.

## Installation

```bash
npm install -g cc-proficiency
cc-proficiency init
```

`init` va :
1. D&eacute;tecter votre nom d'utilisateur GitHub (via `gh` CLI)
2. Injecter un hook Stop dans `~/.claude/settings.json`
3. Cr&eacute;er un Gist GitHub priv&eacute; pour votre badge (si `gh` est authentifi&eacute;)

Si `gh` n'est pas install&eacute; ou pas authentifi&eacute;, le badge est sauvegard&eacute; localement dans `~/.cc-proficiency/cc-proficiency.svg`.

## Utilisation

### Configuration initiale

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

### Analysez votre comp&eacute;tence

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

### Obtenir des conseils d'am&eacute;lioration

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

### G&eacute;n&eacute;rer et publier votre badge

```bash
# Sauvegarder le badge localement
$ cc-proficiency badge --output my-badge.svg
Badge written to my-badge.svg

# Ou publier directement sur votre Gist
$ cc-proficiency push
✓ Badge pushed to Gist
  https://gist.githubusercontent.com/yourname/a1b2c3d4e5f6/raw/cc-proficiency.svg
```

### Mises &agrave; jour automatiques (z&eacute;ro effort)

Apr&egrave;s `init`, un hook Stop s'ex&eacute;cute automatiquement apr&egrave;s chaque session Claude Code :

```
Vous utilisez Claude Code normalement
  → La session se termine
  → Le hook met la session en file d'attente (<1s, invisible pour vous)
  → Un processus en arri&egrave;re-plan analyse + met &agrave; jour votre badge
  → Le badge de votre README refl&egrave;te vos derniers scores
```

Aucune &eacute;tape manuelle n&eacute;cessaire apr&egrave;s la configuration.

### Sans GitHub CLI

Si vous n'avez pas `gh` install&eacute; ou pr&eacute;f&eacute;rez le mode local uniquement :

```bash
$ cc-proficiency init

  ⚠ GitHub CLI not authenticated.
  Badge will be saved locally to: ~/.cc-proficiency/cc-proficiency.svg
  To enable auto-upload: gh auth login && cc-proficiency init

$ cc-proficiency analyze --full
$ cc-proficiency badge --output badge.svg
```

## Int&eacute;grer dans votre README

Apr&egrave;s avoir ex&eacute;cut&eacute; `cc-proficiency init`, ajoutez ceci &agrave; votre README :

```markdown
<!-- Badge statique -->
![Claude Code Proficiency](https://gist.githubusercontent.com/<username>/<gist-id>/raw/cc-proficiency.svg)

<!-- Badge anim&eacute; (cliquez pour voir) -->
[Cliquez pour voir la version anim&eacute;e](https://gist.githubusercontent.com/<username>/<gist-id>/raw/cc-proficiency-animated.svg)
```

Les deux badges se mettent &agrave; jour automatiquement apr&egrave;s chaque session Claude Code (via le hook Stop).

## Badge progressif

Le badge s'adapte en fonction de la quantit&eacute; de donn&eacute;es disponibles :

| Phase | Sessions | Ce qui est affich&eacute; |
|-------|----------|--------------------------|
| **Calibrage** | 0–2 | Checklist de configuration + progression vers le premier scoring |
| **R&eacute;sultats pr&eacute;liminaires** | 3–9 | 5 barres de domaine + 8 mini-barres de fonctionnalit&eacute;s (indicateurs de faible confiance ○) |
| **Badge complet** | 10+ | Barres de domaine compl&egrave;tes, carte thermique des fonctionnalit&eacute;s, points de confiance (● ◐ ○) |

## Am&eacute;liorez vos scores

Le **[Guide de gamification](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide)** couvre :

- Parcours de progression du premier jour au niveau expert
- Conseils pour chacun des 5 domaines
- Comment d&eacute;bloquer les 15 succ&egrave;s
- Ce qui fait &eacute;voluer chaque mini-barre de fonctionnalit&eacute; de 0 &agrave; 100
- Syst&egrave;me de s&eacute;ries et classement

> **[Gamification Guide](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide)** | **[游戏化攻略（中文）](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide-zh)**

## Comment fonctionne le scoring

### Moteur bas&eacute; sur des r&egrave;gles

cc-proficiency utilise un **moteur de r&egrave;gles &agrave; correspondance de motifs** avec ~55 r&egrave;gles r&eacute;parties sur 5 domaines au lieu de compter les appels d'outils. Chaque r&egrave;gle d&eacute;tecte un mod&egrave;le de comportement sp&eacute;cifique et attribue des points par niveau :

| Niveau | Points | Exemple de r&egrave;gle |
|--------|--------|----------------------|
| **D&eacute;butant** | 5 pts | Poss&egrave;de un CLAUDE.md global |
| **Interm&eacute;diaire** | 10–15 pts | Cha&icirc;ne d'investigation : Grep → Read → Edit |
| **Avanc&eacute;** | 15–25 pts | Agents parall&egrave;les avec diff&eacute;rents types de sous-agents |
| **Anti-pattern** | -5 &agrave; -10 pts | 5+ outils parall&egrave;les avec >50% de taux d'erreur |

### 5 barres de domaine

| Domaine | Ce qu'il mesure |
|---------|-----------------|
| **CC Mastery** | Structure CLAUDE.md, hooks avec matchers, plugins, mode plan, skills, fichiers de r&egrave;gles |
| **Tool & MCP** | Cha&icirc;nes d'investigation, Read-before-Edit, vari&eacute;t&eacute; d'outils, utilisation de serveurs MCP, LSP, &eacute;ditions s&eacute;lectives |
| **Agentic** | Vari&eacute;t&eacute; de types de sous-agents, agents parall&egrave;les, ex&eacute;cutions en arri&egrave;re-plan, worktrees, gestion de t&acirc;ches |
| **Prompt Craft** | Requ&ecirc;tes structur&eacute;es, blocs de code, traces d'erreurs, r&eacute;f&eacute;rences de fichiers, raffinement it&eacute;ratif |
| **Context Mgmt** | Fichiers m&eacute;moire actifs, mises &agrave; jour CLAUDE.md, projets soutenus, profondeur de session |

### 8 mini-barres de fonctionnalit&eacute;s

Sous les barres de domaine, une rang&eacute;e de carte thermique montre la profondeur par fonctionnalit&eacute; :

`Hooks · Plugins · Skills · MCP · Agents · Plan · Memory · Rules`

Chaque mini-barre utilise un **scoring bas&eacute; sur la profondeur** avec des courbes logarithmiques qui refl&egrave;tent l'utilisation r&eacute;elle, pas seulement si vous avez essay&eacute; une fonctionnalit&eacute; une fois. Avoir des hooks configur&eacute;s vous donne ~30 ; les d&eacute;clencher &agrave; travers des centaines de sessions vous rapproche de 100. Consultez le [Guide de gamification](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide) pour plus de d&eacute;tails.

### Agr&eacute;gation par buckets avec plafonds

Les scores ne sont pas des sommes brutes. Chaque domaine a des buckets plafonn&eacute;s :

| Bucket | Points max. | Source |
|--------|------------|--------|
| **Config** | 25 pts | R&egrave;gles bas&eacute;es sur la configuration (CLAUDE.md, hooks, plugins ; disponibles imm&eacute;diatement) |
| **Behavior** | 75 pts | R&egrave;gles bas&eacute;es sur le comportement (motifs de transcription ; croissent avec le temps) |
| **Penalty** | -15 pts max | D&eacute;ductions pour anti-patterns |

Cela signifie :
- Les **nouvelles installations** peuvent obtenir jusqu'&agrave; ~25 points bruts de configuration par domaine (augment&eacute;s &agrave; ~50 pendant le calibrage via une mise &agrave; l'&eacute;chelle 2.0x)
- **Apr&egrave;s le calibrage** (10+ sessions), la configuration seule plafonne &agrave; ~25 par domaine ; les preuves de transcription alimentent le reste
- Les **anti-patterns sont plafonn&eacute;s**, donc quelques mauvaises sessions ne d&eacute;truisent pas votre score

### Pond&eacute;ration adapt&eacute;e &agrave; la phase

Les preuves de configuration sont pond&eacute;r&eacute;es plus fortement pendant le calibrage, moins &agrave; mesure que les transcriptions s'accumulent :

| Phase | Sessions | &Eacute;chelle config | &Eacute;chelle comportement |
|-------|----------|--------------|--------------------------|
| Calibrage | 0–2 | 2.0× | 0.8× |
| Pr&eacute;liminaire | 3–9 | 1.5× | 1.0× |
| Complet | 10+ | 1.0× | 1.15× |

### Anti-triche

- Les r&egrave;gles se d&eacute;clenchent **par session avec des plafonds** ; r&eacute;p&eacute;ter le m&ecirc;me outil 100 fois n'aide pas
- Les **r&egrave;gles anti-pattern** d&eacute;duisent des points pour les mauvaises habitudes (appels parall&egrave;les en rafale, blocs de texte non structur&eacute;s)
- Chaque r&egrave;gle a un `maxPerSession` ; les cha&icirc;nes d'investigation sont limit&eacute;es &agrave; 3 par session
- Les scores de configuration sont **plafonn&eacute;s &agrave; 25**, vous ne pouvez donc pas maximiser un domaine en installant simplement des plugins

## Confidentialit&eacute;

| Aspect | Comment c'est g&eacute;r&eacute; |
|--------|-------------------------------|
| **Emplacement des donn&eacute;es** | Toute l'analyse se fait **localement** sur votre machine |
| **Ce qui est stock&eacute;** | Uniquement des comptages agr&eacute;g&eacute;s, des ratios et des flags bool&eacute;ens (pas de chemins de fichiers, de code ou de prompts) |
| **Visibilit&eacute; du Gist** | **Priv&eacute; par d&eacute;faut** (URL secr&egrave;te, non list&eacute; sur votre profil) |
| **Mode hors ligne** | Fonctionne enti&egrave;rement hors ligne sans `gh` CLI (mode local uniquement) |
| **CI/CD** | Les sessions non interactives sont automatiquement d&eacute;tect&eacute;es et exclues |

## Localisation

cc-proficiency supporte 6 langues : English, 中文, Espa&ntilde;ol, Fran&ccedil;ais, 日本語, 한국어.

Votre langue est auto-d&eacute;tect&eacute;e depuis l'environnement syst&egrave;me lors de `init`. Pour la changer :

```bash
cc-proficiency config locale zh-CN   # Chinois
cc-proficiency config locale es       # Espagnol
cc-proficiency config locale fr       # Fran&ccedil;ais
cc-proficiency config locale ja       # Japonais
cc-proficiency config locale ko       # Cor&eacute;en
cc-proficiency config locale en       # Anglais (par d&eacute;faut)
```

Les badges SVG s'affichent automatiquement dans la langue pr&eacute;f&eacute;r&eacute;e du spectateur gr&acirc;ce aux &eacute;l&eacute;ments SVG `<switch>` avec des attributs `systemLanguage`. Les 6 langues sont int&eacute;gr&eacute;es dans un seul fichier SVG &mdash; pas besoin de g&eacute;n&eacute;rer des badges s&eacute;par&eacute;s par langue.

### Contribuer des traductions

Pour ajouter une nouvelle langue, copiez `src/i18n/locales/en.ts` vers `src/i18n/locales/<code>.ts`, traduisez toutes les cha&icirc;nes et enregistrez la langue dans `src/i18n/index.ts`.

## Commandes

| Commande | Description |
|----------|-------------|
| `cc-proficiency init` | Configurer les hooks et le Gist |
| `cc-proficiency analyze [--full]` | Analyser les sessions et calculer les scores |
| `cc-proficiency process` | Traiter les sessions en file d'attente depuis le hook |
| `cc-proficiency badge [--output <fichier>]` | G&eacute;n&eacute;rer un badge SVG |
| `cc-proficiency push` | T&eacute;l&eacute;verser le badge vers le Gist |
| `cc-proficiency explain` | Afficher les facteurs de score et les conseils |
| `cc-proficiency achievements` | Voir la progression des succ&egrave;s |
| `cc-proficiency status` | Afficher l'activit&eacute; du hook, la file d'attente et la configuration |
| `cc-proficiency config [cl&eacute;] [valeur]` | Voir/modifier la configuration |
| `cc-proficiency share [--remove]` | Rejoindre ou quitter le classement communautaire |
| `cc-proficiency leaderboard` | Voir les classements de la communaut&eacute; |
| `cc-proficiency update` | Mettre &agrave; jour vers la derni&egrave;re version |
| `cc-proficiency uninstall` | Supprimer les hooks et nettoyer |

### Classement communautaire

Rejoignez le classement communautaire pour comparer votre comp&eacute;tence avec d'autres utilisateurs de Claude Code :

```bash
# Rejoindre le classement (cr&eacute;e un profil public s&eacute;par&eacute;)
$ cc-proficiency share

# Voir les classements
$ cc-proficiency leaderboard

# Quitter le classement
$ cc-proficiency share --remove
```

Vos donn&eacute;es priv&eacute;es (d&eacute;tails de session, noms de projets, chemins de fichiers) ne sont jamais partag&eacute;es. Seuls les scores, la s&eacute;rie et le nombre de succ&egrave;s sont publics. Consultez le [wiki](https://github.com/Z-M-Huang/cc-proficiency/wiki) pour la documentation compl&egrave;te.

## Architecture

```
Le hook Stop se d&eacute;clenche (< 1s)
  → &Eacute;crit le chemin de session dans ~/.cc-proficiency/queue.jsonl
  → Lance `cc-proficiency process` comme processus enfant d&eacute;tach&eacute;

cc-proficiency process
  → Acquiert queue.lock (obsol&egrave;te >60s → forcer)
  → D&eacute;duplique par session_id
  → Analyse les transcriptions (JSONL en streaming, gestion d'erreurs par ligne)
  → Extrait les signaux → calcule les scores → g&eacute;n&egrave;re le SVG
  → Pousse vers le Gist (si configur&eacute;) ou sauvegarde localement
  → Effectue la rotation de la file d'attente de mani&egrave;re atomique
```

## Contribuer

Les contributions sont les bienvenues ! Veuillez d'abord ouvrir une issue pour discuter de ce que vous souhaitez modifier.

```bash
git clone https://github.com/Z-M-Huang/cc-proficiency.git
cd cc-proficiency
npm install
npm test              # 200 tests
npm run build         # compiler vers dist/
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run check         # typecheck + lint + test
```

## Licence

[Apache 2.0](LICENSE)

---

<p align="center">
  <sub>Construit avec Claude Code. Non affili&eacute; &agrave; ni approuv&eacute; par Anthropic.</sub>
</p>
