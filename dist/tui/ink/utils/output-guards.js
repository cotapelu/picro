"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeAndTruncate = sanitizeAndTruncate;
/** Simple output guards: strip ANSI codes and truncate long text */
function sanitizeAndTruncate(text, maxLength = 10000) {
    // Remove ANSI escape sequences (basic)
    const ansiRegex = /\x1b\[[0-9;]*m/g;
    const cleaned = text.replace(ansiRegex, '');
    if (cleaned.length <= maxLength)
        return cleaned;
    return cleaned.slice(0, maxLength) + `... (truncated, full length ${cleaned.length})`;
}
//# sourceMappingURL=output-guards.js.map