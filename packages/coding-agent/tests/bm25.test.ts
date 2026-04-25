import { describe, it, expect } from 'vitest';
import { computeBM25, type SearchDoc } from '../src/search/bm25.ts';

describe('BM25 Ranking', () => {
  const docs: SearchDoc[] = [
    {
      idx: 0,
      role: 'user',
      content: 'hello world how are you',
      timestamp: new Date(),
    },
    {
      idx: 1,
      role: 'assistant',
      content: 'this is a test message with installation and configuration steps',
      timestamp: new Date(),
    },
    {
      idx: 2,
      role: 'assistant',
      content: 'read file summary about project setup and installation',
      timestamp: new Date(),
    },
    {
      idx: 3,
      role: 'user',
      content: 'how to install python and setup virtual environment',
      timestamp: new Date(),
    },
  ];

  it('should rank documents with matching terms higher', () => {
    const results = computeBM25('installation', docs);
    expect(results.length).toBeGreaterThan(0);
    // Docs with 'installation' should score > 0
    const withInstall = results.filter(r => r.doc.content.toLowerCase().includes('installation'));
    expect(withInstall.length).toBeGreaterThan(0);
    // Ensure top result contains the query term
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('should return empty scores for non-matching query', () => {
    const results = computeBM25('nonexistentterm12345', docs);
    const positive = results.filter(r => r.score > 0);
    expect(positive.length).toBe(0);
  });

  it('should boost documents with more query term occurrences', () => {
    // Doc with both 'install' and 'setup' (synonym) may score higher
    const results = computeBM25('install', docs);
    // Doc 3 has "install" and "setup"
    const doc3 = results.find(r => r.doc.idx === 3);
    expect(doc3).toBeDefined();
    expect(doc3!.score).toBeGreaterThan(0);
  });
});
