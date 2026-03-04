import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isGitRepo,
  getCurrentBranch,
  getDiff,
  getDiffStat,
  branchExists,
} from "agentreview/git";
import { createTestRepo, cleanupTestRepo } from "./helpers.js";

describe("git", () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = createTestRepo();
  });

  afterEach(() => {
    cleanupTestRepo(repoRoot);
  });

  it("should detect a git repo", async () => {
    expect(await isGitRepo(repoRoot)).toBe(true);
  });

  it("should get current branch", async () => {
    const branch = await getCurrentBranch(repoRoot);
    expect(branch).toBe("feature-x");
  });

  it("should get diff between branches", async () => {
    const diff = await getDiff(repoRoot, "main", "feature-x");
    expect(diff).toContain("diff --git");
    expect(diff).toContain("auth.ts");
  });

  it("should get diff stat", async () => {
    const stat = await getDiffStat(repoRoot, "main", "feature-x");
    expect(stat).toContain("auth.ts");
  });

  it("should check branch existence", async () => {
    expect(await branchExists(repoRoot, "main")).toBe(true);
    expect(await branchExists(repoRoot, "nonexistent")).toBe(false);
  });
});
