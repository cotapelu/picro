// SPDX-License-Identifier: Apache-2.0
/**
 * Shim for pi-ai types and utilities.
 * This provides minimal implementations for runtime compatibility.
 */

export interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  total: number;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}

export function isContextOverflow(message: any, contextWindow: number): boolean {
  if (!message) return false;
  if (message.stopReason === 'context_overflow') return true;
  if (message.usage && message.usage.total && message.usage.total > contextWindow) return true;
  return false;
}
