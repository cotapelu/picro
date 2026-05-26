import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { ThemeProvider } from '../hooks/useTheme.js';
import { CommandPalette } from './CommandPalette';

describe('CommandPalette', () => {
  const wrap = (ui: React.ReactElement) => render(
    <ThemeProvider initialMode="dark">{ui}</ThemeProvider>
  );

  it('renders without crashing', () => {
    const commands = [
      { id: 'test', label: '/test', description: 'Test command' },
      { id: 'ext', label: '/ext', description: 'Extension command' },
    ];
    const instance = wrap(
      <CommandPalette commands={commands} onSelect={() => {}} onClose={() => {}} />
    );
    expect(instance.stdin).toBeDefined();
  });

  it('displays commands and descriptions', () => {
    const commands = [
      { id: 'model', label: '/model', description: 'Change model' },
      { id: 'custom', label: '/custom', description: 'Custom command' },
    ];
    const { lastFrame } = wrap(
      <CommandPalette commands={commands} onSelect={() => {}} onClose={() => {}} />
    );
    expect(lastFrame()).toContain('/model');
    expect(lastFrame()).toContain('/custom');
    expect(lastFrame()).toContain('Change model');
  });

  it('filters commands based on initialFilter', () => {
    const commands = [
      { id: 'settings', label: '/settings', description: 'Open settings' },
      { id: 'session', label: '/session', description: 'Session info' },
      { id: 'model', label: '/model', description: 'Change model' },
    ];
    const { lastFrame } = wrap(
      <CommandPalette
        commands={commands}
        onSelect={() => {}}
        onClose={() => {}}
        initialFilter="set"
      />
    );
    // Should only show /settings
    expect(lastFrame()).toContain('/settings');
    expect(lastFrame()).not.toContain('/session');
    expect(lastFrame()).not.toContain('/model');
  });

  it('shows empty message when no commands match filter', () => {
    const commands = [
      { id: 'settings', label: '/settings', description: 'Open settings' },
    ];
    const { lastFrame } = wrap(
      <CommandPalette
        commands={commands}
        onSelect={() => {}}
        onClose={() => {}}
        initialFilter="xyz"
      />
    );
    expect(lastFrame()).toContain('No commands match');
  });
});
