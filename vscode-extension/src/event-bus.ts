import { EventEmitter } from "node:events";

export type ArvEvent = "threads-changed" | "session-changed";

class ArvEventBus extends EventEmitter {
  emitThreadsChanged(): void {
    this.emit("threads-changed");
  }

  emitSessionChanged(): void {
    this.emit("session-changed");
  }

  onThreadsChanged(listener: () => void): void {
    this.on("threads-changed", listener);
  }

  onSessionChanged(listener: () => void): void {
    this.on("session-changed", listener);
  }
}

export const eventBus = new ArvEventBus();
