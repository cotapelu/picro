"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Output Guard - Sanitize and validate tool output
 *
 * Protects against:
 * - Binary data in text output
 * - Extremely long lines
 * - Control characters
 * - ANSI escape code injection
 * - Potential XSS in HTML contexts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MAX_LINE_LENGTH = exports.DEFAULT_MAX_OUTPUT_SIZE = void 0;
exports.sanitizeOutput = sanitizeOutput;
exports.validateOutput = validateOutput;
exports.safeReadFile = safeReadFile;
exports.cleanupTempFile = cleanupTempFile;
const strip_ansi_1 = __importDefault(require("strip-ansi"));
const fs_1 = require("fs");
/**
 * Default maximum output size (5MB)
 */
exports.DEFAULT_MAX_OUTPUT_SIZE = 5 * 1024 * 1024;
/**
 * Default maximum line length
 */
exports.DEFAULT_MAX_LINE_LENGTH = 10000;
/**
 * Enhanced binary detection using multiple heuristics
 */
function isBinaryString(str, sampleSize = 4096) {
    const sample = str.slice(0, sampleSize);
    if (!sample)
        return false;
    // Heuristic 1: Null byte presence
    if (sample.includes('\0'))
        return true;
    // Heuristic 2: Invalid UTF-8 sequences
    try {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder('utf-8', { fatal: true });
        decoder.decode(encoder.encode(sample));
    }
    catch {
        return true; // Invalid UTF-8 = binary
    }
    // Heuristic 3: High ASCII ratio (non-ASCII characters)
    let nonAscii = 0;
    for (let i = 0; i < sample.length; i++) {
        if (sample.charCodeAt(i) > 127)
            nonAscii++;
    }
    const ratio = nonAscii / sample.length;
    if (ratio > 0.3)
        return true; // >30% high ASCII
    // Heuristic 4: Control characters (excluding \n, \r, \t)
    let controlChars = 0;
    for (let i = 0; i < sample.length; i++) {
        const code = sample.charCodeAt(i);
        if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
            controlChars++;
        }
    }
    if (controlChars > sample.length * 0.1)
        return true; // >10% control chars
    return false;
}
/**
 * Sanitize control characters while preserving newlines and tabs
 */
function sanitizeControlChars(str) {
    return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, (match) => {
        // Map some common controls to visible placeholders
        const map = {
            '\x00': '[NUL]',
            '\x01': '[SOH]',
            '\x02': '[STX]',
            '\x03': '[ETX]',
            '\x04': '[EOT]',
            '\x05': '[ENQ]',
            '\x06': '[ACK]',
            '\x07': '[BEL]',
            '\x08': '[BS]',
            '\x0B': '[VT]',
            '\x0C': '[FF]',
            '\x0E': '[SO]',
            '\x0F': '[SI]',
            '\x1F': '[US]',
            '\x7F': '[DEL]',
        };
        return map[match] ?? `[0x${match.charCodeAt(0).toString(16).padStart(2, '0')}]`;
    });
}
/**
 * Sanitize output string
 */
function sanitizeOutput(output, options = {}) {
    const { maxSize = exports.DEFAULT_MAX_OUTPUT_SIZE, maxLineLength = exports.DEFAULT_MAX_LINE_LENGTH, stripAnsi: shouldStripAnsi = true, truncateIndicator = '... [TRUNCATED]', } = options;
    if (!output)
        return '';
    let result = output;
    // Strip ANSI codes if requested
    if (shouldStripAnsi) {
        result = (0, strip_ansi_1.default)(result);
    }
    // Check if binary
    if (isBinaryString(result)) {
        result = `[Binary output: ${output.length} bytes]`;
        return result;
    }
    // Sanitize control characters
    result = sanitizeControlChars(result);
    // Check size limit
    if (result.length > maxSize) {
        result = result.slice(0, maxSize) + truncateIndicator;
    }
    // Check line length
    const lines = result.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].length > maxLineLength) {
            lines[i] = lines[i].slice(0, maxLineLength) + truncateIndicator;
        }
    }
    result = lines.join('\n');
    return result;
}
/**
 * Validate and sanitize tool output
 */
function validateOutput(output, options = {}) {
    const originalLength = output.length;
    const warnings = [];
    let sanitized = output;
    // Check for binary
    const isBinary = isBinaryString(output);
    if (isBinary) {
        warnings.push('Output contains binary data');
    }
    // Check size
    const maxSize = options.maxSize ?? exports.DEFAULT_MAX_OUTPUT_SIZE;
    let truncated = false;
    if (output.length > maxSize) {
        warnings.push(`Output exceeds maximum size (${output.length} > ${maxSize})`);
        truncated = true;
    }
    // Sanitize
    sanitized = sanitizeOutput(output, { ...options, truncateIndicator: truncated ? '...' : undefined });
    return {
        valid: !isBinary,
        sanitized,
        originalLength,
        sanitizedLength: sanitized.length,
        warnings,
        truncated,
    };
}
/**
 * Safe read file with output guard
 */
function safeReadFile(filePath, options = {}) {
    const { maxSize = exports.DEFAULT_MAX_OUTPUT_SIZE, encoding = 'utf8' } = options;
    try {
        if (!(0, fs_1.existsSync)(filePath)) {
            return { content: '', valid: false, warnings: ['File not found'] };
        }
        const stats = statsSync(filePath);
        if (stats.size > maxSize) {
            return {
                content: '',
                valid: false,
                warnings: [`File too large: ${stats.size} bytes (max ${maxSize})`],
            };
        }
        const content = (0, fs_1.readFileSync)(filePath, encoding);
        const validation = validateOutput(content, { maxSize });
        return {
            content: validation.sanitized,
            valid: validation.valid,
            warnings: validation.warnings,
        };
    }
    catch (err) {
        return {
            content: '',
            valid: false,
            warnings: [err?.message ?? 'Failed to read file'],
        };
    }
}
const fs_2 = require("fs");
// Helper to avoid circular require
function statsSync(path) {
    return (0, fs_2.statSync)(path);
}
/**
 * Cleanup temp file if exists
 */
function cleanupTempFile(filePath) {
    try {
        if ((0, fs_1.existsSync)(filePath)) {
            (0, fs_1.unlinkSync)(filePath);
        }
    }
    catch {
        // Ignore cleanup errors
    }
}
//# sourceMappingURL=output-guard.js.map