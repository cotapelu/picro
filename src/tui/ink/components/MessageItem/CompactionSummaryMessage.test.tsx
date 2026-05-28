/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ThemeProvider } from '../../hooks/useTheme.js';
import { CompactionSummaryMessage } from './CompactionSummaryMessage';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

describe('CompactionSummaryMessage', () => {
  it('renders compaction summary content', () => {
    const { lastFrame } = renderWithTheme(
      <CompactionSummaryMessage content="Compacted 100 messages" />
    );
    expect(lastFrame()).toContain('[compaction]');
    expect(lastFrame()).toContain('Compacted 100 messages');
  });

  it('displays token count when provided', () => {
    const { lastFrame } = renderWithTheme(
      <CompactionSummaryMessage content="Summary" tokensBefore={12345} />
    );
    expect(lastFrame()).toContain('Compacted from 12,345 tokens');
  });

  it('does not display token count when undefined', () => {
    const { lastFrame } = renderWithTheme(
      <CompactionSummaryMessage content="No token info" />
    );
    expect(lastFrame()).not.toContain('tokens');
    expect(lastFrame()).toContain('No token info');
  });

  it('handles zero tokens', () => {
    const { lastFrame } = renderWithTheme(
      <CompactionSummaryMessage content="Zero" tokensBefore={0} />
    );
    expect(lastFrame()).toContain('Compacted from 0 tokens');
  });
});
