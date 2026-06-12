// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import { runRpcMode } from './rpc-mode.js';
import type { AgentSessionRuntime } from '../runtime/agent-session-runtime.js';

function createMockRuntime(): AgentSessionRuntime {
  return {
    session: {
      prompt: async () => {},
      setModel: async () => {},
      getState: () => ({ history: [] }),
      subscribe: () => {},
      destroy: () => {},
    },
    stop: () => {},
  };
}

describe('RpcMode', () => {
  it('should throw not implemented error', async () => {
    const runtime = createMockRuntime();
    await expect(runRpcMode(runtime)).rejects.toThrow('RPC mode is not yet implemented');
  });
});
