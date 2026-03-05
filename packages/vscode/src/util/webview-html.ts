import type { Thread } from "agntrev";

export function buildThreadPanelHtml(
  thread: Thread,
  cspSource: string,
  cssUri: string,
  jsUri: string
): string {
  const lineRange =
    thread.anchor.startLine === thread.anchor.endLine
      ? `L${thread.anchor.startLine}`
      : `L${thread.anchor.startLine}-${thread.anchor.endLine}`;

  const anchorHtml = escapeHtml(thread.anchor.anchorText)
    .split("\n")
    .map((line) => `<div class="code-line">${line || "&nbsp;"}</div>`)
    .join("");

  const contextBeforeHtml = thread.anchor.contextBefore
    ? escapeHtml(thread.anchor.contextBefore)
        .split("\n")
        .map((line) => `<div class="code-line dim">${line || "&nbsp;"}</div>`)
        .join("")
    : "";

  const contextAfterHtml = thread.anchor.contextAfter
    ? escapeHtml(thread.anchor.contextAfter)
        .split("\n")
        .map((line) => `<div class="code-line dim">${line || "&nbsp;"}</div>`)
        .join("")
    : "";

  const messagesHtml = thread.messages
    .map((msg) => {
      const alignment = msg.role === "human" ? "left" : "right";
      const roleLabel = msg.role === "human" ? "Human" : "Agent";
      const time = new Date(msg.createdAt).toLocaleString();
      return `
        <div class="message ${alignment}">
          <div class="message-header">
            <span class="role">${roleLabel}</span>
            <span class="time">${escapeHtml(time)}</span>
          </div>
          <div class="message-body">${escapeHtml(msg.body)}</div>
        </div>`;
    })
    .join("");

  const statusClass = thread.status;
  const canResolve = thread.status !== "resolved";
  const canReopen = thread.status === "resolved";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource}; script-src ${cspSource};">
  <link rel="stylesheet" href="${cssUri}">
  <title>Thread ${thread.id}</title>
</head>
<body>
  <div class="thread-panel">
    <div class="header">
      <h2>${escapeHtml(thread.id)} — ${escapeHtml(thread.file)}:${lineRange}</h2>
      <div class="badges">
        <span class="badge severity-${thread.severity}">${escapeHtml(thread.severity)}</span>
        <span class="badge status-${statusClass}">${escapeHtml(thread.status)}</span>
      </div>
    </div>

    <div class="anchor-block">
      <div class="anchor-label">Anchored Code</div>
      <pre class="code-block">${contextBeforeHtml}${anchorHtml}${contextAfterHtml}</pre>
    </div>

    <div class="messages">
      ${messagesHtml}
    </div>

    <div class="reply-section">
      <textarea id="reply-input" placeholder="Write a reply..." rows="3"></textarea>
      <div class="actions">
        <button id="btn-reply" class="btn primary">Reply</button>
        <button id="btn-reply-agent" class="btn">Reply as Agent</button>
        ${canResolve ? '<button id="btn-resolve" class="btn success">Resolve</button>' : ""}
        ${canReopen ? '<button id="btn-reopen" class="btn warning">Reopen</button>' : ""}
      </div>
    </div>
  </div>
  <script src="${jsUri}"></script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
