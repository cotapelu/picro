// SPDX-License-Identifier: Apache-2.0
/**
 * RPC Mode - JSON-RPC server (stub).
 * Not implemented yet.
 */

import type { AgentSessionRuntime } from "../runtime/agent-session-runtime";

/**
 * Run RPC mode.
 * Currently throws an error indicating it's not available.
 */
export async function runRpcMode(_runtime: AgentSessionRuntime): Promise<never> {
  throw new Error("RPC mode is not yet implemented");
}
