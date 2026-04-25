import { createMemoryTools, MemoryToolState } from '../src/tools/memory-tools.ts';
import type { AgentMemoryApp } from '@picro/memory';

// Mock the @picro/memory module
const mockMemoryApp = {
  remember: vi.fn().mockResolvedValue(undefined),
  recall: vi.fn().mockResolvedValue([]),
  getContext: vi.fn().mockReturnValue('test context'),
  clear: vi.fn(),
};

describe('MemoryTools', () => {
  let state: MemoryToolState;

  beforeEach(() => {
    state = new MemoryToolState();
    vi.clearAllMocks();
  });

  describe('createMemoryTools', () => {
    it('should return an array of 4 tool definitions', () => {
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBe(4);
    });

    it('should define memory_add tool with correct parameters', () => {
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      const addTool = tools.find(t => t.name === 'memory_add');
      expect(addTool).toBeDefined();
      expect(addTool?.description).toContain('remember');
      expect(addTool?.parameters).toEqual({
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['read', 'edit', 'command', 'info', 'concept', 'note'], description: expect.any(String) },
          content: { type: 'string', description: expect.any(String) },
          metadata: { type: 'string', description: expect.any(String) },
        },
        required: ['type', 'content'],
      });
    });

    it('should define memory_search tool with query parameter', () => {
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      const searchTool = tools.find(t => t.name === 'memory_search');
      expect(searchTool).toBeDefined();
      expect(searchTool?.parameters.properties.query.type).toBe('string');
    });

    it('should define memory_context tool with no parameters', () => {
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      const ctxTool = tools.find(t => t.name === 'memory_context');
      expect(ctxTool).toBeDefined();
      expect(Object.keys(ctxTool?.parameters.properties).length).toBe(0);
    });

    it('should define memory_clear tool requiring confirm', () => {
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      const clearTool = tools.find(t => t.name === 'memory_clear');
      expect(clearTool).toBeDefined();
      expect(clearTool?.parameters.required).toContain('confirm');
    });
  });

  describe('memory_add handler', () => {
    it('should call memoryApp.remember with action mapping for info type', async () => {
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      const handler = tools.find(t => t.name === 'memory_add')!.handler;
      await handler({}, { type: 'info', content: 'some content', metadata: 'some meta' });
      expect(mockMemoryApp.remember).toHaveBeenCalledWith('project_info', 'some content', { summary: 'some meta' });
      expect(state.addedCount).toBe(1);
    });

    it('should map type read to read_file', async () => {
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      const handler = tools.find(t => t.name === 'memory_add')!.handler;
      await handler({}, { type: 'read', content: 'file content' });
      expect(mockMemoryApp.remember).toHaveBeenCalledWith('read_file', 'file content', undefined);
    });

    it('should map type edit to edit_file', async () => {
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      const handler = tools.find(t => t.name === 'memory_add')!.handler;
      await handler({}, { type: 'edit', content: 'edit content' });
      expect(mockMemoryApp.remember).toHaveBeenCalledWith('edit_file', 'edit content', undefined);
    });

    it('should map type command to execute_command', async () => {
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      const handler = tools.find(t => t.name === 'memory_add')!.handler;
      await handler({}, { type: 'command', content: 'cmd' });
      expect(mockMemoryApp.remember).toHaveBeenCalledWith('execute_command', 'cmd', undefined);
    });

    it('should use defaults when type or content missing', async () => {
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      const handler = tools.find(t => t.name === 'memory_add')!.handler;
      await handler({}, {});
      expect(mockMemoryApp.remember).toHaveBeenCalledWith('project_info', 'Memory added', undefined);
    });
  });

  describe('memory_search handler', () => {
    it('should use provided query', async () => {
      mockMemoryApp.recall.mockResolvedValue([{ content: 'result' }]);
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      const handler = tools.find(t => t.name === 'memory_search')!.handler;
      const result = await handler({}, { query: 'test query' });
      expect(mockMemoryApp.recall).toHaveBeenCalledWith('test query');
      expect(result).toContain('Found 1 memories');
      expect(state.searchedCount).toBe(1);
    });

    it('should generate query from recent context if not provided', async () => {
      mockMemoryApp.recall.mockResolvedValue([{ content: 'r1' }, { content: 'r2' }]);
      mockMemoryApp.getContext.mockReturnValue('recent memory context words');
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      const handler = tools.find(t => t.name === 'memory_search')!.handler;
      const result = await handler({}, {});
      // first 3 words tokenized: 'recent', 'memory', 'context'
      expect(mockMemoryApp.recall).toHaveBeenCalledWith('recent memory context');
      expect(result).toContain('Found 2 memories');
    });

    it('should return message when no memories found', async () => {
      mockMemoryApp.recall.mockResolvedValue([]);
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      const handler = tools.find(t => t.name === 'memory_search')!.handler;
      const result = await handler({}, { query: 'nothing' });
      expect(result).toContain('No memories found');
    });
  });

  describe('memory_context handler', () => {
    it('should return current context', async () => {
      mockMemoryApp.getContext.mockReturnValue('current context');
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      const handler = tools.find(t => t.name === 'memory_context')!.handler;
      const result = await handler();
      expect(result).toBe('current context');
    });

    it('should return fallback message when no context', async () => {
      mockMemoryApp.getContext.mockReturnValue('');
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      const handler = tools.find(t => t.name === 'memory_context')!.handler;
      const result = await handler();
      expect(result).toBe('No memories yet.');
    });
  });

  describe('memory_clear handler', () => {
    it('should cancel if confirm is not true', async () => {
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      const handler = tools.find(t => t.name === 'memory_clear')!.handler;
      const result = await handler({}, { confirm: false });
      expect(result).toContain('cancelled');
      expect(mockMemoryApp.clear).not.toHaveBeenCalled();
    });

    it('should clear memories and reset state when confirm true', async () => {
      const tools = createMemoryTools(mockMemoryApp as unknown as AgentMemoryApp, state);
      state.incrementAdded();
      const handler = tools.find(t => t.name === 'memory_clear')!.handler;
      const result = await handler({}, { confirm: true });
      expect(mockMemoryApp.clear).toHaveBeenCalled();
      expect(result).toContain('cleared');
      expect(state.addedCount).toBe(0);
      expect(state.searchedCount).toBe(0);
    });
  });
});
