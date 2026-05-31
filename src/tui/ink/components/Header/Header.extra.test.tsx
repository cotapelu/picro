/** @jsxImportSource react */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import Header from './Header';
import { ThemeProvider } from '../hooks/useTheme.js';
import { useRuntime } from '../hooks/useRuntime.js';

vi.mock('../hooks/useRuntime', () => ({
  useRuntime: vi.fn(() => ({ stats: { avgCpu: 0, avgMem: 0 } })),
}));

function renderHeader() {
  return render(
    <ThemeProvider>
      <Header />
    </ThemeProvider>
  );
}

describe('Header (extra)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRuntime as any).mockReturnValue({ stats: { avgCpu: 0, avgMem: 0 } });
  });

  it('renders title picro', () => {
    const { lastFrame } = renderHeader();
    expect(lastFrame()).toContain('picro');
  });

  it('displays stats when provided', () => {
    (useRuntime as any).mockReturnValue({
      stats: { avgCpu: 12.3, avgMem: 456 },
    });
    const { lastFrame } = renderHeader();
    const frame = lastFrame() || '';
    expect(frame).toContain('Avg CPU');
    expect(frame).toContain('12.3%');
    expect(frame).toContain('456 MB');
  });
});
