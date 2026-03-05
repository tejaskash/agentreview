import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  createSession,
  loadSession,
  sessionExists,
  getReviewDir,
  addToGitignore,
} from "../src/core/session.js";
import { createTestRepo, cleanupTestRepo } from "./helpers.js";

describe("session", () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = createTestRepo();
  });

  afterEach(() => {
    cleanupTestRepo(repoRoot);
  });

  it("should detect no session exists initially", () => {
    expect(sessionExists(repoRoot)).toBe(false);
  });

  it("should create a session with correct structure", () => {
    const session = createSession(repoRoot, {
      baseBranch: "main",
      baseCommit: "abc123",
      headBranch: "feature-x",
      headCommit: "def456",
    });

    expect(session.version).toBe("1");
    expect(session.baseBranch).toBe("main");
    expect(session.headBranch).toBe("feature-x");
    expect(session.status).toBe("active");
    expect(sessionExists(repoRoot)).toBe(true);
  });

  it("should create .agentreview directory and files", () => {
    createSession(repoRoot, {
      baseBranch: "main",
      baseCommit: "abc",
      headBranch: "feature-x",
      headCommit: "def",
    });

    expect(fs.existsSync(getReviewDir(repoRoot))).toBe(true);
    expect(
      fs.existsSync(path.join(getReviewDir(repoRoot), "session.json"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(getReviewDir(repoRoot), "threads.json"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(getReviewDir(repoRoot), "runs"))
    ).toBe(true);
  });

  it("should load a saved session", () => {
    createSession(repoRoot, {
      baseBranch: "main",
      baseCommit: "abc123",
      headBranch: "feature-x",
      headCommit: "def456",
    });

    const loaded = loadSession(repoRoot);
    expect(loaded.baseBranch).toBe("main");
    expect(loaded.headBranch).toBe("feature-x");
  });

  it("should throw when loading non-existent session", () => {
    expect(() => loadSession(repoRoot)).toThrow("No review session found");
  });

  it("should add .agentreview to .gitignore", () => {
    addToGitignore(repoRoot);
    const content = fs.readFileSync(
      path.join(repoRoot, ".gitignore"),
      "utf-8"
    );
    expect(content).toContain(".agentreview");
  });

  it("should not duplicate .agentreview in .gitignore", () => {
    addToGitignore(repoRoot);
    addToGitignore(repoRoot);
    const content = fs.readFileSync(
      path.join(repoRoot, ".gitignore"),
      "utf-8"
    );
    const matches = content.split("\n").filter((l) => l.trim() === ".agentreview");
    expect(matches.length).toBe(1);
  });
});
