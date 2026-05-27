/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { MessageList } from './MessageList';
import { ThemeProvider } from '../../hooks/useTheme.js';
import type { Message } from '../../types.js';

function renderWithTheme(messages: Message[] = [], hideThinkingBlock?: boolean) {
  return render(
    <ThemeProvider initialMode="dark">
      <MessageList messages={messages} hideThinkingBlock={hideThinkingBlock} />
    </ThemeProvider>
  );
}

describe('MessageList', () => {
  it('renders empty state when no messages', () => {
    const { lastFrame } = renderWithTheme([]);
    expect(lastFrame()).toContain('No messages yet');
  });

  it('renders a user message', () => {
    const msgs: Message[] = [{
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    }];
    const { lastFrame } = renderWithTheme(msgs);
    expect(lastFrame()).toContain('Hello');
  });

  it('renders an assistant message', () => {
    const msgs: Message[] = [{
      id: '1',
      role: 'assistant',
      content: 'Hi there',
      timestamp: Date.now(),
    }];
    const { lastFrame } = renderWithTheme(msgs);
    expect(lastFrame()).toContain('Hi there');
  });

  it('handles tool call in message', () => {
    const msgs: Message[] = [{
      id: '1',
      role: 'assistant',
      content: '',
      toolCalls: [{
        id: 't1',
        name: 'read_file',
        arguments: { path: '/test.txt' },
        status: 'done',
        result: 'data',
      }],
      timestamp: Date.now(),
    }];
    const { lastFrame } = renderWithTheme(msgs);
    expect(lastFrame()).toContain('read_file'); // tool name displayed even when collapsed
  });

  it('shows separators between messages', () => {
    const msgs: Message[] = [
      { id: '1', role: 'user', content: 'First', timestamp: Date.now() },
      { id: '2', role: 'assistant', content: 'Second', timestamp: Date.now() },
    ];
    const { lastFrame } = renderWithTheme(msgs);
    // Should contain separator line (─) between
    expect(lastFrame()).toContain('─');
  });
});
