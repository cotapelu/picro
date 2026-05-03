import { describe, it, expect } from 'vitest';
import { ToolExecutionMessage, type ToolCallInfo } from '../tool-execution.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('ToolExecutionMessage', () => {
  it('should render tool calls', () => {
    const msg = new ToolExecutionMessage({
      tools: [
        { name: 'search', status: 'running' },
        { name: 'calc', status: 'success', output: 'result=42' },
      ],
    });
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.some(l => l.includes('Tool Execution'))).toBe(true);
    expect(result.some(l => l.includes('search'))).toBe(true);
    expect(result.some(l => l.includes('calc'))).toBe(true);
    expect(result.some(l => l.includes('result=42'))).toBe(true);
  });

  it('should show appropriate icons for status', () => {
    const msg = new ToolExecutionMessage({
      tools: [
        { name: 'running', status: 'running' },
        { name: 'success', status: 'success' },
        { name: 'error', status: 'error' },
      ],
    });
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.join('\n')).toContain('⏳');
    expect(result.join('\n')).toContain('✓');
    expect(result.join('\n')).toContain('✗');
  });

  it('should add tool calls dynamically', () => {
    const msg = new ToolExecutionMessage();
    msg.addToolCall({ name: 'dynamic', status: 'running' });

    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.some(l => l.includes('dynamic'))).toBe(true);
  });
});
