<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-Insignia_de_Competencia-7c3aed?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6Ii8+PHBhdGggZD0iTTIgMTdsMTAgNSAxMC01Ii8+PHBhdGggZD0iTTIgMTJsMTAgNSAxMC01Ii8+PC9zdmc+" alt="cc-proficiency" />
</p>

<p align="center">
  <strong>Genera una insignia de competencia para tu uso de Claude Code, alineada con los 5 dominios del examen Claude Certified Architect.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/cc-proficiency"><img src="https://img.shields.io/npm/v/cc-proficiency?style=flat-square&color=cb3837&logo=npm" alt="versi&oacute;n npm" /></a>
  <a href="https://www.npmjs.com/package/cc-proficiency"><img src="https://img.shields.io/npm/dm/cc-proficiency?style=flat-square&color=cb3837&logo=npm" alt="descargas npm" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency"><img src="https://img.shields.io/github/stars/Z-M-Huang/cc-proficiency?style=flat-square&logo=github" alt="GitHub stars" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency/issues"><img src="https://img.shields.io/github/issues/Z-M-Huang/cc-proficiency?style=flat-square&logo=github" alt="GitHub issues" /></a>
  <a href="https://github.com/Z-M-Huang/cc-proficiency/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Z-M-Huang/cc-proficiency?style=flat-square" alt="Licencia" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.7+-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/zero-runtime_deps-22c55e?style=flat-square" alt="Cero dependencias en tiempo de ejecuci&oacute;n" />
  <img src="https://img.shields.io/badge/coverage-96%25-brightgreen?style=flat-square" alt="Cobertura de tests" />
  <img src="https://visitor-badge.laobi.icu/badge?page_id=Z-M-Huang.cc-proficiency&style=flat-square" alt="Visitantes" />
</p>

<p align="center">
  <a href="#instalaci%C3%B3n">Instalar</a> &nbsp;&middot;&nbsp;
  <a href="#uso">Uso</a> &nbsp;&middot;&nbsp;
  <a href="#insertar-en-tu-readme">Insertar</a> &nbsp;&middot;&nbsp;
  <a href="#c%C3%B3mo-funciona-la-puntuaci%C3%B3n">Puntuaci&oacute;n</a> &nbsp;&middot;&nbsp;
  <a href="#privacidad">Privacidad</a> &nbsp;&middot;&nbsp;
  <a href="#localizaci%C3%B3n">Localizaci&oacute;n</a> &nbsp;&middot;&nbsp;
  <a href="./README.md">English</a> &middot; <a href="./README.zh-CN.md">中文</a> &middot; <strong>Espa&ntilde;ol</strong> &middot; <a href="./README.fr.md">Fran&ccedil;ais</a> &middot; <a href="./README.ja.md">日本語</a> &middot; <a href="./README.ko.md">한국어</a>
</p>

---

## Qu&eacute; hace

Analiza los registros de tus sesiones de Claude Code **localmente** con un motor basado en reglas, evaluando patrones de uso en 5 dominios:

| Dominio | Peso | Qu&eacute; mide |
|---------|------|-----------------|
| **CC Mastery** | 20% | CLAUDE.md, hooks, plugins, modo plan, skills, reglas |
| **Tool & MCP** | 20% | Cadenas de investigaci&oacute;n, servidores MCP, LSP, ediciones selectivas |
| **Agentic** | 20% | Subagentes, ejecuci&oacute;n paralela, worktrees, gesti&oacute;n de tareas |
| **Prompt Craft** | 20% | Prompts estructurados, bloques de c&oacute;digo, trazas de errores, refinamiento |
| **Context Mgmt** | 20% | Memoria entre sesiones, actualizaciones de CLAUDE.md, proyectos sostenidos |

Tambi&eacute;n muestra **8 mini-barras de caracter&iacute;sticas** (Hooks, Plugins, Skills, MCP, Agents, Plan, Memory, Rules) como una fila de mapa de calor.

<p align="center">
  <a href="https://github.com/Z-M-Huang/cc-proficiency">
    <img src="https://gist.githubusercontent.com/Z-M-Huang/2717fa94690c459d5093650c87f49868/raw/cc-proficiency.svg" alt="Insignia CC Proficiency &mdash; Est&aacute;tica" />
  </a>
  <br />
  <a href="https://gist.githubusercontent.com/Z-M-Huang/2717fa94690c459d5093650c87f49868/raw/cc-proficiency-animated.svg">Haz clic para ver la versi&oacute;n animada</a>
</p>

> **Aviso:** Esta es una estimaci&oacute;n de uso no oficial, no una puntuaci&oacute;n de certificaci&oacute;n real de Anthropic. No est&aacute; afiliado ni respaldado por Anthropic.

