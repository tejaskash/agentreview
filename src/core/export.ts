import fs from "node:fs";
import path from "node:path";
import type { ExportBundle, RunRecord, Session, Thread } from "../types.js";
import { loadSession, getRunsDir } from "./session.js";
import { loadThreads } from "./threads.js";
import { getDiff } from "./git.js";

function generatePromptHint(session: Session): string {
  return `The following is a code review for branch '${session.headBranch}' against '${session.baseBranch}'. Each thread is a conversation anchored to a specific code region. Read the full message history in each thread to understand context. Address all 'must-fix' threads and review 'comment' threads. If you need clarification, use \`arv thread reply <id> -m '...' --role agent --status needs-human\` to ask. When done, produce a unified diff patch applicable with \`git apply\`, then use \`arv thread reply <id> -m '...' --role agent\` to explain what you changed in each thread.`;
}

export async function generateExportBundle(
  repoRoot: string
): Promise<ExportBundle> {
  const session = loadSession(repoRoot);
  const { threads } = loadThreads(repoRoot);

  // Filter to actionable threads
  const actionableThreads = threads.filter(
    (t) => t.status === "open" || t.status === "addressed" || t.status === "needs-human"
  );

  const diff = await getDiff(
    repoRoot,
    session.baseBranch,
    session.headBranch
  );

  return {
    version: "1",
    session: {
      baseBranch: session.baseBranch,
      headBranch: session.headBranch,
      baseCommit: session.baseCommit,
      headCommit: session.headCommit,
    },
    diff,
    threads: actionableThreads,
    prompt_hint: generatePromptHint(session),
  };
}

export function saveRunRecord(
  repoRoot: string,
  bundle: ExportBundle
): RunRecord {
  const runsDir = getRunsDir(repoRoot);
  fs.mkdirSync(runsDir, { recursive: true });

  // Find next run number
  const existing = fs.existsSync(runsDir) ? fs.readdirSync(runsDir) : [];
  const runNums = existing
    .map((f) => {
      const m = f.match(/^run-(\d+)\.json$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const nextNum = runNums.length > 0 ? Math.max(...runNums) + 1 : 1;
  const runId = `run-${String(nextNum).padStart(3, "0")}`;

  const record: RunRecord = {
    id: runId,
    exportedAt: new Date().toISOString(),
    threadsSnapshot: bundle.threads,
  };

  fs.writeFileSync(
    path.join(runsDir, `${runId}.json`),
    JSON.stringify(record, null, 2)
  );

  return record;
}

export function loadRunRecords(repoRoot: string): RunRecord[] {
  const runsDir = getRunsDir(repoRoot);
  if (!fs.existsSync(runsDir)) return [];

  return fs
    .readdirSync(runsDir)
    .filter((f) => f.match(/^run-\d+\.json$/))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(runsDir, f), "utf-8")));
}

export function updateRunRecord(
  repoRoot: string,
  runId: string,
  update: Partial<RunRecord>
): void {
  const runsDir = getRunsDir(repoRoot);
  const runPath = path.join(runsDir, `${runId}.json`);
  if (!fs.existsSync(runPath)) {
    throw new Error(`Run ${runId} not found.`);
  }
  const record: RunRecord = JSON.parse(fs.readFileSync(runPath, "utf-8"));
  Object.assign(record, update);
  fs.writeFileSync(runPath, JSON.stringify(record, null, 2));
}
