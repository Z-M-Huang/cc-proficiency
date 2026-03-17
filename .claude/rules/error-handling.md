# Error Handling Rules

## Hooks (session-end.ts)
- MUST exit 0 always -- never crash the hook
- MUST complete in <5 seconds
- Use try/catch around all operations
- Log errors to hook.log, never surface to user
- Empty catch blocks are OK here (intentional swallowing)

## CLI Commands
- Print user-friendly error messages (no stack traces)
- Exit with non-zero code on failure
- Always show what the user can do next ("Run cc-proficiency init first")

## Store/Queue Operations
- Use file locking for concurrent access
- Handle missing files gracefully (return defaults, don't crash)
- Validate JSON before parsing (try/catch)

## Gist Operations
- Always check gh auth before attempting
- Show clear message when gh is not installed/authenticated
- Never crash on network failures -- fall back to local-only

## Parser Operations
- Per-line try/catch for JSONL parsing (skip malformed lines)
- Graceful degradation for missing fields (use ?? defaults)
- Never crash on unknown transcript format versions
