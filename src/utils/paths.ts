// SPDX-License-Identifier: Apache-2.0
/**
 * Paths Utils - Path utilities
 * 
 * Học từ legacy mà KHÔNG copy code:
 * - isLocalPath check
 * - canonicalizePath
 * - getPathComparisonKey
 * - shortenHomePath
 */

import { resolve } from "path";

export function isLocalPath(value: string): boolean {
  const trimmed = value.trim();
  
  // Non-local prefixes
  if (
    trimmed.startsWith("npm:") ||
    trimmed.startsWith("git:") ||
    trimmed.startsWith("github:") ||
    trimmed.startsWith("http:") ||
    trimmed.startsWith("https:") ||
    trimmed.startsWith("ssh:")
  ) {
    return false;
  }
  
  return true;
}

/** Chuẩn hóa đường dẫn: resolve, bỏ symlink, lowercase trên Windows. */
export function canonicalizePath(path: string): string {
  try {
    return resolve(path);
  } catch {
    return path;
  }
}

/** Khóa so sánh đường dẫn; theo dõi symlink và bỏ qua case trên Windows. */
export function getPathComparisonKey(path: string): string {
  const canonical = canonicalizePath(path);
  if (process.platform === "win32") {
    return canonical.toLowerCase();
  }
  return canonical;
}

/** Rút gọn đường dẫn home thành ~. */
export function shortenHomePath(path: string): string {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) return path;
  const resolvedPath = canonicalizePath(path);
  const resolvedHome = canonicalizePath(home);
  if (resolvedPath === resolvedHome) return "~";
  if (resolvedPath.startsWith(resolvedHome + "/")) {
    return "~/" + resolvedPath.slice(resolvedHome.length + 1);
  }
  return path;
}