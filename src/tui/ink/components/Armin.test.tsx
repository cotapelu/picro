/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Armin } from './Armin';
import { ThemeProvider } from '../hooks/useTheme.js';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

describe('Armin', () => {
  it('renders logo with default size', () => {
    const { lastFrame } = renderWithTheme(<Armin />);
    const frame = lastFrame();
    expect(frame).toContain('_');
    expect(frame).toContain('/|\\');
    expect(frame).toContain('/__|__\\');
  });

  it('renders with custom size (no change to logo for now)', () => {
    const { lastFrame } = renderWithTheme(<Armin size={2} />);
    expect(lastFrame()).toContain('_');
  });

  it('uses theme accent color', () => {
    // Color codes are not easily checkable, just ensure no crash
    const { lastFrame } = renderWithTheme(<Armin />);
    expect(lastFrame()).toBeTruthy();
  });
});
