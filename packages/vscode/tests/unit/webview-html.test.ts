import { describe, it, expect } from "vitest";
import { buildThreadPanelHtml } from "../../src/util/webview-html.js";
import type { Thread } from "agntrev";

function makeThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: "t-1",
    file: "src/auth.ts",
    severity: "must-fix",
    status: "open",
    anchor: {
      startLine: 3,
      endLine: 6,
      contextBefore: "import { hash } from 'crypto';",
      anchorText: "function login(user: any) {\n  if (user.password) {\n    return true;\n  }",
      contextAfter: "  return false;\n}",
    },
    messages: [
      {
        role: "human",
        body: "This login check is insecure",
        createdAt: "2024-01-01T00:00:00.000Z",
      },
      {
        role: "agent",
        body: "I'll add proper validation",
        createdAt: "2024-01-01T00:01:00.000Z",
      },
    ],
    createdAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildThreadPanelHtml", () => {
  it("contains CSP meta tag", () => {
    const html = buildThreadPanelHtml(
      makeThread(),
      "https://test.com",
      "style.css",
      "script.js"
    );
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("https://test.com");
  });

  it("contains anchor text", () => {
    const html = buildThreadPanelHtml(
      makeThread(),
      "csp",
      "style.css",
      "script.js"
    );
    expect(html).toContain("function login");
    expect(html).toContain("user.password");
  });

  it("contains context lines with dim class", () => {
    const html = buildThreadPanelHtml(
      makeThread(),
      "csp",
      "style.css",
      "script.js"
    );
    expect(html).toContain('class="code-line dim"');
    expect(html).toContain("hash");
    expect(html).toContain("return false");
  });

  it("shows messages in order with correct alignment", () => {
    const html = buildThreadPanelHtml(
      makeThread(),
      "csp",
      "style.css",
      "script.js"
    );
    // Human message left-aligned
    expect(html).toContain('class="message left"');
    // Agent message right-aligned
    expect(html).toContain('class="message right"');
    // Check message content order
    const humanIdx = html.indexOf("This login check is insecure");
    const agentIdx = html.indexOf("proper validation");
    expect(humanIdx).toBeLessThan(agentIdx);
  });

  it("shows severity badge", () => {
    const html = buildThreadPanelHtml(
      makeThread(),
      "csp",
      "style.css",
      "script.js"
    );
    expect(html).toContain("severity-must-fix");
    expect(html).toContain("must-fix");
  });

  it("shows resolve button for open thread", () => {
    const html = buildThreadPanelHtml(
      makeThread({ status: "open" }),
      "csp",
      "style.css",
      "script.js"
    );
    expect(html).toContain("btn-resolve");
    expect(html).not.toContain("btn-reopen");
  });

  it("shows reopen button for resolved thread", () => {
    const html = buildThreadPanelHtml(
      makeThread({ status: "resolved" }),
      "csp",
      "style.css",
      "script.js"
    );
    expect(html).toContain("btn-reopen");
    expect(html).not.toContain("btn-resolve");
  });

  it("shows line range in header", () => {
    const html = buildThreadPanelHtml(
      makeThread(),
      "csp",
      "style.css",
      "script.js"
    );
    expect(html).toContain("L3-6");
  });

  it("shows single line number when start equals end", () => {
    const thread = makeThread();
    thread.anchor.startLine = 5;
    thread.anchor.endLine = 5;
    const html = buildThreadPanelHtml(thread, "csp", "style.css", "script.js");
    expect(html).toContain("L5");
    expect(html).not.toContain("L5-5");
  });

  it("escapes HTML in message body", () => {
    const thread = makeThread({
      messages: [
        {
          role: "human",
          body: '<script>alert("xss")</script>',
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });
    const html = buildThreadPanelHtml(thread, "csp", "style.css", "script.js");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes CSS and JS URIs", () => {
    const html = buildThreadPanelHtml(
      makeThread(),
      "csp",
      "https://cdn/style.css",
      "https://cdn/script.js"
    );
    expect(html).toContain('href="https://cdn/style.css"');
    expect(html).toContain('src="https://cdn/script.js"');
  });
});
