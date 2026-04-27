// SPDX-License-Identifier: Apache-2.0
/**
 * SourceInfo - Source information for context tracking
 */

export interface SourceInfo {
  /** Unique identifier for this source */
  id: string;
  /** Display name */
  name: string;
  /** File path if applicable */
  path?: string;
  /** Source type */
  type: "file" | "memory" | "session" | "tool" | "user" | "assistant";
  /** When this source was created */
  timestamp: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Create a synthetic source info
 */
export function createSyntheticSourceInfo(
  type: SourceInfo["type"],
  name: string,
  options?: {
    id?: string;
    path?: string;
    metadata?: Record<string, unknown>;
  }
): SourceInfo {
  return {
    id: options?.id ?? `src-${type}-${Date.now()}`,
    name,
    path: options?.path,
    type,
    timestamp: Date.now(),
    metadata: options?.metadata,
  };
}

/**
 * Create source info from file
 */
export function createFileSourceInfo(
  path: string,
  options?: {
    id?: string;
    metadata?: Record<string, unknown>;
  }
): SourceInfo {
  const name = path.split("/").pop() ?? path;
  return {
    id: options?.id ?? `src-file-${Date.now()}`,
    name,
    path,
    type: "file",
    timestamp: Date.now(),
    metadata: options?.metadata,
  };
}

/**
 * Create source info from memory
 */
export function createMemorySourceInfo(
  id: string,
  options?: {
    name?: string;
    metadata?: Record<string, unknown>;
  }
): SourceInfo {
  return {
    id: `src-memory-${id}`,
    name: options?.name ?? `Memory: ${id}`,
    type: "memory",
    timestamp: Date.now(),
    metadata: options?.metadata,
  };
}

/**
 * Create source info from session
 */
export function createSessionSourceInfo(
  sessionId: string,
  options?: {
    metadata?: Record<string, unknown>;
  }
): SourceInfo {
  return {
    id: `src-session-${sessionId}`,
    name: `Session: ${sessionId}`,
    type: "session",
    timestamp: Date.now(),
    metadata: options?.metadata,
  };
}