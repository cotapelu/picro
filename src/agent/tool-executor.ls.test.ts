import { describe, it, expect } from 'vitest';
import { ToolExecutor } from './tool-executor.js';
import { createLsToolDefinition } from '../tools/ls.js';

describe('ToolExecutor with ls tool', () => {
  it('should execute ls successfully', async () => {
    const cwd = process.cwd();
    const toolDef = createLsToolDefinition(cwd);
    const executor = new ToolExecutor();
    executor.register(toolDef);

    const toolCall = { id: '1', name: 'ls', arguments: {} };
    const context = { round: 1, runtimeState: {}, signal: undefined };

    const result = await executor.execute(toolCall, context);

    expect(result.isError).toBe(false);
    expect(result.toolCallId).toBe('1');
    expect(result.toolName).toBe('ls');
    // result.content is array of TextBlock|ImageBlock
    const contentBlocks = result.content as any[];
    expect(contentBlocks.length).toBeGreaterThan(0);
    const first = contentBlocks[0];
    expect(first.type).toBe('text');
    const text = first.text;
    expect(text).toContain('Total:');
  });

  it('should execute ls with path argument', async () => {
    const cwd = process.cwd();
    const toolDef = createLsToolDefinition(cwd);
    const executor = new ToolExecutor();
    executor.register(toolDef);

    const toolCall = { id: '1', name: 'ls', arguments: { path: 'src' } };
    const context = { round: 1, runtimeState: {}, signal: undefined };

    const result = await executor.execute(toolCall, context);

    expect(result.isError).toBe(false);
    const text = (result.content[0] as any).text;
    expect(text).toMatch(/src/);
  });
});
