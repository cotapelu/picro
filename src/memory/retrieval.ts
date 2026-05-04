/**
 * Retrieval Layer
 * Search and filter memories
 */

import type { AgentAction } from './types';
import { performance } from 'perf_hooks';

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

// ---------------------------------------------------------------------------
// Scorer
// ---------------------------------------------------------------------------

export class MemoryScorer {
  /**
   * Score a memory against a query
   */
  private synonymMap = new Map<string, string[]>([
    ['setup', ['setup', 'config', 'configuration', 'configure']],
    ['config', ['setup', 'config', 'configuration', 'configure']],
    ['install', ['install', 'setup', 'configure']],
    ['read', ['read', 'view', 'open']],
    ['edit', ['edit', 'modify', 'change', 'update']],
    ['command', ['command', 'cmd', 'shell', 'terminal']],
  ]);

  // Compiled query cache to avoid recompiling regexes for the same query
  private _compiledQuery = '';
  private _compiledQueryWords: string[] = [];
  private _compiledSynonymRegexes = new Map<string, RegExp>();

  private getSynonyms(word: string): string[] {
    return this.synonymMap.get(word) || [word];
  }

  // Compile regexes for all query words and their synonyms once per distinct query
  private compileQuery(query: string): void {
    const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9\s./\-]/g, '');
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);
    this._compiledQuery = query;
    this._compiledQueryWords = queryWords;
    this._compiledSynonymRegexes.clear();
    for (const qw of queryWords) {
      const synonyms = this.getSynonyms(qw);
      const escaped = synonyms.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const pattern = escaped.join('|');
      this._compiledSynonymRegexes.set(qw, new RegExp(pattern, 'g'));
    }
  }

  // Infer expected action from query keywords
  private getExpectedAction(queryWords: string[]): string | null {
    const readSynonyms = ['read', 'view', 'open'];
    if (queryWords.some(qw => readSynonyms.includes(qw))) return 'read_file';
    const editSynonyms = ['edit', 'modify', 'change', 'update'];
    if (queryWords.some(qw => editSynonyms.includes(qw))) return 'edit_file';
    const cmdSynonyms = ['command', 'cmd', 'shell', 'terminal'];
    if (queryWords.some(qw => cmdSynonyms.includes(qw))) return 'execute_command';
    if (queryWords.includes('git')) return 'execute_command';
    const hasProject = queryWords.includes('project');
    const hasSetup = queryWords.some(qw => ['setup','install','config','configure'].includes(qw));
    if (hasProject && hasSetup) return 'project_info';
    return null;
  }

  score(memory: any, query: string, currentProject: string): number {
    // Compile regexes once per query
    if (query !== this._compiledQuery) {
      this.compileQuery(query);
    }
    if (this._compiledQueryWords.length === 0) return 0;

    const content = memory.content.toLowerCase();
    const metadata = memory.metadata || {};

    let score = 0;
    let matchedWords = 0;

    // 1. Exact keyword match with term frequency and synonyms (using precompiled regex)
    for (const qw of this._compiledQueryWords) {
      const regex = this._compiledSynonymRegexes.get(qw);
      if (!regex) continue;
      regex.lastIndex = 0;
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        matchedWords++;
        score += 4;
        if (matches.length > 1) score += (matches.length - 1);
      }
    }

    // Bonus: if multiple query words matched (+5)
    if (matchedWords >= 2) score += 5;
    // Perfect match bonus: all query words present
    if (matchedWords === this._compiledQueryWords.length && matchedWords > 0) {
      score += 15;
    }

    // 2. Exact phrase match bonus: if full normalized query appears as substring
    if (content.includes(this._compiledQuery)) {
      score += 10;
    }

    // 3. File path match (+15) - high priority for file queries
    if (metadata.filePath) {
      const pathLower = metadata.filePath.toLowerCase();
      // Exact path match
      if (pathLower.includes(this._compiledQuery) || this._compiledQuery.includes(pathLower.split('/').pop() || '')) {
        score += 15;
      }
      // Partial path match
      for (const qw of this._compiledQueryWords) {
        if (pathLower.includes(qw)) {
          score += 3;
        }
      }
    }

    // 4. Action type match (+2)
    if (metadata._action && this._compiledQuery.includes(metadata._action)) {
      score += 2;
    }

    // 4b. Generic metadata match: query words in any string metadata field (+3 per word)
    for (const key of Object.keys(metadata)) {
      const val = metadata[key];
      if (typeof val === 'string') {
        const valLower = val.toLowerCase();
        for (const qw of this._compiledQueryWords) {
          if (valLower.includes(qw)) {
            score += 3;
          }
        }
      }
    }

    // 5. Project filter - zero score for wrong project
    if (metadata._project && metadata._project !== currentProject) {
      return 0;
    }

    let baseScore = score;
    // Penalty for mismatched action type
    if (metadata._action) {
      const expected = this.getExpectedAction(this._compiledQueryWords);
      if (expected && metadata._action !== expected) {
        baseScore -= 30;
      }
    }
    // If no query match after penalties, return 0
    if (baseScore <= 0) {
      return 0;
    }

    // 6. Recency boost (multiplicative) - boost recent matching memories
    let recencyFactor = 1.0;
    const ageMs = Date.now() - new Date(memory.created_at).getTime();
    const hoursAgo = ageMs / (1000 * 60 * 60);
    if (hoursAgo < 1) recencyFactor = 3.0;      // Last hour: triple (experiment)
    else if (hoursAgo < 6) recencyFactor = 1.5; // Last 6 hours: 1.5x
    else if (hoursAgo < 24) recencyFactor = 1.2; // Last 24 hours: 1.2x
    else if (hoursAgo < 72) recencyFactor = 1.1; // Last 3 days: 1.1x
    else if (hoursAgo < 168) recencyFactor = 1.05; // Last week: 1.05x
    score = Math.floor(baseScore * recencyFactor);

    // 7. Content length bonus - prefer concise content
    const contentLength = memory.content.length;
    if (contentLength < 200) score += 2;  // Short = more focused

    // 8. Access count bonus - frequently accessed memories are more useful
    score += (memory.access_count || 0) * 2.0; // increased weight

    return score;
  }
}

