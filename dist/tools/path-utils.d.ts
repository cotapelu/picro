/**
 * Path utilities for securing file tool access.
 *
 * Ensures all file operations are confined to the specified cwd.
 * Provides path resolution with ~ expansion, absolute path handling,
 * and defense against directory traversal attacks.
 *
 * Reference: llm-context/coding-agent/core/tools/path-utils.ts
 */
/**
 * Expand user home directory (~) and normalize path.
 */
export declare function expandPath(filePath: string): string;
/**
 * Resolve a path relative to the given cwd, with ~ expansion.
 * This is the base function; for read operations use resolveReadPath
 * which includes macOS/corner-case handling.
 */
export declare function resolveToCwd(filePath: string, cwd: string): string;
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
export declare function resolveReadPath(filePath: string, cwd: string): string;
/**
 * Validate that a resolved path is within the allowed base directory.
 * Prevents directory traversal attacks.
 */
export declare function validatePathWithinBase(resolvedPath: string, baseDir: string): boolean;
//# sourceMappingURL=path-utils.d.ts.map