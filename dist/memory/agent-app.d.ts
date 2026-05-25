/**
 * AgentMemoryApp - High-level wrapper for agents
 */
import { MemoryStore } from './storage.js';
import type { AgentAction, AgentMemoryMetadata, RetrievalResult } from './types.js';
export declare class AgentMemoryApp {
    private engine;
    private initialized;
    constructor(store: MemoryStore, project?: string, cacheTTL?: number);
    init(): Promise<void>;
    setProject(project: string): void;
    rememberFileRead(filePath: string, summary: string): Promise<string>;
    rememberFileEdit(filePath: string, description: string): Promise<string>;
    rememberCommand(cmd: string, output: string): Promise<string>;
    rememberProjectInfo(info: string): Promise<string>;
    rememberTaskInfo(taskId: string, info: string): Promise<string>;
    remember(action: AgentAction, content: string, metadata?: Partial<AgentMemoryMetadata>): Promise<string>;
    recall(query: string): Promise<any[]>;
    recallWithScores(query: string): Promise<RetrievalResult>;
    getAll(): Promise<any[]>;
    count(): Promise<number>;
    invalidateCache(): void;
    getContext(): string;
    getRecentActions(limit?: number): any[];
    clear(): Promise<void>;
    getMemoryCount(): Promise<number>;
    getByAction(action: AgentAction): any[];
    getByFile(filePath: string): any[];
    applyForgetting(): Promise<number>;
    getStats(): Promise<Record<string, number>>;
    /**
     * Get extended performance metrics including cache hit rate and avg latency
     */
    getMetrics(): Promise<Record<string, number>>;
    /**
     * Get retriever-specific metrics (cache hits/misses, cache size)
     */
    getRetrieverMetrics(): Record<string, number>;
    /**
     * Dynamically adjust cache TTL for retrieval (ms)
     */
    setCacheTTL(ttl: number): void;
    /**
     * Dynamically adjust topK
     */
    setTopK(topK: number): void;
    /** Update a memory's content and/or metadata */
    updateMemory(id: string, content?: string, metadata?: Record<string, any>): Promise<boolean>;
    /** Delete a memory by id */
    deleteMemory(id: string): Promise<boolean>;
}
//# sourceMappingURL=agent-app.d.ts.map