// ---------------------------------------------------------------------------
// Retriever
// ---------------------------------------------------------------------------

interface SearchDoc {
  idx: number;
  role: string;
  content: string;
  timestamp: number;
}

function computeBM25(
  query: string,
  memories: any[],
  k1 = 1.2,
  b = 0.75
): { doc: SearchDoc; bm25Score: number }[] {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  const N = memories.length;
  if (N === 0) return [];

  // Precompute doc lengths and lowercased content
  const docLengths = new Array(N);
  const lowerContents = new Array(N);
  let totalLen = 0;
  for (let i = 0; i < N; i++) {
    const mem = memories[i];
    const len = mem.content.length;
    docLengths[i] = len;
    totalLen += len;
    lowerContents[i] = mem.content.toLowerCase();
  }
  const avgDocLen = totalLen / N;

  // Precompile regexes for query terms
  const termRegexes = queryTerms.map(term => new RegExp(term, 'g'));

  // Compute term frequencies (tf) per document and document frequencies (df)
  const dfs = new Array(queryTerms.length).fill(0);
  const tfs: number[][] = Array.from({ length: N }, () => new Array(queryTerms.length).fill(0));

  for (let i = 0; i < N; i++) {
    const lower = lowerContents[i];
    for (let j = 0; j < queryTerms.length; j++) {
      const regex = termRegexes[j];
      regex.lastIndex = 0;
      const matches = lower.match(regex);
      const tf = matches ? matches.length : 0;
      tfs[i][j] = tf;
      if (tf > 0) dfs[j]++;
    }
  }

  // Score each document
  const results: { doc: SearchDoc; bm25Score: number }[] = [];
  for (let i = 0; i < N; i++) {
    const mem = memories[i];
    const docLen = docLengths[i];
    let bm25Score = 0;
    for (let j = 0; j < queryTerms.length; j++) {
      const tf = tfs[i][j];
      const df = dfs[j];
      if (df === 0) continue;
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
      const numerator = tf * k1;
      const denominator = tf + k1 * (1 - b + b * (docLen / avgDocLen));
      bm25Score += idf * (numerator / denominator);
    }
    results.push({
      doc: { idx: mem.id || i, role: 'memory', content: mem.content, timestamp: new Date(mem.created_at).getTime() },
      bm25Score,
    });
  }
  return results;
}

export class MemoryRetriever {
  private scorer = new MemoryScorer();
  private defaultLimit = 5;
  private cache: Map<string, {memories: any[], timestamp: number}> = new Map();
  private cacheTTL: number;
  // metrics
  private cacheHits = 0;
  private cacheMisses = 0;
  // Latency profiling
  private retrievalTimes: number[] = []; // keep last N
  private maxRetention = 1000;

  constructor() {
    this.cacheTTL = 300000; // default 5 minutes
  }

  setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl;
  }

  getMetrics() {
    const total = this.cacheHits + this.cacheMisses;
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRate: total > 0 ? this.cacheHits / total : 0,
      cacheSize: this.cache.size,
    };
  }

  /** Get latency stats for search calls */
  getRetrievalStats(): { count: number; avgMs: number; p95Ms: number; maxMs: number } {
    const times = this.retrievalTimes;
    if (times.length === 0) {
      return { count: 0, avgMs: 0, p95Ms: 0, maxMs: 0 };
    }
    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / times.length;
    const max = Math.max(...times);
    const sorted = [...times].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index] || max;
    return { count: times.length, avgMs: avg, p95Ms: p95, maxMs: max };
  }

  /**
   * Search memories by query string
   */
  search(
    memories: any[],
    query: string,
    currentProject: string,
    limit?: number
  ): Array<{ memory: any; scorerScore: number; bm25Score: number }> {
    if (!memories.length || !query) return [];

    const maxResults = limit || this.defaultLimit;

    // Check cache
    const cacheKey = `${query}:${currentProject}:${maxResults}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && (now - cached.timestamp) < this.cacheTTL) {
      this.cacheHits++;
      return cached.memories;
    }
    this.cacheMisses++;

    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Normalize query
    const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9\s./\-]/g, '');
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);

    // If no valid query words, return empty
    if (queryWords.length === 0) return [];

    // Compute BM25 scores for candidate set (optimized)
    const bm25Results = computeBM25(query, memories);
    const bm25Map = new Map<number, number>();
    for (const s of bm25Results) {
      bm25Map.set(s.doc.idx, s.bm25Score);
    }

    // Score all memories: custom scorer + BM25 boost
    const scored: Array<{ memory: any; scorerScore: number; bm25Score: number }> = memories.map(mem => ({
      memory: mem,
      scorerScore: this.scorer.score(mem, query, currentProject),
      bm25Score: (bm25Map.get(mem.id) || 0) * 10,
    }));

    // Sort by combined score (scorer + bm25) descending, then by recency for ties
    scored.sort((a, b) => {
      const combinedA = a.scorerScore + a.bm25Score;
      const combinedB = b.scorerScore + b.bm25Score;
      if (combinedB !== combinedA) return combinedB - combinedA;
      return new Date(b.memory.created_at).getTime() - new Date(a.memory.created_at).getTime();
    });

    // Get top results with positive combined score
    const topScored = scored.filter(s => s.scorerScore + s.bm25Score > 0).slice(0, maxResults);

    // Cache the result (full objects with scores)
    this.cache.set(cacheKey, { memories: topScored, timestamp: Date.now() });

    // Record latency
    const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
    this.retrievalTimes.push(elapsed);
    if (this.retrievalTimes.length > this.maxRetention) {
      this.retrievalTimes.shift();
    }

    return topScored;
  }

  /**
   * Invalidate cache (call when memories change)
   */
  invalidateCache(): void {
    this.cache.clear();
  }

  /**
   * Get memories by action type
   */
  filterByAction(memories: any[], action: AgentAction): any[] {
    return memories.filter(m => m.metadata?._action === action);
  }

  /**
   * Get memories by file path
   */
  filterByFile(memories: any[], filePath: string): any[] {
    return memories.filter(m =>
      m.metadata?.filePath?.includes(filePath)
    );
  }

  /**
   * Get memories by project
   */
  filterByProject(memories: any[], project: string): any[] {
    return memories.filter(m => m.metadata?._project === project);
  }

  /**
   * Get memories by task
   */
  filterByTask(memories: any[], taskId: string): any[] {
    return memories.filter(m => m.metadata?.taskId === taskId);
  }

  /**
   * Advanced retrieval with options
   */
  retrieve(memories: any[], options: RetrievalOptions, currentProject: string): any[] {
    let results = [...memories];

    // Filter by project
    if (options.project) {
      results = this.filterByProject(results, options.project);
    } else {
      // Default to current project
      results = this.filterByProject(results, currentProject);
    }

    // Filter by action
    if (options.action) {
      results = this.filterByAction(results, options.action);
    }

    // Filter by file path
    if (options.filePath) {
      results = this.filterByFile(results, options.filePath);
    }

    // Filter by task
    if (options.taskId) {
      results = this.filterByTask(results, options.taskId);
    }

    // Sort by recency (most recent first)
    results.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Limit
    const limit = options.limit || this.defaultLimit;
    return results.slice(0, limit);
  }

  /**
   * Fuzzy search - find memories with partial matches
   */
  fuzzySearch(
    memories: any[],
    query: string,
    currentProject: string,
    limit: number = 3
  ): Array<{ memory: any; score: number }> {
    if (!memories.length || !query) return [];

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    if (queryWords.length === 0) return [];

    // Score with partial matching
    const scored: Array<{ memory: any; score: number }> = memories.map(mem => {
      const content = mem.content.toLowerCase();
      const metadata = mem.metadata || {};

      // Filter by project
      if (metadata._project && metadata._project !== currentProject) {
        return { memory: mem, score: 0 };
      }

      let score = 0;
      let matchCount = 0;

      // Partial substring match with scoring
      for (const qw of queryWords) {
        const contentWords = content.split(/\s+/);
        let wordMatches = 0;

        for (const cw of contentWords) {
          // Partial match (starts with or contains)
          if (cw.startsWith(qw.slice(0, 4)) || cw.includes(qw.slice(0, 4))) {
            wordMatches++;
          }
        }

        if (wordMatches > 0) {
          score += wordMatches;
          matchCount++;
        }
      }

      // Bonus for multiple word matches
      if (matchCount >= 2) score += 3;

      return { memory: mem, score };
    });

    // Sort by score then recency
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.memory.created_at).getTime() - new Date(a.memory.created_at).getTime();
    });

    return scored.filter(s => s.score > 0).slice(0, limit);
  }
}