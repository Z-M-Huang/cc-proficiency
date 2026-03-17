# Code Quality Rules

## File Size
- Source files MUST NOT exceed 300 lines
- Exempt: `types.ts` (type definitions), `rules.ts` (data-driven rule array)
- If a file exceeds 300 lines, split it before adding more code

## Function Size
- Functions MUST NOT exceed 50 lines
- If a function exceeds 50 lines, extract helper functions

## No Unused Code
- No unused imports, variables, or parameters (enforced by ESLint)
- No commented-out code blocks
- No TODO/FIXME without a linked issue number

## Naming
- Files: kebab-case (e.g., `local-store.ts`)
- Types/Interfaces: PascalCase (e.g., `RemoteStore`)
- Functions/variables: camelCase (e.g., `parseClaudeConfig`)
- Constants: UPPER_SNAKE_CASE (e.g., `SCORING_VERSION`)

## Imports
- Use `import type` for type-only imports
- Group imports: node builtins -> project imports -> types
- No `require()` in src/ files (allowed in hooks/ for CJS compat)

## Type Safety
- No `as any` -- ever
- Minimize `as Record<string, unknown>` -- prefer typed interfaces
- All public functions must have explicit return types
