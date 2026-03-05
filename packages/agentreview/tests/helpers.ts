import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

/**
 * Create a temporary git repo with a main branch and a feature branch.
 * Returns the repo root path.
 */
export function createTestRepo(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arv-test-"));

  execSync("git init", { cwd: tmpDir });
  execSync("git checkout -b main", { cwd: tmpDir });

  // Create an initial file and commit
  fs.writeFileSync(
    path.join(tmpDir, "src", "auth.ts").replace("/src/", "/"),
    ""
  );
  fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, "src", "auth.ts"),
    `function login(user: any) {
  if (user.password) {
    return true;
  }
  return false;
}

function logout() {
  console.log("logged out");
}
`
  );

  execSync("git add -A", { cwd: tmpDir });
  execSync('git commit -m "initial commit"', { cwd: tmpDir });

  // Create feature branch with changes
  execSync("git checkout -b feature-x", { cwd: tmpDir });

  fs.writeFileSync(
    path.join(tmpDir, "src", "auth.ts"),
    `import { hash } from "crypto";

function login(user: any) {
  if (user.password) {
    return true;
  }
  return false;
}

function logout() {
  session.destroy();
  console.log("logged out");
}

function register(user: any) {
  return db.save(user);
}
`
  );

  execSync("git add -A", { cwd: tmpDir });
  execSync('git commit -m "add features"', { cwd: tmpDir });

  return tmpDir;
}

export function cleanupTestRepo(repoRoot: string): void {
  fs.rmSync(repoRoot, { recursive: true, force: true });
}
