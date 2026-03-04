import chalk from "chalk";
import { loadSession } from "agentreview/session";
import { getDiff, getDiffStat } from "agentreview/git";

export async function diffCommand(
  repoRoot: string,
  opts: { stat?: boolean }
): Promise<void> {
  const session = loadSession(repoRoot);

  if (opts.stat) {
    const stat = await getDiffStat(
      repoRoot,
      session.baseBranch,
      session.headBranch
    );
    console.log(stat);
  } else {
    const diff = await getDiff(
      repoRoot,
      session.baseBranch,
      session.headBranch
    );
    if (!diff) {
      console.log(chalk.dim("No diff between base and head."));
    } else {
      console.log(diff);
    }
  }
}
