#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import {
  threadAddCommand,
  threadReplyCommand,
  threadListCommand,
  threadShowCommand,
  threadResolveCommand,
  threadReopenCommand,
} from "./commands/thread.js";
import { exportCommand } from "./commands/export.js";
import { applyCommand } from "./commands/apply.js";
import { statusCommand } from "./commands/status.js";
import { diffCommand } from "./commands/diff.js";
import { endCommand } from "./commands/end.js";
import { threadResolveAllCommand } from "./commands/thread.js";

const program = new Command();

program
  .name("arv")
  .description("Local AI code review CLI")
  .version("0.1.0");

const cwd = process.cwd();

// arv init
program
  .command("init")
  .description("Initialize a review session for the current branch")
  .option("--base <branch>", "Base branch to compare against")
  .action((opts) => initCommand(cwd, opts));

// arv thread
const thread = program
  .command("thread")
  .description("Manage review threads");

thread
  .command("add <file> <lineRange>")
  .description("Add a review thread anchored to a code region")
  .requiredOption("-m, --message <text>", "Comment message")
  .option(
    "--severity <level>",
    "Thread severity (comment, must-fix)",
    "comment"
  )
  .action((file, lineRange, opts) =>
    threadAddCommand(cwd, file, lineRange, {
      message: opts.message,
      severity: opts.severity,
    })
  );

thread
  .command("reply <id>")
  .description("Reply to a thread")
  .requiredOption("-m, --message <text>", "Reply message")
  .option("--role <role>", "Message role (human, agent)", "human")
  .option("--status <status>", "Set thread status after reply")
  .action((id, opts) =>
    threadReplyCommand(cwd, id, {
      message: opts.message,
      role: opts.role,
      status: opts.status,
    })
  );

thread
  .command("list")
  .description("List review threads")
  .option("--status <status>", "Filter by status")
  .option("--file <path>", "Filter by file")
  .action((opts) => threadListCommand(cwd, opts));

thread
  .command("show <id>")
  .description("Show full thread details and conversation")
  .action((id) => threadShowCommand(cwd, id));

thread
  .command("resolve <id>")
  .description("Mark a thread as resolved")
  .action((id) => threadResolveCommand(cwd, id));

thread
  .command("reopen <id>")
  .description("Reopen a resolved thread")
  .action((id) => threadReopenCommand(cwd, id));

thread
  .command("resolve-all")
  .description("Bulk resolve threads")
  .option("--status <status>", "Only resolve threads with this status")
  .option("--file <path>", "Only resolve threads in this file")
  .action((opts) => threadResolveAllCommand(cwd, opts));

// arv export
program
  .command("export")
  .description("Export review bundle for agent consumption")
  .option("-o, --output <file>", "Write to file instead of stdout")
  .action((opts) => exportCommand(cwd, opts));

// arv apply
program
  .command("apply <patchFile>")
  .description("Apply a patch and re-anchor threads")
  .option("--dry-run", "Validate patch without applying")
  .action((patchFile, opts) => applyCommand(cwd, patchFile, opts));

// arv status
program
  .command("status")
  .description("Show review session status")
  .action(() => statusCommand(cwd));

// arv end
program
  .command("end")
  .description("End the current review session")
  .action(() => endCommand(cwd));

// arv diff
program
  .command("diff")
  .description("Show diff between base and head branches")
  .option("--stat", "Show summary statistics")
  .action((opts) => diffCommand(cwd, opts));

program.parse();
