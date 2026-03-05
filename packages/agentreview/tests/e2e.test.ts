import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestRepo, cleanupTestRepo } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const CLI = `npx tsx ${path.join(PROJECT_ROOT, "src/cli/cli.ts")}`;

function run(cmd: string, cwd: string): string {
  try {
    return execSync(`${CLI} ${cmd}`, {
      cwd,
      encoding: "utf-8",
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
    });
  } catch (err: any) {
    return (err.stdout || "") + (err.stderr || "");
  }
}

describe("End-to-end workflow", () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = createTestRepo();
  });

  afterEach(() => {
    cleanupTestRepo(repoRoot);
  });

  it("full review cycle: init → thread → export → apply → status", () => {
    // 1. Initialize review session
    const initOutput = run("init --base main", repoRoot);
    expect(initOutput).toContain("Review session initialized");
    expect(initOutput).toContain("main");
    expect(initOutput).toContain("feature-x");

    // Verify .agentreview created
    expect(fs.existsSync(path.join(repoRoot, ".agentreview", "session.json"))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, ".agentreview", "threads.json"))).toBe(true);

    // Verify .gitignore updated
    const gitignore = fs.readFileSync(path.join(repoRoot, ".gitignore"), "utf-8");
    expect(gitignore).toContain(".agentreview");

    // 2. View the diff
    const diffOutput = run("diff", repoRoot);
    expect(diffOutput).toContain("diff --git");
    expect(diffOutput).toContain("auth.ts");

    // 3. Add review threads
    run(
      'thread add src/auth.ts 4-6 -m "This doesn\'t validate the password — it just checks existence." --severity must-fix',
      repoRoot
    );
    run(
      'thread add src/auth.ts 11-12 -m "Use a proper session management library" --severity suggestion',
      repoRoot
    );

    // 4. Verify threads were created
    const listOutput = run("thread list", repoRoot);
    expect(listOutput).toContain("t-1");
    expect(listOutput).toContain("t-2");
    expect(listOutput).toContain("must-fix");
    expect(listOutput).toContain("suggestion");

    // 5. Simulate agent asking for clarification
    run(
      'thread reply t-1 -m "Should I add bcrypt or argon2?" --role agent --status needs-human',
      repoRoot
    );

    // Verify status changed to needs-human
    let threads = JSON.parse(
      fs.readFileSync(path.join(repoRoot, ".agentreview", "threads.json"), "utf-8")
    );
    expect(threads.threads[0].status).toBe("needs-human");

    // 6. Human responds, unblocking the thread
    run('thread reply t-1 -m "Use bcrypt"', repoRoot);

    threads = JSON.parse(
      fs.readFileSync(path.join(repoRoot, ".agentreview", "threads.json"), "utf-8")
    );
    expect(threads.threads[0].status).toBe("open");
    expect(threads.threads[0].messages).toHaveLength(3);

    // 7. Check status
    const statusOutput = run("status", repoRoot);
    expect(statusOutput).toContain("open: 2");

    // 8. Export for agent
    const exportFile = path.join(repoRoot, "review-export.json");
    run(`export -o ${exportFile}`, repoRoot);
    expect(fs.existsSync(exportFile)).toBe(true);

    const bundle = JSON.parse(fs.readFileSync(exportFile, "utf-8"));
    expect(bundle.version).toBe("1");
    expect(bundle.session.baseBranch).toBe("main");
    expect(bundle.session.headBranch).toBe("feature-x");
    expect(bundle.diff).toContain("diff --git");
    expect(bundle.threads).toHaveLength(2);
    expect(bundle.prompt_hint).toContain("arv thread reply");
    expect(bundle.prompt_hint).toContain("feature-x");

    // Verify run was recorded
    const runsDir = path.join(repoRoot, ".agentreview", "runs");
    expect(fs.existsSync(path.join(runsDir, "run-001.json"))).toBe(true);

    // 9. Simulate agent producing a patch (fix password validation)
    const patchPath = path.join(repoRoot, "agent-fix.patch");
    const origContent = fs.readFileSync(path.join(repoRoot, "src/auth.ts"), "utf-8");
    const fixedContent = origContent.replace(
      "  if (user.password) {",
      "  if (bcrypt.compareSync(user.password, user.hash)) {"
    );
    fs.writeFileSync(path.join(repoRoot, "src/auth.ts"), fixedContent);
    const patchContent = execSync("git diff src/auth.ts", {
      cwd: repoRoot,
      encoding: "utf-8",
    });
    execSync("git checkout src/auth.ts", { cwd: repoRoot });
    fs.writeFileSync(patchPath, patchContent);

    // 10. Apply the patch
    const applyOutput = run(`apply ${patchPath}`, repoRoot);
    expect(applyOutput).toContain("Patch applied successfully");

    // 11. Verify file was modified
    const newContent = fs.readFileSync(path.join(repoRoot, "src/auth.ts"), "utf-8");
    expect(newContent).toContain("bcrypt.compareSync");

    // 12. Simulate agent replying to thread
    run(
      'thread reply t-1 -m "Applied bcrypt password comparison" --role agent',
      repoRoot
    );

    // 13. Resolve thread t-1
    run("thread resolve t-1", repoRoot);
    threads = JSON.parse(
      fs.readFileSync(path.join(repoRoot, ".agentreview", "threads.json"), "utf-8")
    );
    expect(threads.threads[0].status).toBe("resolved");
    expect(threads.threads[0].messages).toHaveLength(4);

    // 14. Check final status
    const finalStatus = run("status", repoRoot);
    expect(finalStatus).toContain("Review Session");
    // t-1 is resolved, t-2 may be addressed or open depending on re-anchoring
    expect(finalStatus).toContain("resolved");

    // 15. Verify thread t-2 is still trackable
    const showOutput = run("thread show t-2", repoRoot);
    expect(showOutput).toContain("Thread t-2");
    expect(showOutput).toContain("session management");

    // 16. Export again — resolved threads should be excluded
    const exportFile2 = path.join(repoRoot, "review-export-2.json");
    run(`export -o ${exportFile2}`, repoRoot);
    const bundle2 = JSON.parse(fs.readFileSync(exportFile2, "utf-8"));
    // t-1 is resolved, so only t-2 should be in the export
    const threadIds = bundle2.threads.map((t: any) => t.id);
    expect(threadIds).not.toContain("t-1");

    // Verify second run recorded
    expect(fs.existsSync(path.join(runsDir, "run-002.json"))).toBe(true);
  });
});
