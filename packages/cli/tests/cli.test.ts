import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createTestRepo, cleanupTestRepo } from "./helpers.js";

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const CLI = `npx tsx ${path.join(PROJECT_ROOT, "src/cli.ts")}`;

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

describe("CLI integration", () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = createTestRepo();
  });

  afterEach(() => {
    cleanupTestRepo(repoRoot);
  });

  it("arv init should create session", () => {
    const output = run("init --base main", repoRoot);
    expect(output).toContain("Review session initialized");
    expect(fs.existsSync(path.join(repoRoot, ".agentreview", "session.json"))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, ".agentreview", "threads.json"))).toBe(true);
  });

  it("arv init should add to gitignore", () => {
    run("init --base main", repoRoot);
    const gitignore = fs.readFileSync(path.join(repoRoot, ".gitignore"), "utf-8");
    expect(gitignore).toContain(".agentreview");
  });

  it("arv thread add should create a thread", () => {
    run("init --base main", repoRoot);
    const output = run(
      'thread add src/auth.ts 4-6 -m "Fix password validation" --severity must-fix',
      repoRoot
    );
    expect(output).toContain("t-1");

    const threads = JSON.parse(
      fs.readFileSync(path.join(repoRoot, ".agentreview", "threads.json"), "utf-8")
    );
    expect(threads.threads).toHaveLength(1);
    expect(threads.threads[0].severity).toBe("must-fix");
    expect(threads.threads[0].messages[0].body).toBe("Fix password validation");
  });

  it("arv thread reply should add a message", () => {
    run("init --base main", repoRoot);
    run('thread add src/auth.ts 4-6 -m "Fix this"', repoRoot);
    const output = run(
      'thread reply t-1 -m "Adding bcrypt" --role agent',
      repoRoot
    );
    expect(output).toContain("Reply added");

    const threads = JSON.parse(
      fs.readFileSync(path.join(repoRoot, ".agentreview", "threads.json"), "utf-8")
    );
    expect(threads.threads[0].messages).toHaveLength(2);
    expect(threads.threads[0].messages[1].role).toBe("agent");
  });

  it("arv thread list should display threads", () => {
    run("init --base main", repoRoot);
    run('thread add src/auth.ts 4-6 -m "Fix this"', repoRoot);
    run('thread add src/auth.ts 11-12 -m "Also fix this"', repoRoot);
    const output = run("thread list", repoRoot);
    expect(output).toContain("t-1");
    expect(output).toContain("t-2");
  });

  it("arv thread show should display full thread", () => {
    run("init --base main", repoRoot);
    run('thread add src/auth.ts 4-6 -m "Fix this"', repoRoot);
    const output = run("thread show t-1", repoRoot);
    expect(output).toContain("Thread t-1");
    expect(output).toContain("Fix this");
    expect(output).toContain("[human]");
  });

  it("arv thread resolve and reopen", () => {
    run("init --base main", repoRoot);
    run('thread add src/auth.ts 4-6 -m "Fix this"', repoRoot);

    run("thread resolve t-1", repoRoot);
    let threads = JSON.parse(
      fs.readFileSync(path.join(repoRoot, ".agentreview", "threads.json"), "utf-8")
    );
    expect(threads.threads[0].status).toBe("resolved");

    run("thread reopen t-1", repoRoot);
    threads = JSON.parse(
      fs.readFileSync(path.join(repoRoot, ".agentreview", "threads.json"), "utf-8")
    );
    expect(threads.threads[0].status).toBe("open");
  });

  it("arv status should display session info", () => {
    run("init --base main", repoRoot);
    run('thread add src/auth.ts 4-6 -m "Fix this"', repoRoot);
    const output = run("status", repoRoot);
    expect(output).toContain("Review Session");
    expect(output).toContain("main");
    expect(output).toContain("feature-x");
    expect(output).toContain("open: 1");
  });

  it("arv diff should show changes", () => {
    run("init --base main", repoRoot);
    const output = run("diff", repoRoot);
    expect(output).toContain("diff --git");
    expect(output).toContain("auth.ts");
  });

  it("arv diff --stat should show summary", () => {
    run("init --base main", repoRoot);
    const output = run("diff --stat", repoRoot);
    expect(output).toContain("auth.ts");
  });

  it("arv export should generate bundle", () => {
    run("init --base main", repoRoot);
    run('thread add src/auth.ts 4-6 -m "Fix password" --severity must-fix', repoRoot);

    const outputFile = path.join(repoRoot, "export.json");
    run(`export -o ${outputFile}`, repoRoot);

    expect(fs.existsSync(outputFile)).toBe(true);
    const bundle = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(bundle.version).toBe("1");
    expect(bundle.threads).toHaveLength(1);
    expect(bundle.prompt_hint).toContain("arv thread reply");
    expect(bundle.diff).toContain("diff --git");
  });

  it("arv apply should apply patch and re-anchor", () => {
    run("init --base main", repoRoot);
    run('thread add src/auth.ts 4-6 -m "Fix password validation" --severity must-fix', repoRoot);

    // Create a proper unified diff patch
    // Read current file to generate correct patch
    const currentContent = fs.readFileSync(path.join(repoRoot, "src/auth.ts"), "utf-8");
    const patchPath = path.join(repoRoot, "fix.patch");
    // Generate patch using git diff
    const fixedContent = fs.readFileSync(path.join(repoRoot, "src/auth.ts"), "utf-8")
      .replace("  if (user.password) {", "  if (bcrypt.compareSync(user.password, user.hash)) {");
    const origContent = fs.readFileSync(path.join(repoRoot, "src/auth.ts"), "utf-8");

    // Write modified file, generate diff, restore
    fs.writeFileSync(path.join(repoRoot, "src/auth.ts"), fixedContent);
    const patchContent = execSync("git diff src/auth.ts", { cwd: repoRoot, encoding: "utf-8" });
    execSync("git checkout src/auth.ts", { cwd: repoRoot });
    fs.writeFileSync(patchPath, patchContent);

    const output = run(`apply ${patchPath}`, repoRoot);
    expect(output).toContain("Patch applied successfully");

    // Check that thread was re-anchored
    const threads = JSON.parse(
      fs.readFileSync(path.join(repoRoot, ".agentreview", "threads.json"), "utf-8")
    );
    const thread = threads.threads[0];
    expect(["addressed", "open", "orphaned"]).toContain(thread.status);
  });

  it("arv apply --dry-run should validate without applying", () => {
    run("init --base main", repoRoot);

    const patchPath = path.join(repoRoot, "fix.patch");
    // Generate patch using git diff
    const fixedContent = fs.readFileSync(path.join(repoRoot, "src/auth.ts"), "utf-8")
      .replace("  if (user.password) {", "  if (bcrypt.compareSync(user.password, user.hash)) {");
    fs.writeFileSync(path.join(repoRoot, "src/auth.ts"), fixedContent);
    const patchContent = execSync("git diff src/auth.ts", { cwd: repoRoot, encoding: "utf-8" });
    execSync("git checkout src/auth.ts", { cwd: repoRoot });
    fs.writeFileSync(patchPath, patchContent);

    const output = run(`apply ${patchPath} --dry-run`, repoRoot);
    expect(output).toContain("dry run");

    // File should not be modified
    const content = fs.readFileSync(path.join(repoRoot, "src/auth.ts"), "utf-8");
    expect(content).toContain("if (user.password)");
  });
});
