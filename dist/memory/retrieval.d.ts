/**
 * Retrieval Layer
 * Search and filter memories
 */
import type { AgentAction } from './types.js';
export interface RetrievalOptions {
    project?: string;
    action?: AgentAction;
    filePath?: string;
    taskId?: string;
    limit?: number;
    minScore?: number;
}
export interface ScoredMemory {
    memory: any;
    score: number;
}
export declare class MemoryScorer {
    /**
     * Score a memory against a query
     */
    private synonymMap;
    private _compiledQuery;
    private _compiledQueryWords;
    private _compiledSynonymRegexes;
    private getSynonyms;
    private compileQuery;
    private getExpectedAction;
    score(memory: any, query: string, currentProject: string): number;
}
export declare class MemoryRetriever {
    private scorer;
    private defaultLimit;
    private cache;
    private cacheTTL;
    private cacheHits;
    private cacheMisses;
    private retrievalTimes;
    private maxRetention;
    constructor();
    setCacheTTL(ttl: number): void;
    getMetrics(): {
        cacheHits: number;
        cacheMisses: number;
        cacheHitRate: number;
        cacheSize: number;
    };
    /** Get latency stats for search calls */
    getRetrievalStats(): {
        count: number;
        avgMs: number;
        p95Ms: number;
        maxMs: number;
    };
    /**
     * Search memories by query string
     */
    search(memories: any[], query: string, currentProject: string, limit?: number): Array<{
        memory: any;
        scorerScore: number;
        bm25Score: number;
    }>;
    /**
     * Invalidate cache (call when memories change)
     */
    invalidateCache(): void;
    /**
     * Get memories by action type
     */
    filterByAction(memories: any[], action: AgentAction): any[];
    /**
     * Get memories by file path
     */
    filterByFile(memories: any[], filePath: string): any[];
    /**
     * Get memories by project
     */
    filterByProject(memories: any[], project: string): any[];
    /**
     * Get memories by task
     */
    filterByTask(memories: any[], taskId: string): any[];
    /**
     * Advanced retrieval with options
     */
    retrieve(memories: any[], options: RetrievalOptions, currentProject: string): any[];
    /**
     * Fuzzy search - find memories with partial matches
     */
    fuzzySearch(memories: any[], query: string, currentProject: string, limit?: number): Array<{
        memory: any;
        score: number;
    }>;
}
//# sourceMappingURL=retrieval.d.ts.map