// A query with regex metacharacters must not crash BM25 scoring.
import { describe, it, expect } from 'vitest';
import { MemoryRetriever } from './retrieval.js';

const memories = [
  { id: '1', content: 'setup the project config file', metadata: {}, created_at: new Date().toISOString() },
  { id: '2', content: 'foo(1) is a function call', metadata: {}, created_at: new Date().toISOString() },
];

describe('BM25 retrieval', () => {
  it('survives a query with regex metacharacters', () => {
    const retriever = new MemoryRetriever();
    const results = retriever.search(memories, 'foo(1)', 'default', 5);
    expect(Array.isArray(results)).toBe(true);
  });

  it('survives a query with brackets and stars', () => {
    const retriever = new MemoryRetriever();
    const results = retriever.search(memories, 'config [a-z]* +', 'default', 5);
    expect(Array.isArray(results)).toBe(true);
  });

  it('still returns the matching memory for a normal query', () => {
    const retriever = new MemoryRetriever();
    const results = retriever.search(memories, 'project config', 'default', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].memory.content).toContain('config');
  });
});
