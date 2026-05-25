"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Shim for pi-ai types and utilities.
 * This provides minimal implementations for runtime compatibility.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isContextOverflow = isContextOverflow;
function isContextOverflow(message, contextWindow) {
    if (message.stopReason === 'context_overflow')
        return true;
    if (message.usage && message.usage.total && message.usage.total > contextWindow)
        return true;
    return false;
}
//# sourceMappingURL=pi-ai-shim.js.map