/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { HelpModal } from './HelpModal';
import { ThemeProvider } from '../hooks/useTheme.js';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

describe('HelpModal', () => {
  it('renders slash commands list', () => {
    const { lastFrame } = renderWithTheme(<HelpModal onClose={() => {}} />);
    expect(lastFrame()).toContain('Slash Commands');
    // Check some common commands
    expect(lastFrame()).toContain('/quit');
    expect(lastFrame()).toContain('/export');
    expect(lastFrame()).toContain('/import');
    expect(lastFrame()).toContain('/help');
  });

  it('shows close hint', () => {
    const { lastFrame } = renderWithTheme(<HelpModal onClose={() => {}} />);
    expect(lastFrame()).toContain('Press Esc to close');
  });

  it('displays description for commands', () => {
    const { lastFrame } = renderWithTheme(<HelpModal onClose={() => {}} />);
    expect(lastFrame()).toContain('Quit the application');
    expect(lastFrame()).toContain('Export session to HTML');
  });
});
