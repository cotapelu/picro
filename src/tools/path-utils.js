// SPDX-License-Identifier: Apache-2.0
/**
 * Path utilities for securing file tool access.
 *
 * Ensures all file operations are confined to the specified cwd.
 * Provides path resolution with ~ expansion, absolute path handling,
 * and defense against directory traversal attacks.
 *
 * Reference: llm-context/coding-agent/core/tools/path-utils.ts
 */
import { accessSync, constants } from 'node:fs';
import * as os from 'node:os';
import { isAbsolute, resolve as resolvePath } from 'node:path';
// Unicode normalization for macOS screenshot paths
const UNICODE_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;
const NARROW_NO_BREAK_SPACE = "\u202F";
function normalizeUnicodeSpaces(str) {
    return str.replace(UNICODE_SPACES, " ");
}
function normalizeAtPrefix(filePath) {
    return filePath.startsWith("@") ? filePath.slice(1) : filePath;
}
/**
 * Expand user home directory (~) and normalize path.
 */
export function expandPath(filePath) {
    const normalized = normalizeUnicodeSpaces(normalizeAtPrefix(filePath));
    if (normalized === "~") {
        return os.homedir();
    }
    if (normalized.startsWith("~/")) {
        return os.homedir() + normalized.slice(1);
    }
    return normalized;
}
/**
 * Check if a file exists (synchronously).
 */
function fileExists(filePath) {
    try {
        accessSync(filePath, constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Resolve a path relative to the given cwd, with ~ expansion.
 * This is the base function; for read operations use resolveReadPath
 * which includes macOS/corner-case handling.
 */
export function resolveToCwd(filePath, cwd) {
    const expanded = expandPath(filePath);
    if (isAbsolute(expanded)) {
        return expanded;
    }
    return resolvePath(cwd, expanded);
}
/**
 * Try alternative path variants for common macOS file naming issues.
 */
function tryMacOSScreenshotPath(filePath) {
    return filePath.replace(/ (AM|PM)\./gi, `${NARROW_NO_BREAK_SPACE}$1.`);
}
function tryNFDVariant(filePath) {
    return filePath.normalize("NFD");
}
function tryCurlyQuoteVariant(filePath) {
    return filePath.replace(/'/g, "\u2019");
}
/**
 * Resolve a path for reading with comprehensive fallbacks.
 * Handles:
 * - cwd-relative resolution
 * - ~ expansion
 * - macOS screenshot naming variants (AM/PM spacing)
 * - NFD normalization (macOS)
 * - Curly quote normalization
 *
 * Returns the first path that exists, or the resolved path if none exist.
 */
export function resolveReadPath(filePath, cwd) {
    const resolved = resolveToCwd(filePath, cwd);
    if (fileExists(resolved)) {
        return resolved;
    }
    // Try macOS AM/PM variant (narrow no-break space before AM/PM)
    const amPmVariant = tryMacOSScreenshotPath(resolved);
    if (amPmVariant !== resolved && fileExists(amPmVariant)) {
        return amPmVariant;
    }
    // Try NFD variant (macOS stores filenames in NFD form)
    const nfdVariant = tryNFDVariant(resolved);
    if (nfdVariant !== resolved && fileExists(nfdVariant)) {
        return nfdVariant;
    }
    // Try curly quote variant (macOS uses U+2019 in screenshot names)
    const curlyVariant = tryCurlyQuoteVariant(resolved);
    if (curlyVariant !== resolved && fileExists(curlyVariant)) {
        return curlyVariant;
    }
    // Try combined NFD + curly quote (for French macOS screenshots like "Capture d'écran")
    const nfdCurlyVariant = tryCurlyQuoteVariant(nfdVariant);
    if (nfdCurlyVariant !== resolved && fileExists(nfdCurlyVariant)) {
        return nfdCurlyVariant;
    }
    return resolved;
}
/**
 * Validate that a resolved path is within the allowed base directory.
 * Prevents directory traversal attacks.
 */
export function validatePathWithinBase(resolvedPath, baseDir) {
    const normalizedResolved = resolvePath(resolvedPath);
    const normalizedBase = resolvePath(baseDir);
    // Ensure the resolved path starts with the base directory
    return normalizedResolved === normalizedBase || normalizedResolved.startsWith(normalizedBase + '/');
}
