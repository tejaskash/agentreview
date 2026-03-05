import chalk from "chalk";
import { loadSession } from "../../core/session.js";
import { listThreads } from "../../core/threads.js";
import { loadRunRecords } from "../../core/export.js";
import type { ThreadStatus } from "../../core/types.js";

export function statusCommand(repoRoot: string): void {
  const session = loadSession(repoRoot);
  const threads = listThreads(repoRoot);
  const runs = loadRunRecords(repoRoot);

  console.log(chalk.bold("Review Session"));
  console.log(`  Base: ${chalk.cyan(session.baseBranch)} (${session.baseCommit.slice(0, 7)})`);
  console.log(`  Head: ${chalk.cyan(session.headBranch)} (${session.headCommit.slice(0, 7)})`);
  console.log(`  Status: ${session.status}`);
  console.log(`  Created: ${session.createdAt}`);
  console.log();

  // Thread summary
  const counts: Record<string, number> = {};
  for (const t of threads) {
    counts[t.status] = (counts[t.status] || 0) + 1;
  }

  console.log(chalk.bold("Threads"));
  if (threads.length === 0) {
    console.log(chalk.dim("  No threads yet."));
  } else {
    const statuses: ThreadStatus[] = [
      "open",
      "needs-human",
      "addressed",
      "resolved",
      "orphaned",
    ];
    for (const s of statuses) {
      if (counts[s]) {
        console.log(`  ${s}: ${counts[s]}`);
      }
    }
    console.log(`  Total: ${threads.length}`);
  }
  console.log();

  console.log(chalk.bold("Runs"));
  if (runs.length === 0) {
    console.log(chalk.dim("  No export/apply runs yet."));
  } else {
    console.log(`  Total runs: ${runs.length}`);
    const latest = runs[runs.length - 1];
    console.log(`  Latest: ${latest.id} (exported ${latest.exportedAt})`);
    if (latest.appliedAt) {
      console.log(`  Applied: ${latest.appliedAt}`);
    }
  }
}