## Instalaci&oacute;n

```bash
npm install -g cc-proficiency
cc-proficiency init
```

`init` har&aacute;:
1. Detectar tu nombre de usuario de GitHub (v&iacute;a `gh` CLI)
2. Inyectar un hook Stop en `~/.claude/settings.json`
3. Crear un Gist privado de GitHub para tu insignia (si `gh` est&aacute; autenticado)

Si `gh` no est&aacute; instalado o no est&aacute; autenticado, la insignia se guarda localmente en `~/.cc-proficiency/cc-proficiency.svg`.

## Uso

### Configuraci&oacute;n inicial

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

### Analiza tu competencia

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

### Obtener consejos de mejora

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

### Generar y publicar tu insignia

```bash
# Guardar insignia localmente
$ cc-proficiency badge --output my-badge.svg
Badge written to my-badge.svg

# O publicar directamente en tu Gist
$ cc-proficiency push
✓ Badge pushed to Gist
  https://gist.githubusercontent.com/yourname/a1b2c3d4e5f6/raw/cc-proficiency.svg
```

### Actualizaciones autom&aacute;ticas (sin esfuerzo)

Despu&eacute;s de `init`, un hook Stop se ejecuta autom&aacute;ticamente despu&eacute;s de cada sesi&oacute;n de Claude Code:

```
Usas Claude Code normalmente
  → La sesi&oacute;n termina
  → El hook a&ntilde;ade la sesi&oacute;n a la cola (<1s, invisible para ti)
  → Un proceso en segundo plano analiza + actualiza tu insignia
  → La insignia en tu README refleja tus &uacute;ltimas puntuaciones
```

No se necesitan pasos manuales despu&eacute;s de la configuraci&oacute;n.

### Sin GitHub CLI

Si no tienes `gh` instalado o prefieres el modo solo local:

```bash
$ cc-proficiency init

  ⚠ GitHub CLI not authenticated.
  Badge will be saved locally to: ~/.cc-proficiency/cc-proficiency.svg
  To enable auto-upload: gh auth login && cc-proficiency init

$ cc-proficiency analyze --full
$ cc-proficiency badge --output badge.svg
```

## Insertar en tu README

Despu&eacute;s de ejecutar `cc-proficiency init`, a&ntilde;ade esto a tu README:

```markdown
<!-- Insignia est&aacute;tica -->
![Claude Code Proficiency](https://gist.githubusercontent.com/<username>/<gist-id>/raw/cc-proficiency.svg)

<!-- Insignia animada (clic para ver) -->
[Haz clic para ver la versi&oacute;n animada](https://gist.githubusercontent.com/<username>/<gist-id>/raw/cc-proficiency-animated.svg)
```

Ambas insignias se actualizan autom&aacute;ticamente despu&eacute;s de cada sesi&oacute;n de Claude Code (v&iacute;a el hook Stop).

## Insignia progresiva

La insignia se adapta seg&uacute;n la cantidad de datos disponibles:

| Fase | Sesiones | Qu&eacute; se muestra |
|------|----------|----------------------|
| **Calibrando** | 0–2 | Lista de verificaci&oacute;n de configuraci&oacute;n + progreso hacia la primera puntuaci&oacute;n |
| **Resultados iniciales** | 3–9 | 5 barras de dominio + 8 mini-barras de caracter&iacute;sticas (indicadores de baja confianza ○) |
| **Insignia completa** | 10+ | Barras de dominio completas, mapa de calor de caracter&iacute;sticas, puntos de confianza (● ◐ ○) |

## Mejora tus puntuaciones

La **[Gu&iacute;a de gamificaci&oacute;n](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide)** cubre:

- Ruta de progresi&oacute;n desde el primer d&iacute;a hasta nivel experto
- Consejos para cada uno de los 5 dominios
- C&oacute;mo desbloquear los 15 logros
- Qu&eacute; impulsa cada mini-barra de caracter&iacute;sticas de 0 a 100
- Sistema de rachas y tabla de clasificaci&oacute;n

> **[Gamification Guide](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide)** | **[游戏化攻略（中文）](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide-zh)**

## C&oacute;mo funciona la puntuaci&oacute;n

### Motor basado en reglas

cc-proficiency usa un **motor de reglas de coincidencia de patrones** con ~55 reglas en 5 dominios en lugar de contar llamadas a herramientas. Cada regla detecta un patr&oacute;n de comportamiento espec&iacute;fico y otorga puntos por nivel:

