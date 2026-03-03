import type { CoreBridge } from "../../src/core-bridge.js";
import type { BridgeManager } from "../../src/bridge-manager.js";
import path from "node:path";

/**
 * Create a mock BridgeManager wrapping a single CoreBridge for tests.
 */
export function mockBridgeManager(repoRoot: string, bridge: CoreBridge): BridgeManager {
  const normalized = path.resolve(repoRoot);
  const bridges = new Map<string, CoreBridge>([[normalized, bridge]]);

  return {
    getAllBridges: () => bridges,
    getActiveBridges: () => {
      if (bridge.sessionExists()) {
        return new Map([[normalized, bridge]]);
      }
      return new Map();
    },
    getActiveBridge: () => bridge,
    getBridgeForFile: (filePath: string) => {
      const norm = path.resolve(filePath);
      if (norm.startsWith(normalized + path.sep) || norm === normalized) {
        return bridge;
      }
      return undefined;
    },
    pickBridge: async () => bridge,
    addRepoIfNeeded: () => bridge,
    discoverRepos: async () => {},
    dispose: () => {},
  } as unknown as BridgeManager;
}
