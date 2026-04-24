# @picro/memory

Memory system for AI agents with storage, retrieval, and context management.

## Features

- **Storage**: JSON file-based memory persistence
- **Retrieval**: Search and filter memories by query, action, or project
- **Context Management**: Automatic context building for LLM prompts
- **Event Logging**: Track all memory operations
- **Crypto Integrity**: SHA-256 hashing for memory integrity

## Installation

```bash
npm install @picro/memory
```

## Usage

```typescript
import { AgentMemoryApp, MemoryStore } from '@picro/memory';

// Create memory store
const store = new MemoryStore('memory.json');

// Create memory app
const memoryApp = new AgentMemoryApp(store, 'my-project');

// Remember file operations
memoryApp.rememberFileRead('/path/to/file.txt', 'file content summary');
memoryApp.rememberFileEdit('/path/to/file.txt', 'fixed bug');

// Remember commands
memoryApp.rememberCommand('npm install', 'installed packages');

// Recall memories
const results = memoryApp.recall('file operations');

// Get context for LLM
const context = memoryApp.getContext();
```

## API

### AgentMemoryApp

- `rememberFileRead(filePath, summary)` - Remember file read operation
- `rememberFileEdit(filePath, description)` - Remember file edit operation
- `rememberCommand(cmd, output)` - Remember command execution
- `rememberProjectInfo(info)` - Remember project information
- `rememberTaskInfo(taskId, info)` - Remember task information
- `recall(query)` - Search memories by query
- `getContext()` - Get formatted context for LLM
- `getRecentActions(limit)` - Get recent actions
- `clear()` - Clear all memories
- `getMemoryCount()` - Get total memory count
- `getByAction(action)` - Get memories by action type
- `getByFile(filePath)` - Get memories by file path
- `getStats()` - Get memory statistics

### MemoryStore

- `addMemory(id, content, embedding, metadata)` - Add memory
- `getMemory(id)` - Get memory by ID
- `getAllMemories()` - Get all memories
- `deleteMemory(id)` - Delete memory
- `updateMemory(id, content, metadata)` - Update memory
- `getMemoryCount()` - Get total memory count
- `clear()` - Clear all memories

## License

MIT
