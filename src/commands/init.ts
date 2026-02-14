import chalk from "chalk";
import { createSession, sessionExists, addToGitignore } from "../core/session.js";
import { isGitRepo, getCurrentBranch, getCommitHash, branchExists } from "../core/git.js";

export async function initCommand(
  repoRoot: string,
  opts: { base?: string }
): Promise<void> {
  if (!(await isGitRepo(repoRoot))) {
    console.error(chalk.red("Error: Not a git repository."));
    process.exitCode = 1;
    return;
  }

  if (sessionExists(repoRoot)) {
    console.error(
      chalk.yellow("A review session already exists. Delete .agentreview/ to start fresh.")
    );
    process.exitCode = 1;
    return;
  }

  const headBranch = await getCurrentBranch(repoRoot);

  // Determine base branch
  let baseBranch = opts.base ?? "main";
  if (!(await branchExists(repoRoot, baseBranch))) {
    if (await branchExists(repoRoot, "master")) {
      baseBranch = "master";
    } else {
      console.error(
        chalk.red(`Base branch '${baseBranch}' not found. Use --base to specify.`)
      );
      process.exitCode = 1;
      return;
    }
  }

  if (headBranch === baseBranch) {
    console.error(
      chalk.red(`You're on the base branch '${baseBranch}'. Switch to a feature branch first.`)
    );
    process.exitCode = 1;
    return;
  }

  const baseCommit = await getCommitHash(repoRoot, baseBranch);
  const headCommit = await getCommitHash(repoRoot, headBranch);

  createSession(repoRoot, { baseBranch, baseCommit, headBranch, headCommit });
  addToGitignore(repoRoot);

  console.log(chalk.green("Review session initialized."));
  console.log(`  Base: ${chalk.cyan(baseBranch)} (${baseCommit.slice(0, 7)})`);
  console.log(`  Head: ${chalk.cyan(headBranch)} (${headCommit.slice(0, 7)})`);
}
