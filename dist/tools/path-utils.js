"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandPath = expandPath;
exports.resolveToCwd = resolveToCwd;
exports.resolveReadPath = resolveReadPath;
exports.validatePathWithinBase = validatePathWithinBase;
const node_fs_1 = require("node:fs");
const os = __importStar(require("node:os"));
const node_path_1 = require("node:path");
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
function expandPath(filePath) {
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
        (0, node_fs_1.accessSync)(filePath, node_fs_1.constants.F_OK);
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
function resolveToCwd(filePath, cwd) {
    const expanded = expandPath(filePath);
    if ((0, node_path_1.isAbsolute)(expanded)) {
        return expanded;
    }
    return (0, node_path_1.resolve)(cwd, expanded);
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
function resolveReadPath(filePath, cwd) {
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
function validatePathWithinBase(resolvedPath, baseDir) {
    const normalizedResolved = (0, node_path_1.resolve)(resolvedPath);
    const normalizedBase = (0, node_path_1.resolve)(baseDir);
    // Ensure the resolved path starts with the base directory
    return normalizedResolved === normalizedBase || normalizedResolved.startsWith(normalizedBase + '/');
}
//# sourceMappingURL=path-utils.js.map