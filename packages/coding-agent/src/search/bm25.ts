/**
 * BM25 Ranking Algorithm
 * Used for message search relevance
 */

export interface SearchDoc {
  idx: number;
  role: string;
  content: string;
  timestamp: Date;
}

export interface ScoredDoc {
  doc: SearchDoc;
  score: number;
}

/**
 * Compute BM25 scores for documents against a query
 * Default params: k1=1.2, b=0.75 (standard)
 */
export function computeBM25(
  query: string,
  docs: SearchDoc[],
  k1: number = 1.2,
  b: number = 0.75
): ScoredDoc[] {
  // Tokenize query
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (queryTerms.length === 0) return docs.map(d => ({ doc: d, score: 0 }));

  // Tokenize docs
  const docsTokenized = docs.map(doc => {
    const tokens = doc.content.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const termFreq: Record<string, number> = {};
    for (const t of tokens) termFreq[t] = (termFreq[t] || 0) + 1;
    return { doc: doc, tokens, termFreq };
  });

  const N = docsTokenized.length;
  const avgDocLength = docsTokenized.reduce((sum, d) => sum + d.tokens.length, 0) / N;

  // IDF for each query term
  const idf: Record<string, number> = {};
  for (const term of queryTerms) {
    let docFreq = 0;
    for (const d of docsTokenized) {
      if (d.termFreq[term] > 0) docFreq++;
    }
    idf[term] = Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1);
  }

  // Score each doc
  const scored = docsTokenized.map(d => {
    let score = 0;
    const docLen = d.tokens.length;
    for (const term of queryTerms) {
      const tf = d.termFreq[term] || 0;
      if (tf > 0) {
        score += idf[term] * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLength)));
      }
    }
    return { doc: d.doc, score };
  });

  return scored.sort((a, b) => b.score - a.score);
}
