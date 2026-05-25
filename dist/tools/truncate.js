"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Truncation utilities for tool output
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MAX_LINES = exports.DEFAULT_MAX_BYTES = void 0;
exports.truncateHead = truncateHead;
exports.truncateTail = truncateTail;
exports.truncateLines = truncateLines;
exports.truncateOutput = truncateOutput;
exports.DEFAULT_MAX_BYTES = 1024 * 1024; // 1MB
exports.DEFAULT_MAX_LINES = 10000;
/**
 * Truncate text from head (keep end)
 */
function truncateHead(text, maxBytes, ellipsis = '... [TRUNCATED FROM HEAD]') {
    if (text.length <= maxBytes)
        return text;
    const ellipsisBytes = Buffer.byteLength(ellipsis, 'utf8');
    if (maxBytes <= ellipsisBytes)
        return ellipsis.substring(0, maxBytes);
    const keepBytes = maxBytes - ellipsisBytes;
    // Simple approach: keep last keepBytes characters (may cut multibyte)
    let kept = '';
    let bytes = 0;
    for (let i = text.length - 1; i >= 0; i--) {
        const charBytes = Buffer.byteLength(text[i], 'utf8');
        if (bytes + charBytes > keepBytes)
            break;
        kept = text[i] + kept;
        bytes += charBytes;
    }
    return ellipsis + kept;
}
/**
 * Truncate text from tail (keep beginning)
 */
function truncateTail(text, maxBytes, ellipsis = '... [TRUNCATED]') {
    if (text.length <= maxBytes)
        return text;
    const ellipsisBytes = Buffer.byteLength(ellipsis, 'utf8');
    if (maxBytes <= ellipsisBytes)
        return ellipsis.substring(0, maxBytes);
    const keepBytes = maxBytes - ellipsisBytes;
    let kept = '';
    let bytes = 0;
    for (let i = 0; i < text.length; i++) {
        const charBytes = Buffer.byteLength(text[i], 'utf8');
        if (bytes + charBytes > keepBytes)
            break;
        kept += text[i];
        bytes += charBytes;
    }
    return kept + ellipsis;
}
/**
 * Truncate by lines
 */
function truncateLines(text, maxLines, ellipsis = '... [MORE LINES]') {
    const lines = text.split('\n');
    if (lines.length <= maxLines)
        return text;
    return lines.slice(0, maxLines).join('\n') + '\n' + ellipsis;
}
/**
 * Smart truncate: by bytes and lines
 */
function truncateOutput(text, maxBytes = exports.DEFAULT_MAX_BYTES, maxLines = exports.DEFAULT_MAX_LINES, ellipsis = '... [TRUNCATED]') {
    const originalSize = text.length;
    const lines = text.split('\n');
    const originalLines = lines.length;
    let result = text;
    let truncated = false;
    let truncType = 'bytes';
    // Check lines first
    if (originalLines > maxLines) {
        result = truncateLines(text, maxLines, ellipsis);
        truncated = true;
        truncType = 'lines';
    }
    // Then check bytes
    if (Buffer.byteLength(result, 'utf8') > maxBytes) {
        result = truncateTail(result, maxBytes, ellipsis);
        truncated = true;
        truncType = truncType === 'lines' ? 'both' : 'bytes';
    }
    return {
        truncated,
        originalSize,
        truncatedSize: result.length,
        type: truncType,
    };
}
//# sourceMappingURL=truncate.js.map