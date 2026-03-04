// @ts-check
(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();

  const replyInput = document.getElementById("reply-input");
  const btnReply = document.getElementById("btn-reply");
  const btnReplyAgent = document.getElementById("btn-reply-agent");
  const btnResolve = document.getElementById("btn-resolve");
  const btnReopen = document.getElementById("btn-reopen");

  if (btnReply) {
    btnReply.addEventListener("click", () => {
      const text = replyInput ? replyInput.value.trim() : "";
      if (!text) return;
      vscode.postMessage({ type: "reply", text });
    });
  }

  if (btnReplyAgent) {
    btnReplyAgent.addEventListener("click", () => {
      const text = replyInput ? replyInput.value.trim() : "";
      if (!text) return;
      vscode.postMessage({ type: "reply-agent", text });
    });
  }

  if (btnResolve) {
    btnResolve.addEventListener("click", () => {
      vscode.postMessage({ type: "resolve" });
    });
  }

  if (btnReopen) {
    btnReopen.addEventListener("click", () => {
      vscode.postMessage({ type: "reopen" });
    });
  }
})();
