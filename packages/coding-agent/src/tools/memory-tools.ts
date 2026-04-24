/**
 * Memory Tools
 */

import type { ToolDefinition, ToolHandler } from '@picro/agent';
import { AgentMemoryApp } from '@picro/memory';

export class MemoryToolState {
  addedCount = 0;
  searchedCount = 0;
  incrementAdded() { this.addedCount++; }
  incrementSearched() { this.searchedCount++; }
  reset() { this.addedCount = 0; this.searchedCount = 0; }
}

export function createMemoryTools(
  memoryApp: AgentMemoryApp,
  state: MemoryToolState
): ToolDefinition[] {
  const handlerAdd: ToolHandler = async (_context: any, args: any) => {
    const type = args?.type || 'info';
    const content = args?.content || 'Memory added';
    const metadata = args?.metadata;

    const action = type === 'read' ? 'read_file'
      : type === 'edit' ? 'edit_file'
      : type === 'command' ? 'execute_command'
      : 'project_info';

    const meta = metadata ? { summary: String(metadata) } : undefined;
    await memoryApp.remember(action, content, meta as any);
    state.incrementAdded();

    return `Successfully added ${type} memory: ${content.substring(0, 40)}...`;
  };

  const handlerSearch: ToolHandler = async (_context: any, args: any) => {
    let query = args?.query;
    if (!query) {
      const recent = memoryApp.getContext();
      query = recent ? recent.split(/\s+/).slice(0, 3).join(' ') : 'recent memories';
    }

    const results = await memoryApp.recall(query);
    state.incrementSearched();

    if (results.length === 0) {
      return `No memories found matching "${query}". Try different keywords.`;
    }

    return `Found ${results.length} memories:\n` + results
      .map((r: any, i: number) => `[${i + 1}] ${r.content}`)
      .join('\n---\n');
  };

  const handlerContext: ToolHandler = async () => {
    return memoryApp.getContext() || 'No memories yet.';
  };

  const handlerClear: ToolHandler = async (_context: any, args: any) => {
    if (!args?.confirm) {
      return 'Clear cancelled. Please set confirm=true to delete all memories.';
    }
    memoryApp.clear();
    state.reset();
    return 'All memories have been cleared.';
  };

  return [
    {
      name: 'memory_add',
      description: 'Add a memory to storage. Use this to remember important information, file contents, commands, or project details.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['read', 'edit', 'command', 'info', 'concept', 'note'],
            description: 'Type of memory: read (file read), edit (file modification), command (terminal command), info (general info), concept (idea/concept), note (personal note)',
          },
          content: { type: 'string', description: 'The actual content of the memory.' },
          metadata: { type: 'string', description: 'Additional context like file path, command output summary.' },
        },
        required: ['type', 'content'],
      },
      handler: handlerAdd,
    },
    {
      name: 'memory_search',
      description: 'Search memories by query. Use this to find previously stored information. Be specific with keywords.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query with specific keywords.' },
        },
        required: ['query'],
      },
      handler: handlerSearch,
    },
    {
      name: 'memory_context',
      description: 'Get current context of recent memories.',
      parameters: { type: 'object', properties: {}, required: [] },
      handler: handlerContext,
    },
    {
      name: 'memory_clear',
      description: 'Clear all memories. Use this to reset the memory system (be careful!).',
      parameters: {
        type: 'object',
        properties: { confirm: { type: 'boolean', description: 'Set to true to confirm deletion' } },
        required: ['confirm'],
      },
      handler: handlerClear,
    },
  ];
}
