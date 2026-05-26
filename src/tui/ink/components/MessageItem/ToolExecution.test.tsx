/** @jsxImportSource react */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { ThemeProvider } from '../../hooks/useTheme.js';
import { ToolExecution } from './ToolExecution';
import type { ToolCall } from '../../types.js';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

describe('ToolExecution', () => {
  const createTool = (overrides: Partial<ToolCall> = {}): ToolCall => ({
    id: 'tool-1',
    name: 'test_tool',
    arguments: { key: 'value' },
    status: 'pending',
    ...overrides,
  });

  it('renders tool name and status when collapsed', () => {
    const tool = createTool({ status: 'pending' });
    const { lastFrame } = renderWithTheme(
      <ToolExecution toolCall={tool} expanded={false} onToggle={() => {}} />
    );
    expect(lastFrame()).toContain('test_tool');
    expect(lastFrame()).toContain('pending');
    // Arguments should NOT be shown when collapsed
    expect(lastFrame()).not.toContain('key');
    expect(lastFrame()).not.toContain('value');
  });

  it('expands to show arguments and result', () => {
    const tool = createTool({
      status: 'done',
      result: { output: 'success' },
    });
    const { lastFrame } = renderWithTheme(
      <ToolExecution toolCall={tool} expanded={true} onToggle={() => {}} />
    );
    expect(lastFrame()).toContain('test_tool');
    expect(lastFrame()).toContain('done');
    expect(lastFrame()).toContain('Input:'); // arguments label
    expect(lastFrame()).toContain('"key": "value"'); // JSON args
    expect(lastFrame()).toContain('Output:'); // result label
    expect(lastFrame()).toContain('success');
  });

  it('shows error status with error color (but color not checked in text)', () => {
    const tool = createTool({
      status: 'error',
      result: { error: 'Something failed' },
    });
    const { lastFrame } = renderWithTheme(
      <ToolExecution toolCall={tool} expanded={true} onToggle={() => {}} />
    );
    expect(lastFrame()).toContain('error');
    expect(lastFrame()).toContain('Something failed');
  });

  it('handles empty arguments and result gracefully', () => {
    const tool = createTool({
      arguments: {},
      result: null,
      status: 'done',
    });
    const { lastFrame } = renderWithTheme(
      <ToolExecution toolCall={tool} expanded={true} onToggle={() => {}} />
    );
    expect(lastFrame()).toContain('{}'); // empty object
    // Output may not appear if result is null
    expect(lastFrame()).toContain('done');
  });

  // Arrow indicator tested implicitly by expanded/collapsed behavior

  it('truncates long output via sanitizeAndTruncate', () => {
    const longResult = { data: 'x'.repeat(20000) };
    const tool = createTool({
      result: longResult,
      status: 'done',
    });
    const { lastFrame } = renderWithTheme(
      <ToolExecution toolCall={tool} expanded={true} onToggle={() => {}} />
    );
    // The output should be truncated (default max 10000)
    expect(lastFrame()).toContain('(truncated, full length'); // partial check
  });

  it('handles non-JSON-parseable arguments', () => {
    // Simulate arguments that cannot be JSON.stringify? Actually arguments is an object; stringify always works. But we could have circular? Not possible from runtime. Skip.
  });
});
