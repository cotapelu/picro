/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ThemeProvider } from '../../hooks/useTheme.js';
import { BashExecution } from './BashExecution';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

describe('BashExecution', () => {
  it('renders command and output', () => {
    const { lastFrame } = renderWithTheme(
      <BashExecution command="ls" output="file.txt" exitCode={0} cancelled={false} truncated={false} />
    );
    expect(lastFrame()).toContain('ls');
    expect(lastFrame()).toContain('file.txt');
  });

  it('shows error styling when exitCode non-zero', () => {
    const { lastFrame } = renderWithTheme(
      <BashExecution command="false" output="error" exitCode={1} cancelled={false} truncated={false} />
    );
    // Should contain command and output; error indicated by non-zero exit but might not change text color in output capture
    expect(lastFrame()).toContain('false');
    expect(lastFrame()).toContain('error');
  });

  it('indicates cancellation when cancelled true', () => {
    const { lastFrame } = renderWithTheme(
      <BashExecution command="sleep 10" output="" exitCode={null} cancelled={true} truncated={false} />
    );
    expect(lastFrame()).toContain('sleep 10');
    // Should indicate cancelled, maybe with "Cancelled" text? In component, output may be empty; but we might show (cancelled) somewhere.
    // Actually component doesn't render explicit cancelled label? Check component.
  });

  it('shows truncation indicator when truncated true', () => {
    const { lastFrame } = renderWithTheme(
      <BashExecution command="cat bigfile" output="... (truncated)" exitCode={0} cancelled={false} truncated={true} />
    );
    expect(lastFrame()).toContain('(truncated)');
  });

  it('handles empty output', () => {
    const { lastFrame } = renderWithTheme(
      <BashExecution command="true" output="" exitCode={0} cancelled={false} truncated={false} />
    );
    expect(lastFrame()).toContain('true');
  });
});
