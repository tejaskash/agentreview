import { simpleGit, type SimpleGit } from "simple-git";

export function createGit(repoRoot: string): SimpleGit {
  return simpleGit(repoRoot);
}

export async function getCurrentBranch(repoRoot: string): Promise<string> {
  const git = createGit(repoRoot);
  const branch = await git.revparse(["--abbrev-ref", "HEAD"]);
  return branch.trim();
}

export async function getCommitHash(
  repoRoot: string,
  ref: string
): Promise<string> {
  const git = createGit(repoRoot);
  const hash = await git.revparse([ref]);
  return hash.trim();
}

export async function isGitRepo(repoRoot: string): Promise<boolean> {
  const git = createGit(repoRoot);
  return git.checkIsRepo();
}

export async function getDiff(
  repoRoot: string,
  base: string,
  head: string
): Promise<string> {
  const git = createGit(repoRoot);
  return git.diff([`${base}...${head}`]);
}

export async function getDiffStat(
  repoRoot: string,
  base: string,
  head: string
): Promise<string> {
  const git = createGit(repoRoot);
  return git.diff(["--stat", `${base}...${head}`]);
}

export async function checkPatch(
  repoRoot: string,
  patchPath: string
): Promise<{ valid: boolean; error?: string }> {
  const git = createGit(repoRoot);
  try {
    await git.raw(["apply", "--check", patchPath]);
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

export async function applyPatch(
  repoRoot: string,
  patchPath: string
): Promise<void> {
  const git = createGit(repoRoot);
  await git.raw(["apply", patchPath]);
}

export async function branchExists(
  repoRoot: string,
  branch: string
): Promise<boolean> {
  const git = createGit(repoRoot);
  try {
    await git.revparse(["--verify", branch]);
    return true;
  } catch {
    return false;
  }
}