| Nivel | Puntos | Ejemplo de regla |
|-------|--------|-----------------|
| **Principiante** | 5 pts | Tiene CLAUDE.md global |
| **Intermedio** | 10–15 pts | Cadena de investigaci&oacute;n: Grep → Read → Edit |
| **Avanzado** | 15–25 pts | Agentes paralelos con diferentes tipos de subagentes |
| **Anti-patr&oacute;n** | -5 a -10 pts | 5+ herramientas paralelas con >50% de tasa de error |

### 5 barras de dominio

| Dominio | Qu&eacute; mide |
|---------|-----------------|
| **CC Mastery** | Estructura de CLAUDE.md, hooks con matchers, plugins, modo plan, skills, archivos de reglas |
| **Tool & MCP** | Cadenas de investigaci&oacute;n, Read-before-Edit, variedad de herramientas, uso de servidores MCP, LSP, ediciones selectivas |
| **Agentic** | Variedad de tipos de subagentes, agentes paralelos, ejecuciones en segundo plano, worktrees, gesti&oacute;n de tareas |
| **Prompt Craft** | Solicitudes estructuradas, bloques de c&oacute;digo, trazas de errores, referencias a archivos, refinamiento iterativo |
| **Context Mgmt** | Archivos de memoria activos, actualizaciones de CLAUDE.md, proyectos sostenidos, profundidad de sesi&oacute;n |

### 8 mini-barras de caracter&iacute;sticas

Debajo de las barras de dominio, una fila de mapa de calor muestra la profundidad por caracter&iacute;stica:

`Hooks · Plugins · Skills · MCP · Agents · Plan · Memory · Rules`

