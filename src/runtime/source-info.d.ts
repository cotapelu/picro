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
export declare function createSyntheticSourceInfo(type: SourceInfo["type"], name: string, options?: {
    id?: string;
    path?: string;
    metadata?: Record<string, unknown>;
}): SourceInfo;
/**
 * Create source info from file
 */
export declare function createFileSourceInfo(path: string, options?: {
    id?: string;
    metadata?: Record<string, unknown>;
}): SourceInfo;
/**
 * Create source info from memory
 */
export declare function createMemorySourceInfo(id: string, options?: {
    name?: string;
    metadata?: Record<string, unknown>;
}): SourceInfo;
/**
 * Create source info from session
 */
export declare function createSessionSourceInfo(sessionId: string, options?: {
    metadata?: Record<string, unknown>;
}): SourceInfo;
//# sourceMappingURL=source-info.d.ts.map