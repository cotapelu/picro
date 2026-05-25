/**
 * Memory Engine
 * Core memory system with crypto integrity
 * Uses: storage.ts, retrieval.ts, types.ts
 */
import { MemoryStore, MemoryStorage } from './storage.js';
import type { AgentAction, AgentMemoryMetadata, MemoryEntry, RetrievalResult } from './types.js';
import { MemoryEventLog } from './events.js';
export interface MemoryEngineConfig {
    store: MemoryStore;
    project?: string;
    topK?: number;
    maxMemories?: number;
    forgettingDays?: number;
    minScore?: number;
    cacheTTL?: number;
    prefilterMinCandidates?: number;
    maxCandidates?: number;
    adaptiveThresholds?: number[];
    maxContextCharsPerMemory?: number;
}
export declare class MemoryEngine {
    private storage;
    private retriever;
    private eventLog;
    private currentProject;
    private topK;
    private forgettingDays;
    private minScore;
    private prefilterMinCandidates;
    private maxCandidates;
    private adaptiveThresholds;
    private maxContextCharsPerMemory?;
    stats: {
        retrievals: number;
        saves: number;
        queries: number;
        errors: number;
        hashVerifications: number;
    };
    private queryCount;
    private queryLatencySum;
    private queryLatencies;
    private maxLatencyRetention;
    private totalResultScores;
    private resultCount;
    constructor(config: MemoryEngineConfig);
    init(): Promise<void>;
    setProject(project: string): void;
    getProject(): string;
    add(content: string, action: AgentAction, metadata?: Partial<AgentMemoryMetadata>): Promise<string>;
    /**
     * Remember new content (MemoryStore interface)
     */
    remember(action: AgentAction, content: string, metadata?: Partial<AgentMemoryMetadata>): Promise<string>;
    /**
     * Search memories by query
     */
    recall(query: string): Promise<RetrievalResult>;
    /**
     * Get all memories
     */
    getAll(): Promise<MemoryEntry[]>;
    /**
     * Get recent memories
     */
    getRecent(limit?: number): any[];
    /**
     * Get by action type
     */
    getByAction(action: AgentAction): any[];
    /**
     * Get by file path
     */
    getByFile(filePath: string): any[];
    /**
     * Get by project
     */
    getByProject(project: string): any[];
    /**
     * Get context string for LLM
     */
    getContext(limit?: number): string;
    /**
     * Prefilter memories based on metadata matching query keywords.
     * Returns a subset likely to contain relevant results.
     * Used to reduce number of memories that need full scoring.
     */
    private prefilterMemories;
    /**
     * Get memory count
     */
    count(): Promise<number>;
    /**
     * Clear all memories
     */
    clear(): Promise<void>;
    applyForgetting(): Promise<number>;
    getRetrieverMetrics(): Record<string, number>;
    /**
     * Adjust topK dynamically
     */
    setTopK(topK: number): void;
    /**
     * Adjust minimum score threshold
     */
    setMinScore(minScore: number): void;
    /**
     * Adjust cache TTL for retriever
     */
    setCacheTTL(ttl: number): void;
    getTopK(): number;
    getMinScore(): number;
    getCacheTTL(): number;
    /**
     * Invalidate retrieval cache manually
     */
    invalidateCache(): void;
    getStats(): Promise<Record<string, number>>;
    /**
     * Get extended performance metrics (includes cache, latency, scores)
     */
    getMetrics(): Promise<Record<string, number>>;
    /** Compute p95 latency from recent samples */
    private computeP95Latency;
    /** Get underlying storage for advanced operations */
    getStorage(): MemoryStorage;
    getEventLog(): MemoryEventLog;
}
//# sourceMappingURL=engine.d.ts.map