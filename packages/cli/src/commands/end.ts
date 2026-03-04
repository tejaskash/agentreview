import chalk from "chalk";
import { endSession } from "agentreview/session";
import { listThreads } from "agentreview/threads";
import type { ThreadStatus } from "agentreview";

export function endCommand(repoRoot: string): void {
  const threads = listThreads(repoRoot);

  // Warn about unresolved threads
  const unresolved = threads.filter((t) => t.status !== "resolved");
  if (unresolved.length > 0) {
    console.log(
      chalk.yellow(`Warning: ${unresolved.length} unresolved thread(s) remaining.`)
    );
  }

  const session = endSession(repoRoot);

  // Print summary
  const counts: Record<string, number> = {};
  for (const t of threads) {
    counts[t.status] = (counts[t.status] || 0) + 1;
  }

  console.log(chalk.green("Review session ended."));
  console.log(`  Branch: ${chalk.cyan(session.headBranch)} → ${session.baseBranch}`);
  console.log(`  Total threads: ${threads.length}`);

  const statuses: ThreadStatus[] = ["open", "needs-human", "addressed", "resolved", "orphaned"];
  for (const s of statuses) {
    if (counts[s]) {
      console.log(`    ${s}: ${counts[s]}`);
    }
  }
}
