# @picro/memory

Memory Management for AI Agents - Vector storage and semantic search.

## Features

- 💾 **Vector Storage** - Store and retrieve semantic memories
- 🔍 **Similarity Search** - Find relevant memories by embedding similarity
- 🏷️ **Metadata Filtering** - Filter by user, session, type, custom fields
- ⏰ **Temporal Indexing** - Time-based memory weighting
- 🔄 **Automatic Pruning** - Configurable retention policies
- 📊 **Token Accounting** - Track memory usage in tokens

## Installation

```bash
npm install @picro/memory
```

## Quick Start

```typescript
import { MemoryStore } from '@picro/memory';

const store = new MemoryStore({
  embedder: 'openai:text-embedding-ada-002',
});

// Store a memory
await store.addMemory({
  content: 'User prefers TypeScript over JavaScript',
  userId: 'user-123',
  sessionId: 'session-456',
  type: 'preference',
});

// Search for relevant memories
const results = await store.search('What programming language does the user like?', {
  userId: 'user-123',
  limit: 5,
});

console.log(results);
// [
//   { content: 'User prefers TypeScript...', score: 0.92, metadata: {...} },
//   ...
// ]
```

## Core Concepts

### MemoryStore

The main class for memory operations:

```typescript
interface MemoryConfig {
  /** Embedding model to use */
  embedder: string;
  /** Max memories to store per user (default: 10000) */
  maxMemories?: number;
  /** Default retention policy */
  retention?: RetentionPolicy;
  /** Vector DB backend (default: 'memory') */
  backend?: 'memory' | 'pgvector' | 'qdrant' | 'pinecone';
}

class MemoryStore {
  /** Add a memory */
  async addMemory(memory: Memory): Promise<string> {}

  /** Search for similar memories */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {}

  /** Get memory by ID */
  async getMemory(id: string): Promise<Memory | null> {}

  /** Update a memory */
  async updateMemory(id: string, updates: Partial<Memory>): Promise<void> {}

  /** Delete a memory */
  async deleteMemory(id: string): Promise<void> {}

  /** Clear all memories */
  async clear(): Promise<void> {}

  /** Get stats */
  async getStats(): Promise<MemoryStats> {}
}
```

### Memory Structure

```typescript
interface Memory {
  /** Unique ID */
  id: string;

  /** Memory content (text to embed) */
  content: string;

  /** User ID (for multi-user systems) */
  userId: string;

  /** Session ID (optional) */
  sessionId?: string;

  /** Memory type (preference, fact, skill, etc.) */
  type?: string;

  /** Embedding vector (auto-generated) */
  embedding?: number[];

  /** Metadata (custom fields) */
  metadata?: Record<string, any>;

  /** Creation timestamp */
  createdAt: Date;

  /** Last accessed timestamp */
  accessedAt: Date;

  /** Access count */
  accessCount: number;
}
```

## Search Options

```typescript
interface SearchOptions {
  /** Maximum results to return */
  limit?: number;

  /** Minimum similarity threshold (0-1) */
  threshold?: number;

  /** Filter by user */
  userId?: string;

  /** Filter by session */
  sessionId?: string;

  /** Filter by memory type */
  type?: string;

  /** Custom metadata filters */
  metadata?: Record<string, any>;

  /** Time range */
  createdAt?: { since: Date; until?: Date };

  /** Include embeddings in results */
  includeEmbeddings?: boolean;
}
```

## Retention Policies

```typescript
interface RetentionPolicy {
  /** Max age in days (default: 365) */
  maxAgeDays?: number;

  /** Min access count to keep (default: 0) */
  minAccessCount?: number;

  /** Max memories per user (default: 10000) */
  maxPerUser?: number;

  /** Auto-compaction on add */
  autoCompact?: boolean;
}
```

## Backends

- **memory** (default) - In-memory store (ephemeral, fast)
- **pgvector** - PostgreSQL with pgvector extension
- **qdrant** - Qdrant vector database
- **pinecone** - Pinecone cloud service

Configure backend:

```typescript
const store = new MemoryStore({
  embedder: 'openai:text-embedding-ada-002',
  backend: 'pgvector',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'memory',
  },
});
```

## Utility Functions

```typescript
import { chunkText, countTokens } from '@picro/memory';

// Split long text into chunks for embedding
const chunks = chunkText(longDocument, { chunkSize: 1000, overlap: 200 });

// Estimate token count
const tokens = countTokens('Hello world'); // 2
```

## Integration with Agent

```typescript
import { MemoryStore } from '@picro/memory';
import { AgentSession } from '@picro/agent';

const memory = new MemoryStore({ embedder: 'openai:text-embedding-ada-002' });
const session = new AgentSession({ /* config */ });

// Add memories when user shares info
session.on('user:message', async (msg) => {
  if (msg.content.includes('my name is')) {
    await memory.addMemory({
      content: `User's name is ${extractName(msg.content)}`,
      userId: session.config.userId,
      type: 'personal',
    });
  }
});

// Retrieve relevant memories for prompts
const relevant = await memory.search(session.currentPrompt, {
  userId: session.config.userId,
  limit: 10,
});
session.setContextMemories(relevant);
```

## API Reference

See [API.md](./docs/API.md) for complete API.

## License

Apache-2.0

---

<p align="center">Smart memory for AI agents</p>
