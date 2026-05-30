/** @jsxImportSource react */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Footer } from './Footer';
import type { FooterDataProvider, FooterData } from './FooterDataProvider.js';
import { ThemeProvider } from '../../hooks/useTheme.js';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

function createMockProvider(initialData: FooterData = {}): FooterDataProvider {
  let data: FooterData = {
    cwdBasename: '',
    sessionName: '',
    model: 'No model',
    thinkingLevel: 'off',
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    cost: 0,
    autoCompactEnabled: false,
    extensionStatuses: [],
    ...initialData,
  };

  return {
    getData: () => data,
    onChange: vi.fn().mockReturnValue(() => {}),
  };
}

describe('Footer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default state showing model', () => {
    const provider = createMockProvider({ model: 'gpt-4' });
    const { lastFrame } = renderWithTheme(<Footer provider={provider} />);
    expect(lastFrame()).toContain('gpt-4');
  });

  it('displays cwd basename and session name', () => {
    const provider = createMockProvider({
      cwdBasename: 'project',
      sessionName: 'My Session',
      model: 'test-model',
    });
    const { lastFrame } = renderWithTheme(<Footer provider={provider} />);
    expect(lastFrame()).toContain('project');
    expect(lastFrame()).toContain('My Session');
  });

  it('shows auto compact indicator', () => {
    const provider = createMockProvider({
      cwdBasename: 'proj',
      autoCompactEnabled: true,
      model: 'm',
    });
    const { lastFrame } = renderWithTheme(<Footer provider={provider} />);
    expect(lastFrame()).toContain('(auto)');
  });

  it('displays thinking level abbreviation', () => {
    const provider = createMockProvider({
      model: 'm',
      thinkingLevel: 'medium',
    });
    const { lastFrame } = renderWithTheme(<Footer provider={provider} />);
    expect(lastFrame()).toContain('med');
  });

  it('formats tokens and cost', () => {
    const provider = createMockProvider({
      model: 'm',
      tokens: { input: 1500, output: 500, cacheRead: 100, cacheWrite: 200 },
      cost: 0.00123,
    });
    const { lastFrame } = renderWithTheme(<Footer provider={provider} />);
    expect(lastFrame()).toContain('1.5k'); // in:1.5k (formatted)
    expect(lastFrame()).toContain('500');
    expect(lastFrame()).toContain('0.0012');
  });

  it('shows cache stats with plus/minus', () => {
    const provider = createMockProvider({
      model: 'm',
      tokens: { input: 100, output: 50, cacheRead: 300, cacheWrite: 150 },
    });
    const { lastFrame } = renderWithTheme(<Footer provider={provider} />);
    // Expect "+150" and "-300" somewhere in frame
    expect(lastFrame()).toContain('+150');
    expect(lastFrame()).toContain('-300');
  });

  it('displays git info compactly', () => {
    const provider = createMockProvider({
      model: 'm',
      git: { branch: 'feature/abc', dirty: true, ahead: 2, behind: 0 },
    });
    const { lastFrame } = renderWithTheme(<Footer provider={provider} />);
    const frame = lastFrame();
    expect(frame).toContain('git:feature/abc');
    expect(frame).toContain('*');
    expect(frame).toContain('+2');
  });

  it('truncates long git branch names to 12 chars + ~', () => {
    const longBranch = 'this-is-a-very-long-branch-name';
    const provider = createMockProvider({
      model: 'm',
      git: { branch: longBranch, dirty: false, ahead: 0, behind: 0 },
    });
    const { lastFrame } = renderWithTheme(<Footer provider={provider} />);
    // Branch truncated: first 12 chars = 'this-is-a-ve', then '~'
    expect(lastFrame()).toContain('git:this-is-a-ve~');
  });

  it('shows performance metrics', () => {
    const provider = createMockProvider({
      model: 'm',
      performance: { avgCpuUserMS: 2.5, avgRSSMB: 125.7 },
    });
    const { lastFrame } = renderWithTheme(<Footer provider={provider} />);
    expect(lastFrame()).toContain('CPU:2.5ms');
    expect(lastFrame()).toContain('RSS:125.7MB');
  });

  it('shows extension statuses (status only)', () => {
    const provider = createMockProvider({
      model: 'm',
      extensionStatuses: [
        { name: 'ext1', status: 'active' },
        { name: 'ext2', status: 'error' },
      ],
    });
    const { lastFrame } = renderWithTheme(<Footer provider={provider} />);
    // Shows 'active, error' (status values)
    expect(lastFrame()).toContain('active');
    expect(lastFrame()).toContain('error');
  });

  it('hides token info when all zeros and no other right parts', () => {
    const provider = createMockProvider({
      model: 'm',
      tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      git: undefined,
      performance: undefined,
      hints: [],
    });
    const { lastFrame } = renderWithTheme(<Footer provider={provider} />);
    const frame = lastFrame();
    expect(frame).not.toContain('in:');
    expect(frame).not.toContain('out:');
  });

  it('formats million token count', () => {
    const provider = createMockProvider({
      model: 'm',
      tokens: { input: 2500000, output: 0, cacheRead: 0, cacheWrite: 0 },
    });
    const { lastFrame } = renderWithTheme(<Footer provider={provider} />);
    // 2.5M
    expect(lastFrame()).toContain('2.5M');
  });

  it('shows thinking level empty for "off"', () => {
    const provider = createMockProvider({
      model: 'm',
      thinkingLevel: 'off',
    });
    const { lastFrame } = renderWithTheme(<Footer provider={provider} />);
    const frame = lastFrame();
    // Should not show empty parens
    expect(frame).not.toContain('()');
  });
});
