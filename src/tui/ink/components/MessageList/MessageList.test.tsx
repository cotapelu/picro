/** @jsxImportSource react */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { MessageList, type MessageListRef } from './MessageList';
import type { Message } from '../../types.js';
import { ThemeProvider } from '../../hooks/useTheme.js';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    role: 'user',
    content: 'Hello world',
    timestamp: Date.now(),
    ...overrides,
  } as Message;
}

describe('MessageList', () => {
  it('renders empty state when no messages', () => {
    const { lastFrame } = renderWithTheme(
      <MessageList messages={[]} />
    );
    expect(lastFrame()).toContain('No messages yet');
  });

  it('renders a message', () => {
    const msg = createMessage({ role: 'user', content: 'Test message' });
    const { lastFrame } = renderWithTheme(
      <MessageList messages={[msg]} />
    );
    expect(lastFrame()).toContain('Test message');
  });

  it('renders multiple messages', () => {
    const msgs = [
      createMessage({ role: 'user', content: 'First' }),
      createMessage({ role: 'assistant', content: 'Second' }),
    ];
    const { lastFrame } = renderWithTheme(
      <MessageList messages={msgs} />
    );
    const frame = lastFrame();
    expect(frame).toContain('First');
    expect(frame).toContain('Second');
  });

  it('hides thinking blocks when prop true', () => {
    const msg = createMessage({
      role: 'assistant',
      content: 'Answer',
      thinkingBlocks: ['Thought'],
    });
    const { lastFrame } = renderWithTheme(
      <MessageList messages={[msg]} hideThinkingBlock={true} hideThinkingLabel="Thinking..." />
    );
    expect(lastFrame()).toContain('Thinking...');
  });

  it('shows tool calls', () => {
    const msg = createMessage({
      role: 'assistant',
      content: '',
      toolCalls: [{
        id: 't1',
        name: 'test_tool',
        arguments: { x: 1 },
        status: 'done',
        result: 'ok',
      }],
    });
    const { lastFrame } = renderWithTheme(
      <MessageList messages={[msg]} />
    );
    expect(lastFrame()).toContain('test_tool');
  });

  it('toggles tool expansion via onToolToggle callback', () => {
    const onToolToggle = vi.fn();
    const msg = createMessage({
      role: 'assistant',
      content: '',
      toolCalls: [{
        id: 't1',
        name: 'toggle_tool',
        arguments: {},
        status: 'done',
      }],
    });
    const { rerender } = renderWithTheme(
      <MessageList
        messages={[msg]}
        expandedTools={new Set()}
        onToolToggle={onToolToggle}
      />
    );

    // Simulate expanding
    rerender(
      <MessageList
        messages={[msg]}
        expandedTools={new Set(['t1'])}
        onToolToggle={onToolToggle}
      />
    );

    // The component doesn't call onToolToggle by itself unless user presses key.
    // This just ensures re-render works.
    expect(onToolToggle).not.toHaveBeenCalled();
  });

  it('handles streaming indicator', () => {
    const msg = createMessage({
      role: 'assistant',
      content: '',
      streaming: true,
    });
    const { lastFrame } = renderWithTheme(
      <MessageList messages={[msg]} />
    );
    expect(lastFrame()).toContain('...');
  });

  it('forwards ref with scrollToBottom method', () => {
    const ref = React.createRef<MessageListRef>();
    const { unmount } = renderWithTheme(
      <MessageList messages={[]} ref={ref} />
    );
    expect(ref.current).toBeDefined();
    expect(typeof ref.current?.scrollToBottom).toBe('function');
    unmount();
  });
});
