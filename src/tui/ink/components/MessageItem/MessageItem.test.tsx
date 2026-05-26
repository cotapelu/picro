/** @jsxImportSource react */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { ThemeProvider } from '../../hooks/useTheme.js';
import { MessageItem } from './MessageItem';
import type { Message } from '../../types.js';

// Wrapper to provide theme context
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

describe('MessageItem', () => {
  it('renders user message without role label', () => {
    const msg = createMessage({ role: 'user', content: 'User message' });
    const { lastFrame } = renderWithTheme(<MessageItem message={msg} />);
    // User role label should NOT appear
    expect(lastFrame()).not.toContain('User:');
    // Content should appear
    expect(lastFrame()).toContain('User message');
  });

  it('renders assistant message with role label', () => {
    const msg = createMessage({ role: 'assistant', content: 'Assistant response' });
    const { lastFrame } = renderWithTheme(<MessageItem message={msg} />);
    expect(lastFrame()).toContain('Assistant:');
    expect(lastFrame()).toContain('Assistant response');
  });

  it('renders tool message with role label', () => {
    const msg = createMessage({ role: 'tool', content: 'Tool output' });
    const { lastFrame } = renderWithTheme(<MessageItem message={msg} />);
    expect(lastFrame()).toContain('Tool:');
    expect(lastFrame()).toContain('Tool output');
  });

  it('renders bashExecution message without role label', () => {
    const msg = createMessage({
      role: 'bashExecution',
      bashCommand: 'ls',
      bashOutput: 'file.txt',
      bashExitCode: 0,
    });
    const { lastFrame } = renderWithTheme(<MessageItem message={msg} />);
    // Should not show "BashExecution:" label
    expect(lastFrame()).not.toContain('BashExecution:');
    expect(lastFrame()).toContain('ls');
    expect(lastFrame()).toContain('file.txt');
  });

  it('renders compactionSummary message without role label', () => {
    const msg = createMessage({
      role: 'compactionSummary',
      content: 'Compacted 100 tokens',
      tokensBefore: 100,
    });
    const { lastFrame } = renderWithTheme(<MessageItem message={msg} />);
    expect(lastFrame()).not.toContain('CompactionSummary:');
    expect(lastFrame()).toContain('Compacted 100 tokens');
  });

  it('renders branchSummary message without role label', () => {
    const msg = createMessage({
      role: 'branchSummary',
      content: 'Branch summary',
    });
    const { lastFrame } = renderWithTheme(<MessageItem message={msg} />);
    expect(lastFrame()).not.toContain('BranchSummary:');
    expect(lastFrame()).toContain('Branch summary');
  });

  it('renders custom message without role label', () => {
    const msg = createMessage({
      role: 'custom',
      content: 'Custom content',
      customType: 'special',
    });
    const { lastFrame } = renderWithTheme(<MessageItem message={msg} />);
    expect(lastFrame()).not.toContain('Custom:');
    expect(lastFrame()).toContain('Custom content');
  });

  it('renders assistant message with thinking blocks', () => {
    const msg = createMessage({
      role: 'assistant',
      content: 'Response',
      thinkingBlocks: ['Thinking 1', 'Thinking 2'],
    });
    const { lastFrame } = renderWithTheme(<MessageItem message={msg} />);
    // Thinking blocks should appear italicized, but we just check text
    expect(lastFrame()).toContain('[Thinking: Thinking 1]');
    expect(lastFrame()).toContain('[Thinking: Thinking 2]');
    expect(lastFrame()).toContain('Response');
  });

  it('renders assistant message with hidden thinking block showing label', () => {
    const msg = createMessage({
      role: 'assistant',
      content: 'Response',
      thinkingBlocks: ['Hidden thought'],
    });
    const { lastFrame } = renderWithTheme(
      <MessageItem message={msg} hideThinkingBlock={true} hiddenThinkingLabel="Thinking..." />
    );
    // Should show the hidden label, not the actual thinking
    expect(lastFrame()).toContain('Thinking...');
    expect(lastFrame()).not.toContain('[Thinking: Hidden thought]');
    expect(lastFrame()).toContain('Response');
  });

  it('renders error message', () => {
    const msg = createMessage({
      role: 'assistant',
      content: 'Partial',
      error: 'Network failure',
    });
    const { lastFrame } = renderWithTheme(<MessageItem message={msg} />);
    // The error should be displayed with "Error:" prefix (as per component)
    expect(lastFrame()).toContain('Error: Network failure');
  });

  it('renders tool calls with status (collapsed)', () => {
    const toolCall = {
      id: 'tool-1',
      name: 'read_file',
      arguments: { path: '/test.txt' },
      status: 'done' as const,
      result: 'content',
    };
    const msg = createMessage({
      role: 'assistant',
      content: '',
      toolCalls: [toolCall],
    });
    const { lastFrame } = renderWithTheme(<MessageItem message={msg} expandedTools={new Set()} onToolToggle={() => {}} />);
    expect(lastFrame()).toContain('read_file');
    expect(lastFrame()).toContain('done');
    // Collapsed: arguments NOT shown
    expect(lastFrame()).not.toContain('/test.txt');
  });

  it('renders streaming indicator when streaming and no content', () => {
    const msg = createMessage({
      role: 'assistant',
      content: '',
      streaming: true,
    });
    const { lastFrame } = renderWithTheme(<MessageItem message={msg} />);
    // The component shows "..." when streaming and no content
    expect(lastFrame()).toContain('...');
  });

  it('renders tool call expanded when in expandedTools set', () => {
    const toolCall = {
      id: 'tool-expand',
      name: 'expand_me',
      arguments: { arg: 'value' },
      status: 'done' as const,
      result: 'output',
    };
    const msg = createMessage({
      role: 'assistant',
      content: '',
      toolCalls: [toolCall],
    });
    const expandedTools = new Set<string>(['tool-expand']);
    const { lastFrame } = renderWithTheme(
      <MessageItem message={msg} expandedTools={expandedTools} onToolToggle={() => {}} />
    );
    // Expanded should show output; not expanded hides output
    expect(lastFrame()).toContain('Output:'); // because expanded shows result
    expect(lastFrame()).toContain('output');
  });
});
