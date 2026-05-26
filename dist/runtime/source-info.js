"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * SourceInfo - Source information for context tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSyntheticSourceInfo = createSyntheticSourceInfo;
exports.createFileSourceInfo = createFileSourceInfo;
exports.createMemorySourceInfo = createMemorySourceInfo;
exports.createSessionSourceInfo = createSessionSourceInfo;
/**
 * Create a synthetic source info
 */
function createSyntheticSourceInfo(type, name, options) {
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
function createFileSourceInfo(path, options) {
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
function createMemorySourceInfo(id, options) {
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
function createSessionSourceInfo(sessionId, options) {
    return {
        id: `src-session-${sessionId}`,
        name: `Session: ${sessionId}`,
        type: "session",
        timestamp: Date.now(),
        metadata: options?.metadata,
    };
}
//# sourceMappingURL=source-info.js.map