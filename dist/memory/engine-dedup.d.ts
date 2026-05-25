import type { AgentAction, AgentMemoryMetadata, MemoryEntry } from './types.js';
export interface DeduplicationConfig {
    enabled: boolean;
    similarityThreshold: number;
}
/**
 * Compute Jaccard similarity between two strings
 */
export declare function computeSimilarity(a: string, b: string): number;
/**
 * Find duplicate memory by exact hash match
 */
export declare function findByHash(memories: MemoryEntry[], content: string, action: AgentAction, metadata?: Partial<AgentMemoryMetadata>): MemoryEntry | null;
/**
 * Find similar memory by content similarity
 */
export declare function findBySimilarity(memories: MemoryEntry[], content: string, action: AgentAction, threshold?: number): MemoryEntry | null;
/**
 * Detect if a new memory would be a duplicate
 */
export declare function detectDuplicate(memories: MemoryEntry[], content: string, action: AgentAction, metadata?: Partial<AgentMemoryMetadata>, config?: DeduplicationConfig): MemoryEntry | null;
//# sourceMappingURL=engine-dedup.d.ts.map