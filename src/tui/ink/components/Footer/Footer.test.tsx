/** @jsxImportSource react */
/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Footer } from './Footer';
import type { FooterDataProvider } from './FooterDataProvider';
import { ThemeProvider } from '../../hooks/useTheme.js';

function createMockFooterProvider(overrides: any = {}) {
  return {
    getData: () => ({
      cwdBasename: 'project',
      sessionName: 'Test Session',
      model: 'gpt-4',
      thinkingLevel: 'medium',
      tokens: { input: 100, output: 50, cacheRead: 0, cacheWrite: 0 },
      cost: 0.01,
      autoCompactEnabled: false,
      extensionStatuses: [],
      ...overrides,
    }),
    onChange: (callback: any) => {
      callback({
        cwdBasename: 'project',
        sessionName: 'Test Session',
        model: 'gpt-4',
        thinkingLevel: 'medium',
        tokens: { input: 100, output: 50, cacheRead: 0, cacheWrite: 0 },
        cost: 0.01,
        autoCompactEnabled: false,
        extensionStatuses: [],
        ...overrides,
      });
      return () => {};
    },
  } as any;
}

describe('Footer', () => {
  it('renders model and token info', () => {
    const provider = createMockFooterProvider();
    const { lastFrame } = render(
      <ThemeProvider initialMode="dark">
        <Footer provider={provider} />
      </ThemeProvider>
    );
    expect(lastFrame()).toContain('gpt-4');
    expect(lastFrame()).toContain('in:100');
    expect(lastFrame()).toContain('out:50');
    expect(lastFrame()).toContain('$0.0100');
  });

  it('displays session name and cwd', () => {
    const provider = createMockFooterProvider({ sessionName: 'MySess', cwdBasename: 'myproject' });
    const { lastFrame } = render(
      <ThemeProvider initialMode="dark">
        <Footer provider={provider} />
      </ThemeProvider>
    );
    expect(lastFrame()).toContain('MySess');
    expect(lastFrame()).toContain('myproject');
  });

  it('shows auto-compact indicator when enabled', () => {
    const provider = createMockFooterProvider({ autoCompactEnabled: true });
    const { lastFrame } = render(
      <ThemeProvider initialMode="dark">
        <Footer provider={provider} />
      </ThemeProvider>
    );
    expect(lastFrame()).toContain('(auto)');
  });

  it('shows git info when available', () => {
    const provider = createMockFooterProvider({
      git: { branch: 'main', dirty: true, ahead: 2, behind: 0 },
    });
    const { lastFrame } = render(
      <ThemeProvider initialMode="dark">
        <Footer provider={provider} />
      </ThemeProvider>
    );
    expect(lastFrame()).toContain('git:main*+2');
  });

  it('shows extension statuses', () => {
    const provider = createMockFooterProvider({
      extensionStatuses: [{ name: 'ext1', status: 'active' }, { name: 'ext2' }],
    });
    const { lastFrame } = render(
      <ThemeProvider initialMode="dark">
        <Footer provider={provider} />
      </ThemeProvider>
    );
    expect(lastFrame()).toContain('active, ext2');
  });
});
