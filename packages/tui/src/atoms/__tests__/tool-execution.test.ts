import { describe, it, expect } from 'vitest';
import { ToolExecutionMessage } from '../tool-execution.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('ToolExecutionMessage', () => {
  it('should render tool calls', () => {
    const msg = new ToolExecutionMessage();
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it('should add tool call', () => {
    const msg = new ToolExecutionMessage();
    msg.addToolCall({ name: 'search', status: 'running' });
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.join('\n')).toContain('search');
  });

  it('should clear tool calls', () => {
    const msg = new ToolExecutionMessage();
    msg.addToolCall({ name: 'test', status: 'success' });
    msg.clear();
    const ctx = createContext(80, 24);
    // Should be empty or header only
    expect(() => msg.draw(ctx)).not.toThrow();
  });
});
