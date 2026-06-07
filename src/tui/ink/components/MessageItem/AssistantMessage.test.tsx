/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ThemeProvider } from '../../hooks/useTheme.js';
import { AssistantMessage } from './AssistantMessage';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

describe('AssistantMessage', () => {
  it('renders content only', () => {
    const { lastFrame } = renderWithTheme(<AssistantMessage content="Hello from assistant" />);
    expect(lastFrame()).toContain('Hello from assistant');
  });

  it('renders thinking blocks when present and not hidden', () => {
    const { lastFrame } = renderWithTheme(
      <AssistantMessage content="Answer" thinkingBlocks={['I need to think']} />
    );
    expect(lastFrame()).toContain('[Thinking: I need to think]');
    expect(lastFrame()).toContain('Answer');
  });

  it('renders multiple thinking blocks', () => {
    const { lastFrame } = renderWithTheme(
      <AssistantMessage content="Answer" thinkingBlocks={['Thought 1', 'Thought 2']} />
    );
    expect(lastFrame()).toContain('[Thinking: Thought 1]');
    expect(lastFrame()).toContain('[Thinking: Thought 2]');
  });

  it('hides thinking block when hideThinkingBlock is true', () => {
    const { lastFrame } = renderWithTheme(
      <AssistantMessage
        content="Answer"
        thinkingBlocks={['Secret thought']}
        hideThinkingBlock={true}
        hiddenThinkingLabel="Thinking..."
      />
    );
    expect(lastFrame()).toContain('Thinking...');
    expect(lastFrame()).not.toContain('[Thinking: Secret thought]');
    expect(lastFrame()).toContain('Answer');
  });

  it('uses default hiddenThinkingLabel', () => {
    const { lastFrame } = renderWithTheme(
      <AssistantMessage
        content="Answer"
        thinkingBlocks={['Hidden']}
        hideThinkingBlock={true}
      />
    );
    expect(lastFrame()).toContain('Thinking...'); // default label
    expect(lastFrame()).not.toContain('Hidden');
  });

  it('handles empty thinkingBlocks array', () => {
    const { lastFrame } = renderWithTheme(
      <AssistantMessage content="Answer" thinkingBlocks={[]} />
    );
    expect(lastFrame()).not.toContain('Thinking');
    expect(lastFrame()).toContain('Answer');
  });

  it('handles undefined thinkingBlocks', () => {
    const { lastFrame } = renderWithTheme(<AssistantMessage content="Answer" />);
    expect(lastFrame()).not.toContain('Thinking');
    expect(lastFrame()).toContain('Answer');
  });

  it('renders content with special characters', () => {
    const special = '<>&"\'';
    const { lastFrame } = renderWithTheme(<AssistantMessage content={special} />);
    expect(lastFrame()).toContain(special);
  });

  it('renders tool calls when present (collapsed by default)', () => {
    const toolCall = {
      id: 'tool-1',
      name: 'read_file',
      arguments: { path: '/test.txt' },
      status: 'done' as const,
      result: 'file content',
    };
    const { lastFrame } = renderWithTheme(
      <AssistantMessage content="Here is the file:" toolCalls={[toolCall]} />
    );
    // Should show tool name and status
    expect(lastFrame()).toContain('read_file');
    expect(lastFrame()).toContain('done');
    // Collapsed: arguments should NOT appear
    expect(lastFrame()).not.toContain('/test.txt');
    // Should show result when collapsed? ToolExecution collapsed does not show result? In collapsed view, result may be hidden. Let's check ToolExecution: collapsed shows status but not result. So no result.
    expect(lastFrame()).not.toContain('file content');
  });

  it('expands tool call when in expandedTools set', () => {
    const toolCall = {
      id: 'tool-expand',
      name: 'expand_me',
      arguments: { arg: 'value' },
      status: 'done' as const,
      result: 'output data',
    };
    const expandedTools = new Set<string>(['tool-expand']);
    const { lastFrame } = renderWithTheme(
      <AssistantMessage
        content="Expanded tool:"
        toolCalls={[toolCall]}
        expandedTools={expandedTools}
        onToolToggle={() => {}}
      />
    );
    // Expanded should show arguments and result
    expect(lastFrame()).toContain('"arg": "value"'); // arguments JSON
    expect(lastFrame()).toContain('output data');
    expect(lastFrame()).toContain('Output:');
  });
});
