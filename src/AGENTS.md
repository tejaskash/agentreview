# AGENTS.md — src/

## Purpose

Contains all source code for the ARV CLI tool. This is the only source directory.

## Structure

- `cli.ts` — Entry point. Defines all CLI commands and subcommands using Commander. Each command delegates to a handler in `commands/`.
- `types.ts` — All shared TypeScript interfaces: `Anchor`, `Thread`, `Message`, `Session`, `RunRecord`, `ExportBundle`. This is the single source of truth for the data model.
- `commands/` — Command handler implementations (thin layer).
- `core/` — Business logic modules (where the real work happens).

## Key Files

| File | Role |
|------|------|
| `cli.ts` | CLI definition — maps commands to handlers, parses args |
| `types.ts` | Type definitions — imported by everything else |
