import { getTools } from '../src/main.js';

describe('main', () => {
  it('getTools should return an array of tool definitions from all tool classes', () => {
    const tools = getTools();
    expect(Array.isArray(tools)).toBe(true);
    // Check that tools from each category are present
    const names = tools.map(t => t.name);
    expect(names).toContain('file_read');
    expect(names).toContain('code_analyze');
    expect(names).toContain('command_execute');
    expect(names).toContain('search_files');
  });

  it('each tool should have required properties', () => {
    const tools = getTools();
    for (const tool of tools) {
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.type).toBe('object');
      expect(tool.parameters.properties).toBeDefined();
      expect(typeof tool.handler).toBe('function');
    }
  });
});
