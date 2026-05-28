/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ThemeProvider } from '../../hooks/useTheme.js';
import { BranchSummaryMessage } from './BranchSummaryMessage';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

describe('BranchSummaryMessage', () => {
  it('renders branch summary content', () => {
    const { lastFrame } = renderWithTheme(
      <BranchSummaryMessage content="Branch created from main" />
    );
    expect(lastFrame()).toContain('Branch created from main');
  });

  // The component only shows content; branch identifier is not displayed by this component alone
  it('renders without crashing on short content', () => {
    const { lastFrame } = renderWithTheme(
      <BranchSummaryMessage content="Short" />
    );
    expect(lastFrame()).toContain('Short');
  });

  it('handles empty content gracefully', () => {
    const { lastFrame } = renderWithTheme(
      <BranchSummaryMessage content="" />
    );
    // Should render just the [branch] label maybe
    expect(lastFrame()).toContain('[branch]');
  });
});
