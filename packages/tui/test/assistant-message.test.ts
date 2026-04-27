import { describe, it, expect } from 'vitest';
import { AssistantMessage } from '../src/components/assistant-message.js';

describe('AssistantMessage', () => {
  it('should render markdown content', () => {
    const msg = new AssistantMessage({ content: '**Bold** and *italic*' });
    const lines = msg.draw({ width: 40, height: 10 });
    const output = lines.join('\n');
    expect(output).toContain('Bold');
    expect(output.toLowerCase()).toContain('italic');
  });

  it('should render empty content as empty array', () => {
    const msg = new AssistantMessage({ content: '' });
    const lines = msg.draw({ width: 40, height: 10 });
    expect(lines).toEqual([]);
  });

  it('should show loading state', () => {
    const msg = new AssistantMessage({ isLoading: true });
    const lines = msg.draw({ width: 40, height: 10 });
    expect(lines[0]).toContain('Thinking');
  });
});
