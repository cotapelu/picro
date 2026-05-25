/**
 * Memory Engine
 * Core memory system with crypto integrity
 * Uses: storage.ts, retrieval.ts, types.ts
 */
import { MemoryStorage, memoryHash } from './storage.js';
import { MemoryRetriever } from './retrieval.js';
import { MemoryEventLog } from './events.js';
import { performance } from 'perf_hooks';
// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------
export class MemoryEngine {
    storage;
    retriever;
    eventLog;
    currentProject;
    topK;
    forgettingDays;
    minScore;
    prefilterMinCandidates;
    maxCandidates;
    adaptiveThresholds;
    maxContextCharsPerMemory;
    stats = {
        retrievals: 0,
        saves: 0,
        queries: 0,
        errors: 0,
        hashVerifications: 0,
    };
    // Performance metrics (not persisted)
    queryCount = 0;
    queryLatencySum = 0;
    queryLatencies = []; // for p95
    maxLatencyRetention = 1000;
    totalResultScores = 0;
    resultCount = 0;
    constructor(config) {
        this.storage = new MemoryStorage({
            store: config.store,
            maxMemories: config.maxMemories || 100,
        });
        this.retriever = new MemoryRetriever();
        this.retriever.setCacheTTL(config.cacheTTL || 300000); // 5 min default
        this.eventLog = new MemoryEventLog();
        this.currentProject = config.project || "default";
        this.topK = config.topK || 50;
        this.forgettingDays = config.forgettingDays || 7;
        this.minScore = config.minScore ?? 5;
        this.prefilterMinCandidates = config.prefilterMinCandidates ?? (this.topK * 2);
        this.maxCandidates = config.maxCandidates ?? 500; // cap candidate memories for performance
        this.adaptiveThresholds = config.adaptiveThresholds || [5, 3, 1, 0];
        this.maxContextCharsPerMemory = config.maxContextCharsPerMemory ?? 500; // default truncate to 500 chars
    }
    async init() {
        // Initialize the store (load data from disk)
        await this.storage.getStore().init();
    }
    // ---------------------------------------------------------------------------
    // Project Management
    // ---------------------------------------------------------------------------
    setProject(project) {
        this.currentProject = project;
    }
    getProject() {
        return this.currentProject;
    }
    // ---------------------------------------------------------------------------
    // Core Operations
    // ---------------------------------------------------------------------------
    async add(content, action, metadata) {
        // Auto-apply forgetting to keep memory fresh
        this.applyForgetting();
        const hash = memoryHash(content, { action, ...metadata });
        const memId = await this.storage.add(content, action, this.currentProject, metadata);
        this.eventLog.log("SAVE", memId, content, action, undefined, hash);
        this.stats.saves++;
        // Invalidate retrieval cache
        this.retriever.invalidateCache();
        return memId;
    }
    /**
     * Remember new content (MemoryStore interface)
     */
    async remember(action, content, metadata) {
        return this.add(content, action, metadata);
    }
    /**
     * Search memories by query
     */
    async recall(query) {
        this.stats.queries++;
        const startTime = performance.now();
        const allMemories = await this.storage.getAll();
        if (allMemories.length === 0) {
            this.queryCount++;
            return { memories: [], scores: [], query };
        }
        this.stats.hashVerifications += allMemories.length;
        // Prefilter: try to reduce the number of memories to score based on metadata matches
        let candidateMemories = allMemories;
        const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9\s./\-]/g, '');
        const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);
        if (queryWords.length > 0) {
            const prefiltered = this.prefilterMemories(allMemories, queryWords);
            // Only use prefiltered set if it's large enough to not miss top results
            if (prefiltered.length >= this.prefilterMinCandidates) {
                candidateMemories = prefiltered;
            }
        }
        // Apply maxCandidates limit to bound latency (take most recent)
        if (candidateMemories.length > this.maxCandidates) {
            candidateMemories = candidateMemories
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, this.maxCandidates);
        }
        // Use both exact search and fuzzy search (scores computed in retriever)
        const exactResults = this.retriever.search(candidateMemories, query, this.currentProject, this.topK);
        const fuzzyResults = this.retriever.fuzzySearch(candidateMemories, query, this.currentProject, Math.floor(this.topK / 2));
        // Extract scorer scores (avoid recomputation)
        const exactScored = exactResults.map(r => ({
            mem: r.memory,
            score: r.scorerScore,
        }));
        const fuzzyScored = fuzzyResults.map(r => ({
            mem: r.memory,
            score: r.score,
        }));
        // Combine and dedupe
        const seen = new Set();
        const combined = [];
        for (const item of [...exactScored, ...fuzzyScored]) {
            if (!seen.has(item.mem.id)) {
                seen.add(item.mem.id);
                combined.push(item);
            }
        }
        // Adaptive threshold: start with configured minScore, relax if no results
        const thresholds = this.adaptiveThresholds;
        let filtered = [];
        for (const th of thresholds) {
            filtered = combined.filter(item => item.score >= th);
            if (filtered.length > 0)
                break; // stop at first non-empty
        }
        // Sort by score descending
        filtered.sort((a, b) => b.score - a.score);
        const memories = filtered.slice(0, this.topK).map(item => item.mem);
        // Track metrics: latency and result scores
        const latency = performance.now() - startTime;
        this.queryCount++;
        this.queryLatencySum += latency;
        this.queryLatencies.push(latency);
        if (this.queryLatencies.length > this.maxLatencyRetention)
            this.queryLatencies.shift();
        const scoreSum = filtered.reduce((sum, item) => sum + item.score, 0);
        this.totalResultScores = (this.totalResultScores || 0) + scoreSum;
        this.resultCount = (this.resultCount || 0) + memories.length;
        // Increment access count for retrieved memories to track usage frequency
        const store = this.storage.getStore();
        for (const mem of memories) {
            await store.updateMemory(mem.id, undefined, undefined);
        }
        for (const mem of memories) {
            this.eventLog.log("RETRIEVE", mem.id, undefined, query);
        }
        this.stats.retrievals += memories.length;
        const scores = filtered.slice(0, this.topK).map(item => item.score);
        return { memories, scores, query };
    }
    /**
     * Get all memories
     */
    async getAll() {
        return this.storage.getAll();
    }
    /**
     * Get recent memories
     */
    getRecent(limit = 10) {
        return this.storage.getRecent(limit);
    }
    /**
     * Get by action type
     */
    getByAction(action) {
        return this.retriever.filterByAction(this.storage.getAll(), action);
    }
    /**
     * Get by file path
     */
    getByFile(filePath) {
        return this.retriever.filterByFile(this.storage.getAll(), filePath);
    }
    /**
     * Get by project
     */
    getByProject(project) {
        return this.retriever.filterByProject(this.storage.getAll(), project);
    }
    /**
     * Get context string for LLM
     */
    getContext(limit = 10) {
        let recent = this.getRecent(limit);
        if (!recent.length)
            return "No memories yet.";
        // Truncate each memory if configured to reduce token usage
        if (this.maxContextCharsPerMemory) {
            const max = this.maxContextCharsPerMemory;
            recent = recent.map(m => {
                const content = m.content;
                if (content.length > max) {
                    return { ...m, content: content.substring(0, max) + '...' };
                }
                return m;
            });
        }
        return recent.map(m => m.content).join("\n");
    }
    /**
     * Prefilter memories based on metadata matching query keywords.
     * Returns a subset likely to contain relevant results.
     * Used to reduce number of memories that need full scoring.
     */
    prefilterMemories(memories, queryWords) {
        if (queryWords.length === 0)
            return memories;
        const qwSet = new Set(queryWords);
        const candidates = [];
        for (const mem of memories) {
            const meta = mem.metadata || {};
            // 1. filePath match
            if (meta.filePath) {
                const path = meta.filePath.toLowerCase();
                for (const qw of qwSet) {
                    if (path.includes(qw)) {
                        candidates.push(mem);
                        break;
                    }
                }
            }
            // 2. Action synonym match
            const action = meta._action;
            if (action) {
                const synMap = {
                    read_file: ['read', 'view', 'open', 'file', 'docs', 'documentation', 'cat', 'less', 'head'],
                    edit_file: ['edit', 'modify', 'change', 'update', 'fix', 'patch', 'correct', 'alter'],
                    execute_command: ['command', 'cmd', 'shell', 'terminal', 'git', 'install', 'npm', 'run', 'exec', 'start', 'stop', 'kill', 'killall', 'ps', 'grep', 'find', 'ls', 'cd', 'pwd', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'echo', 'output', 'result'],
                    project_info: ['project', 'setup', 'config', 'configure', 'info', 'about', 'name', 'description', 'title', 'version', 'author', 'license'],
                    task_info: ['task', 'todo', 'issue', 'ticket', 'bug', 'feature', 'story', 'sprint', 'backlog'],
                };
                const syns = synMap[action] || [];
                for (const qw of qwSet) {
                    if (syns.includes(qw)) {
                        candidates.push(mem);
                        break;
                    }
                }
            }
            // 3. General string metadata fields
            for (const key of Object.keys(meta)) {
                const val = meta[key];
                if (typeof val === 'string') {
                    const lower = val.toLowerCase();
                    for (const qw of qwSet) {
                        if (lower.includes(qw)) {
                            candidates.push(mem);
                            break;
                        }
                    }
                }
            }
        }
        // Deduplicate
        const seen = new Set();
        const unique = candidates.filter(mem => {
            const id = mem.id || JSON.stringify(mem);
            if (seen.has(id))
                return false;
            seen.add(id);
            return true;
        });
        return unique;
    }
    /**
     * Get memory count
     */
    async count() {
        return this.storage.count();
    }
    /**
     * Clear all memories
     */
    async clear() {
        await this.storage.clear();
        this.eventLog.clear();
        this.retriever.invalidateCache();
        this.stats = {
            retrievals: 0,
            saves: 0,
            queries: 0,
            errors: 0,
            hashVerifications: 0,
        };
    }
    async applyForgetting() {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.forgettingDays);
        const allMemories = await this.storage.getAll();
        let deleted = 0;
        for (const mem of allMemories) {
            const created = new Date(mem.created_at);
            const hoursOld = (Date.now() - created.getTime()) / (1000 * 60 * 60);
            const accessCount = mem.access_count || 0;
            let shouldForget = false;
            if (hoursOld > 168) { // Older than 7 days
                shouldForget = true;
            }
            else if (hoursOld > 72 && accessCount < 2) { // Older than 3 days with low access
                shouldForget = true;
            }
            else if (hoursOld > 24 && accessCount === 0) { // Older than 1 day with no access
                shouldForget = true;
            }
            if (shouldForget) {
                await this.storage.delete(mem.id);
                deleted++;
            }
        }
        if (deleted > 0) {
            this.retriever.invalidateCache();
        }
        return deleted;
    }
    getRetrieverMetrics() {
        return this.retriever.getMetrics();
    }
    /**
     * Adjust topK dynamically
     */
    setTopK(topK) {
        this.topK = topK;
    }
    /**
     * Adjust minimum score threshold
     */
    setMinScore(minScore) {
        this.minScore = minScore;
    }
    /**
     * Adjust cache TTL for retriever
     */
    setCacheTTL(ttl) {
        this.retriever.setCacheTTL(ttl);
    }
    getTopK() {
        return this.topK;
    }
    getMinScore() {
        return this.minScore;
    }
    getCacheTTL() {
        return this.retriever['cacheTTL'];
    }
    /**
     * Invalidate retrieval cache manually
     */
    invalidateCache() {
        this.retriever.invalidateCache();
    }
    // ---------------------------------------------------------------------------
    // Stats & Events
    // ---------------------------------------------------------------------------
    async getStats() {
        return {
            ...this.stats,
            eventLogCount: this.eventLog.count(),
            memoryCount: await this.count(),
        };
    }
    /**
     * Get extended performance metrics (includes cache, latency, scores)
     */
    async getMetrics() {
        const retrieverMetrics = this.retriever.getMetrics();
        const avgLatency = this.queryCount > 0 ? this.queryLatencySum / this.queryCount : 0;
        const p95Latency = this.computeP95Latency();
        const avgScore = this.resultCount > 0 ? this.totalResultScores / this.resultCount : 0;
        return {
            ...this.stats,
            memoryCount: await this.count(),
            queryCount: this.queryCount,
            avgQueryLatencyMs: avgLatency,
            p95QueryLatencyMs: p95Latency,
            avgResultScore: avgScore,
            cacheHitRate: retrieverMetrics.cacheHitRate,
            cacheHits: retrieverMetrics.cacheHits,
            cacheMisses: retrieverMetrics.cacheMisses,
            cacheSize: retrieverMetrics.cacheSize,
        };
    }
    /** Compute p95 latency from recent samples */
    computeP95Latency() {
        const times = this.queryLatencies;
        if (times.length === 0)
            return 0;
        const sorted = [...times].sort((a, b) => a - b);
        const idx = Math.floor(sorted.length * 0.95);
        return sorted[idx] || sorted[sorted.length - 1];
    }
    /** Get underlying storage for advanced operations */
    getStorage() {
        return this.storage;
    }
    getEventLog() {
        return this.eventLog;
    }
}
//# sourceMappingURL=engine.js.map