import fs from "node:fs";
import path from "node:path";
import type { Session, ThreadsFile } from "./types.js";

const AGENTREVIEW_DIR = ".agentreview";
const SESSION_FILE = "session.json";
const THREADS_FILE = "threads.json";
const RUNS_DIR = "runs";

export function getReviewDir(repoRoot: string): string {
  return path.join(repoRoot, AGENTREVIEW_DIR);
}

export function getSessionPath(repoRoot: string): string {
  return path.join(getReviewDir(repoRoot), SESSION_FILE);
}

export function getThreadsPath(repoRoot: string): string {
  return path.join(getReviewDir(repoRoot), THREADS_FILE);
}

export function getRunsDir(repoRoot: string): string {
  return path.join(getReviewDir(repoRoot), RUNS_DIR);
}

export function sessionExists(repoRoot: string): boolean {
  return fs.existsSync(getSessionPath(repoRoot));
}

export function createSession(
  repoRoot: string,
  opts: {
    baseBranch: string;
    baseCommit: string;
    headBranch: string;
    headCommit: string;
  }
): Session {
  const reviewDir = getReviewDir(repoRoot);
  fs.mkdirSync(reviewDir, { recursive: true });
  fs.mkdirSync(getRunsDir(repoRoot), { recursive: true });

  const session: Session = {
    version: "1",
    baseBranch: opts.baseBranch,
    baseCommit: opts.baseCommit,
    headBranch: opts.headBranch,
    headCommit: opts.headCommit,
    createdAt: new Date().toISOString(),
    status: "active",
  };

  fs.writeFileSync(getSessionPath(repoRoot), JSON.stringify(session, null, 2));

  const threadsFile: ThreadsFile = { threads: [] };
  fs.writeFileSync(
    getThreadsPath(repoRoot),
    JSON.stringify(threadsFile, null, 2)
  );

  return session;
}

export function loadSession(repoRoot: string): Session {
  const sessionPath = getSessionPath(repoRoot);
  if (!fs.existsSync(sessionPath)) {
    throw new Error(
      "No review session found. Run `arv init` first."
    );
  }
  return JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
}

export function saveSession(repoRoot: string, session: Session): void {
  fs.writeFileSync(getSessionPath(repoRoot), JSON.stringify(session, null, 2));
}

export function endSession(repoRoot: string): Session {
  const session = loadSession(repoRoot);
  session.status = "completed";
  saveSession(repoRoot, session);
  return session;
}

export function addToGitignore(repoRoot: string): void {
  const gitignorePath = path.join(repoRoot, ".gitignore");
  const entry = AGENTREVIEW_DIR;

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    if (content.split("\n").some((line) => line.trim() === entry)) {
      return;
    }
    fs.appendFileSync(gitignorePath, `\n${entry}\n`);
  } else {
    fs.writeFileSync(gitignorePath, `${entry}\n`);
  }
}
