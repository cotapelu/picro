/**
 * Memory Engine
 * Core memory system with crypto integrity
 * Uses: storage.ts, retrieval.ts, types.ts
 */

import { MemoryStore, MemoryStorage, memoryHash } from './storage';
import type { AgentAction, AgentMemoryMetadata, MemoryEntry, RetrievalResult } from './types';
import { MemoryRetriever } from './retrieval';
import { MemoryEventLog } from './events';
import { performance } from 'perf_hooks';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface MemoryEngineConfig {
  store: MemoryStore;
  project?: string;
  topK?: number;
  maxMemories?: number;
  forgettingDays?: number;
  // Retrieval tuning
  minScore?: number; // default 5
  cacheTTL?: number; // ms, default 300000 (5min)
  prefilterMinCandidates?: number; // default topK*2
  maxCandidates?: number; // max memories to score (default 500)
  adaptiveThresholds?: number[]; // default [5,3,1,0]
  // Context optimization
  maxContextCharsPerMemory?: number; // truncate memory content for context
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class MemoryEngine {
  private storage: MemoryStorage;
  private retriever: MemoryRetriever;
  private eventLog: MemoryEventLog;
  private currentProject: string;
  private topK: number;
  private forgettingDays: number;
  private minScore: number;
  private prefilterMinCandidates: number;
  private maxCandidates: number;
  private adaptiveThresholds: number[];
  private maxContextCharsPerMemory?: number;

  public stats = {
    retrievals: 0,
    saves: 0,
    queries: 0,
    errors: 0,
    hashVerifications: 0,
  };
  // Performance metrics (not persisted)
  private queryCount = 0;
  private queryLatencySum = 0;
  private queryLatencies: number[] = []; // for p95
  private maxLatencyRetention = 1000;
  private totalResultScores = 0;
  private resultCount = 0;

  constructor(config: MemoryEngineConfig) {
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

  async init(): Promise<void> {
    // Initialize the store (load data from disk)
    await (this.storage.getStore() as any).init();
  }

  // ---------------------------------------------------------------------------
  // Project Management
  // ---------------------------------------------------------------------------

  setProject(project: string): void {
    this.currentProject = project;
  }

  getProject(): string {
    return this.currentProject;
  }

  // ---------------------------------------------------------------------------
  // Core Operations
  // ---------------------------------------------------------------------------

  async add(content: string, action: AgentAction, metadata?: Partial<AgentMemoryMetadata>): Promise<string> {
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
  async remember(action: AgentAction, content: string, metadata?: Partial<AgentMemoryMetadata>): Promise<string> {
    return this.add(content, action, metadata);
  }

  /**
   * Search memories by query
   */
  async recall(query: string): Promise<RetrievalResult> {
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
    const combined: {mem: any, score: number}[] = [];
    for (const item of [...exactScored, ...fuzzyScored]) {
      if (!seen.has(item.mem.id)) {
        seen.add(item.mem.id);
        combined.push(item);
      }
    }
    // Adaptive threshold: start with configured minScore, relax if no results
    const thresholds = this.adaptiveThresholds;
    let filtered: {mem: any, score: number}[] = [];
    for (const th of thresholds) {
      filtered = combined.filter(item => item.score >= th);
      if (filtered.length > 0) break; // stop at first non-empty
    }
    // Sort by score descending
    filtered.sort((a, b) => b.score - a.score);
    const memories = filtered.slice(0, this.topK).map(item => item.mem);

    // Track metrics: latency and result scores
    const latency = performance.now() - startTime;
    this.queryCount++;
    this.queryLatencySum += latency;
    this.queryLatencies.push(latency);
    if (this.queryLatencies.length > this.maxLatencyRetention) this.queryLatencies.shift();
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
  async getAll(): Promise<MemoryEntry[]> {
    return this.storage.getAll() as MemoryEntry[];
  }

  /**
   * Get recent memories
   */
  getRecent(limit: number = 10): any[] {
    return this.storage.getRecent(limit);
  }

  /**
   * Get by action type
   */
  getByAction(action: AgentAction): any[] {
    return this.retriever.filterByAction(this.storage.getAll(), action);
  }

  /**
   * Get by file path
   */
  getByFile(filePath: string): any[] {
    return this.retriever.filterByFile(this.storage.getAll(), filePath);
  }

  /**
   * Get by project
   */
  getByProject(project: string): any[] {
    return this.retriever.filterByProject(this.storage.getAll(), project);
  }

  /**
   * Get context string for LLM
   */
  getContext(limit: number = 10): string {
    let recent = this.getRecent(limit);
    if (!recent.length) return "No memories yet.";

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
  private prefilterMemories(memories: any[], queryWords: string[]): any[] {
    if (queryWords.length === 0) return memories;
    const qwSet = new Set(queryWords);
    const candidates: any[] = [];

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
        const synMap: Record<string, string[]> = {
          read_file: ['read','view','open','file','docs','documentation','cat','less','head'],
          edit_file: ['edit','modify','change','update','fix','patch','correct','alter'],
          execute_command: ['command','cmd','shell','terminal','git','install','npm','run','exec','start','stop','kill','killall','ps','grep','find','ls','cd','pwd','mkdir','rm','cp','mv','cat','echo','output','result'],
          project_info: ['project','setup','config','configure','info','about','name','description','title','version','author','license'],
          task_info: ['task','todo','issue','ticket','bug','feature','story','sprint','backlog'],
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
    const seen = new Set<string>();
    const unique = candidates.filter(mem => {
      const id = mem.id || JSON.stringify(mem);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    return unique;
  }

  /**
   * Get memory count
   */
  async count(): Promise<number> {
    return this.storage.count();
  }

  /**
   * Clear all memories
   */
  async clear(): Promise<void> {
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

  async applyForgetting(): Promise<number> {
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
      } else if (hoursOld > 72 && accessCount < 2) { // Older than 3 days with low access
        shouldForget = true;
      } else if (hoursOld > 24 && accessCount === 0) { // Older than 1 day with no access
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

  getRetrieverMetrics(): Record<string, number> {
    return this.retriever.getMetrics();
  }

  /**
   * Adjust topK dynamically
   */
  setTopK(topK: number): void {
    this.topK = topK;
  }

  /**
   * Adjust minimum score threshold
   */
  setMinScore(minScore: number): void {
    this.minScore = minScore;
  }

  /**
   * Adjust cache TTL for retriever
   */
  setCacheTTL(ttl: number): void {
    this.retriever.setCacheTTL(ttl);
  }

  getTopK(): number {
    return this.topK;
  }

  getMinScore(): number {
    return this.minScore;
  }

  getCacheTTL(): number {
    return this.retriever['cacheTTL'];
  }

  /**
   * Invalidate retrieval cache manually
   */
  invalidateCache(): void {
    this.retriever.invalidateCache();
  }

  // ---------------------------------------------------------------------------
  // Stats & Events
  // ---------------------------------------------------------------------------

  async getStats(): Promise<Record<string, number>> {
    return {
      ...this.stats,
      eventLogCount: this.eventLog.count(),
      memoryCount: await this.count(),
    };
  }

  /**
   * Get extended performance metrics (includes cache, latency, scores)
   */
  async getMetrics(): Promise<Record<string, number>> {
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
  private computeP95Latency(): number {
    const times = this.queryLatencies;
    if (times.length === 0) return 0;
    const sorted = [...times].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[idx] || sorted[sorted.length - 1];
  }

  /** Get underlying storage for advanced operations */
  getStorage(): MemoryStorage {
    return this.storage;
  }

  getEventLog(): MemoryEventLog {
    return this.eventLog;
  }
}