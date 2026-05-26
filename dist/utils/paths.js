"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Paths Utils - Path utilities
 *
 * Học từ legacy mà KHÔNG copy code:
 * - isLocalPath check
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLocalPath = isLocalPath;
function isLocalPath(value) {
    const trimmed = value.trim();
    // Non-local prefixes
    if (trimmed.startsWith("npm:") ||
        trimmed.startsWith("git:") ||
        trimmed.startsWith("github:") ||
        trimmed.startsWith("http:") ||
        trimmed.startsWith("https:") ||
        trimmed.startsWith("ssh:")) {
        return false;
    }
    return true;
}
//# sourceMappingURL=paths.js.map