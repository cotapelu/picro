import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { HelpModal } from './HelpModal';

describe('HelpModal', () => {
  it('renders without crashing', () => {
    const onClose = vi.fn();
    const instance = render(<HelpModal onClose={onClose} />);
    expect(instance.stdin).toBeDefined();
  });

  it('displays slash commands', () => {
    const { lastFrame } = render(<HelpModal onClose={() => {}} />);
    // Check for some known commands
    expect(lastFrame()).toContain('/quit');
    expect(lastFrame()).toContain('/help');
    // Should show header
    expect(lastFrame()).toContain('Slash Commands');
  });
});
