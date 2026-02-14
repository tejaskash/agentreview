import chalk from "chalk";
import { createAnchor } from "../core/anchors.js";
import {
  addThread,
  replyToThread,
  listThreads,
  getThread,
  resolveThread,
  reopenThread,
} from "../core/threads.js";
import type { Severity, ThreadStatus, MessageRole } from "../types.js";

export function threadAddCommand(
  repoRoot: string,
  file: string,
  lineRange: string,
  opts: { message: string; severity?: Severity }
): void {
  const { start, end } = parseLineRange(lineRange);
  const anchor = createAnchor(repoRoot, file, start, end);

  const thread = addThread(repoRoot, {
    file,
    anchor,
    message: opts.message,
    severity: opts.severity,
  });

  console.log(
    chalk.green(`Thread ${chalk.bold(thread.id)} created on ${file}:${start}-${end}`)
  );
}

export function threadReplyCommand(
  repoRoot: string,
  threadId: string,
  opts: { message: string; role?: MessageRole; status?: ThreadStatus }
): void {
  const thread = replyToThread(repoRoot, threadId, {
    message: opts.message,
    role: opts.role,
    status: opts.status,
  });

  console.log(
    chalk.green(
      `Reply added to ${chalk.bold(thread.id)} (status: ${thread.status})`
    )
  );
}

export function threadListCommand(
  repoRoot: string,
  opts: { status?: ThreadStatus; file?: string }
): void {
  const threads = listThreads(repoRoot, {
    status: opts.status,
    file: opts.file,
  });

  if (threads.length === 0) {
    console.log(chalk.dim("No threads found."));
    return;
  }

  for (const t of threads) {
    const lastMsg = t.messages[t.messages.length - 1];
    const preview =
      lastMsg.body.length > 60
        ? lastMsg.body.slice(0, 60) + "..."
        : lastMsg.body;

    const statusColor =
      t.status === "open"
        ? chalk.yellow
        : t.status === "resolved"
          ? chalk.green
          : t.status === "orphaned"
            ? chalk.red
            : chalk.cyan;

    console.log(
      `${chalk.bold(t.id)}  ${t.file}:${t.anchor.startLine}-${t.anchor.endLine}  ` +
        `${statusColor(t.status)}  ${chalk.dim(t.severity)}  ` +
        `[${t.messages.length} msg]  ${chalk.dim(preview)}`
    );
  }
}

export function threadShowCommand(repoRoot: string, threadId: string): void {
  const thread = getThread(repoRoot, threadId);
  if (!thread) {
    console.error(chalk.red(`Thread ${threadId} not found.`));
    process.exitCode = 1;
    return;
  }

  console.log(chalk.bold(`Thread ${thread.id}`) + `  [${thread.status}]  ${thread.severity}`);
  console.log(`File: ${thread.file}:${thread.anchor.startLine}-${thread.anchor.endLine}`);
  console.log();

  // Show anchor context
  console.log(chalk.dim("--- Anchor ---"));
  if (thread.anchor.contextBefore) {
    console.log(chalk.dim(thread.anchor.contextBefore));
  }
  console.log(chalk.yellow(thread.anchor.anchorText));
  if (thread.anchor.contextAfter) {
    console.log(chalk.dim(thread.anchor.contextAfter));
  }
  console.log(chalk.dim("--------------"));
  console.log();

  // Show messages
  for (const msg of thread.messages) {
    const roleTag =
      msg.role === "human"
        ? chalk.blue("[human]")
        : chalk.magenta("[agent]");
    const time = chalk.dim(msg.createdAt);
    console.log(`${roleTag} ${time}`);
    console.log(msg.body);
    console.log();
  }
}

export function threadResolveCommand(
  repoRoot: string,
  threadId: string
): void {
  const thread = resolveThread(repoRoot, threadId);
  console.log(chalk.green(`Thread ${chalk.bold(thread.id)} resolved.`));
}

export function threadReopenCommand(
  repoRoot: string,
  threadId: string
): void {
  const thread = reopenThread(repoRoot, threadId);
  console.log(chalk.yellow(`Thread ${chalk.bold(thread.id)} reopened.`));
}

function parseLineRange(range: string): { start: number; end: number } {
  const match = range.match(/^(\d+)(?:-(\d+))?$/);
  if (!match) {
    throw new Error(
      `Invalid line range '${range}'. Use <line> or <start>-<end>.`
    );
  }
  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : start;
  return { start, end };
}