Cada mini-barra usa **puntuaci&oacute;n basada en profundidad** con curvas logar&iacute;tmicas que reflejan el uso real, no solo si has probado una caracter&iacute;stica una vez. Tener hooks configurados te da ~30; activarlos en cientos de sesiones te acerca a 100. Consulta la [Gu&iacute;a de gamificaci&oacute;n](https://github.com/Z-M-Huang/cc-proficiency/wiki/Gamification-Guide) para m&aacute;s detalles.

### Agregaci&oacute;n por buckets con l&iacute;mites

Las puntuaciones no son sumas brutas. Cada dominio tiene buckets con l&iacute;mites:

| Bucket | Puntos m&aacute;x. | Fuente |
|--------|-----------|--------|
| **Config** | 25 pts | Reglas basadas en configuraci&oacute;n (CLAUDE.md, hooks, plugins; disponibles inmediatamente) |
| **Behavior** | 75 pts | Reglas basadas en comportamiento (patrones de transcripci&oacute;n; crecen con el tiempo) |
| **Penalty** | -15 pts m&aacute;x | Deducciones por anti-patrones |

Esto significa:
- Las **instalaciones nuevas** pueden obtener hasta ~25 puntos brutos de configuraci&oacute;n por dominio (aumentados a ~50 durante la calibraci&oacute;n v&iacute;a escala 2.0x)
- **Despu&eacute;s de la calibraci&oacute;n** (10+ sesiones), la configuraci&oacute;n sola tiene un l&iacute;mite de ~25 por dominio; la evidencia de transcripciones impulsa el resto
- Los **anti-patrones tienen l&iacute;mite**, por lo que unas pocas sesiones malas no destruyen tu puntuaci&oacute;n

### Ponderaci&oacute;n consciente de la fase

La evidencia de configuraci&oacute;n se pondera m&aacute;s durante la calibraci&oacute;n, menos a medida que se acumulan transcripciones:

| Fase | Sesiones | Escala config | Escala comportamiento |
|------|----------|--------------|----------------------|
| Calibrando | 0–2 | 2.0× | 0.8× |
| Inicial | 3–9 | 1.5× | 1.0× |
| Completa | 10+ | 1.0× | 1.15× |

### Anti-trampas

- Las reglas se activan **por sesi&oacute;n con l&iacute;mites**; repetir la misma herramienta 100 veces no ayuda
- Las **reglas anti-patr&oacute;n** deducen puntos por malos h&aacute;bitos (llamadas paralelas dispersas, bloques de texto sin estructura)
- Cada regla tiene `maxPerSession`; las cadenas de investigaci&oacute;n tienen un l&iacute;mite de 3 por sesi&oacute;n
- Las puntuaciones de configuraci&oacute;n est&aacute;n **limitadas a 25**, por lo que no puedes maximizar un dominio solo instalando plugins

## Privacidad

| Aspecto | C&oacute;mo se maneja |
|---------|----------------------|
| **Ubicaci&oacute;n de datos** | Todo el an&aacute;lisis ocurre **localmente** en tu m&aacute;quina |
| **Qu&eacute; se almacena** | Solo conteos agregados, proporciones y flags booleanos (sin rutas de archivos, c&oacute;digo ni prompts) |
| **Visibilidad del Gist** | **Privado por defecto** (URL secreta, no aparece en tu perfil) |
| **Modo sin conexi&oacute;n** | Funciona completamente sin conexi&oacute;n sin `gh` CLI (modo solo local) |
| **CI/CD** | Las sesiones no interactivas se detectan y excluyen autom&aacute;ticamente |

## Localizaci&oacute;n

cc-proficiency soporta 6 idiomas: English, 中文, Espa&ntilde;ol, Fran&ccedil;ais, 日本語, 한국어.

Tu idioma se detecta autom&aacute;ticamente del entorno del sistema durante `init`. Para cambiarlo:

```bash
cc-proficiency config locale zh-CN   # Chino
cc-proficiency config locale es       # Espa&ntilde;ol
cc-proficiency config locale fr       # Franc&eacute;s
cc-proficiency config locale ja       # Japon&eacute;s
cc-proficiency config locale ko       # Coreano
cc-proficiency config locale en       # Ingl&eacute;s (por defecto)
```

Las insignias SVG se muestran autom&aacute;ticamente en el idioma preferido del espectador usando elementos SVG `<switch>` con atributos `systemLanguage`. Los 6 idiomas est&aacute;n integrados en un solo archivo SVG, sin necesidad de generar insignias separadas por idioma.

### Contribuir traducciones

Para a&ntilde;adir un nuevo idioma, copia `src/i18n/locales/en.ts` a `src/i18n/locales/<code>.ts`, traduce todas las cadenas y registra el idioma en `src/i18n/index.ts`.

## Comandos

| Comando | Descripci&oacute;n |
|---------|-------------|
| `cc-proficiency init` | Configurar hooks y Gist |
| `cc-proficiency analyze [--full]` | Analizar sesiones y calcular puntuaciones |
| `cc-proficiency process` | Procesar sesiones en cola desde el hook |
| `cc-proficiency badge [--output <archivo>]` | Generar insignia SVG |
| `cc-proficiency push` | Subir insignia al Gist |
| `cc-proficiency explain` | Mostrar factores de puntuaci&oacute;n y consejos |
| `cc-proficiency achievements` | Ver progreso de logros |
| `cc-proficiency status` | Mostrar actividad del hook, cola y configuraci&oacute;n |
| `cc-proficiency config [clave] [valor]` | Ver/establecer configuraci&oacute;n |
| `cc-proficiency share [--remove]` | Unirse o salir de la tabla de clasificaci&oacute;n comunitaria |
| `cc-proficiency leaderboard` | Ver clasificaciones de la comunidad |
| `cc-proficiency update` | Actualizar a la &uacute;ltima versi&oacute;n |
| `cc-proficiency uninstall` | Eliminar hooks y limpiar datos |

### Tabla de clasificaci&oacute;n comunitaria

&Uacute;nete a la tabla de clasificaci&oacute;n comunitaria para comparar tu competencia con otros usuarios de Claude Code:

```bash
# Unirse a la tabla de clasificaci&oacute;n (crea un perfil p&uacute;blico separado)
$ cc-proficiency share

# Ver clasificaciones
$ cc-proficiency leaderboard

# Salir de la tabla de clasificaci&oacute;n
$ cc-proficiency share --remove
```

Tus datos privados (detalles de sesi&oacute;n, nombres de proyectos, rutas de archivos) nunca se comparten. Solo las puntuaciones, racha y cantidad de logros son p&uacute;blicos. Consulta la [wiki](https://github.com/Z-M-Huang/cc-proficiency/wiki) para la documentaci&oacute;n completa.

## Arquitectura

```
El hook Stop se activa (< 1s)
  → Escribe la ruta de sesi&oacute;n en ~/.cc-proficiency/queue.jsonl
  → Lanza `cc-proficiency process` como proceso hijo desvinculado

cc-proficiency process
  → Adquiere queue.lock (obsoleto >60s → forzar)
  → Deduplica por session_id
  → Analiza transcripciones (JSONL en streaming, manejo de errores por l&iacute;nea)
  → Extrae se&ntilde;ales → calcula puntuaciones → renderiza SVG
  → Sube al Gist (si est&aacute; configurado) o guarda localmente
  → Rota la cola at&oacute;micamente
```

## Contribuir

&iexcl;Las contribuciones son bienvenidas! Por favor, abre un issue primero para discutir lo que te gustar&iacute;a cambiar.

```bash
git clone https://github.com/Z-M-Huang/cc-proficiency.git
cd cc-proficiency
npm install
npm test              # 200 tests
npm run build         # compilar a dist/
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run check         # typecheck + lint + test
```

## Licencia

[Apache 2.0](LICENSE)

---

<p align="center">
  <sub>Construido con Claude Code. No afiliado ni respaldado por Anthropic.</sub>
</p>
