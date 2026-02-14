# AGENTS.md — src/commands/

## Purpose

Command handlers for each CLI command. These are thin wrappers: they parse CLI arguments, call functions in `core/`, and format output for the terminal using chalk.

## Files

| File | Command | What it does |
|------|---------|-------------|
| `init.ts` | `arv init` | Validates git state, detects base branch (main/master), creates session |
| `thread.ts` | `arv thread *` | Handles add, reply, list, show, resolve, reopen subcommands |
| `export.ts` | `arv export` | Generates export bundle, writes to stdout or file |
| `apply.ts` | `arv apply` | Reads patch file, applies it via git, re-anchors all threads, updates run records |
| `status.ts` | `arv status` | Displays session info, thread counts by status, run history |
| `diff.ts` | `arv diff` | Shows full diff or `--stat` summary between base and head |

## Conventions

- All handlers are default-exported async functions.
- Error handling: handlers throw or `process.exit(1)` on failure with descriptive messages.
- Output formatting uses chalk for colors and manual table layout.
