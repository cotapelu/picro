// SPDX-License-Identifier: Apache-2.0
/**
 * Paths Utils - Path utilities
 * 
 * Học từ legacy mà KHÔNG copy code:
 * - isLocalPath check
 */

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