// SPDX-License-Identifier: Apache-2.0
/**
 * Shim for pi-ai types and utilities.
 * This provides minimal implementations for runtime compatibility.
 */
export function isContextOverflow(message, contextWindow) {
    if (message.stopReason === 'context_overflow')
        return true;
    if (message.usage && message.usage.total && message.usage.total > contextWindow)
        return true;
    return false;
}
