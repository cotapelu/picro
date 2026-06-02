/** @jsxImportSource react */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Header } from './Header';
import { ThemeProvider } from '../../hooks/useTheme.js';
import type { HeaderProps } from './Header';

function renderHeader(overrides?: Partial<HeaderProps>) {
  const props: HeaderProps = {
    title: 'picro',
    status: 'Ready',
    thinkingLevel: 'medium',
    model: 'gpt-4',
    theme: 'dark',
    showArmin: false,
    ...overrides,
  };
  return render(
    <ThemeProvider initialMode="dark">
      <Header {...props} />
    </ThemeProvider>
  );
}

describe('Header (extra)', () => {
  it('renders title picro', () => {
    const { lastFrame } = renderHeader();
    expect(lastFrame()).toContain('picro');
  });

  it('displays resource counts when provided', () => {
    const { lastFrame } = renderHeader({
      resourceCounts: { extensions: 2, skills: 3, prompts: 5, themes: 1 },
    });
    const frame = lastFrame() || '';
    expect(frame).toContain('E:2');
    expect(frame).toContain('S:3');
    expect(frame).toContain('P:5');
    expect(frame).toContain('T:1');
  });
});
