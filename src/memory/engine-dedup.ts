/**
 * Deduplication utilities for MemoryEngine
 * Extracted to avoid circular dependencies
 */
import { memoryHash } from './storage';
import type { AgentAction, AgentMemoryMetadata, MemoryEntry } from './types';

export interface DeduplicationConfig {
  enabled: boolean;
  similarityThreshold: number; // 0-1, default 0.95
}

/**
 * Compute Jaccard similarity between two strings
 */
export function computeSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0;
  
  const normalize = (s: string) => 
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
      
  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return intersection.size / union.size;
}

/**
 * Find duplicate memory by exact hash match
 */
export function findByHash(
  memories: MemoryEntry[], 
  content: string, 
  action: AgentAction, 
  metadata?: Partial<AgentMemoryMetadata>
): MemoryEntry | null {
  const newHash = memoryHash(content, { action, ...metadata });
  return memories.find(m => m.hash === newHash) || null;
}

/**
 * Find similar memory by content similarity
 */
export function findBySimilarity(
  memories: MemoryEntry[],
  content: string,
  action: AgentAction,
  threshold: number = 0.95
): MemoryEntry | null {
  const candidates = memories.filter(m => m.metadata.action === action);
  let bestMatch: MemoryEntry | null = null;
  let bestScore = 0;
  
  for (const mem of candidates) {
    const score = computeSimilarity(content, mem.content);
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = mem;
    }
  }
  
  return bestMatch;
}

/**
 * Detect if a new memory would be a duplicate
 */
export function detectDuplicate(
  memories: MemoryEntry[],
  content: string,
  action: AgentAction,
  metadata?: Partial<AgentMemoryMetadata>,
  config: DeduplicationConfig = { enabled: true, similarityThreshold: 0.95 }
): MemoryEntry | null {
  if (!config.enabled) return null;
  
  // Check exact hash first
  const hashMatch = findByHash(memories, content, action, metadata);
  if (hashMatch) return hashMatch;
  
  // Check similarity
  return findBySimilarity(memories, content, action, config.similarityThreshold);
}
