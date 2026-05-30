/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { HotkeysModal } from './HotkeysModal';
import { ThemeProvider } from '../hooks/useTheme.js';

describe('HotkeysModal', () => {
  it('renders without crashing', () => {
    const { stdin } = render(
      <ThemeProvider initialMode="dark">
        <HotkeysModal onClose={() => {}} />
      </ThemeProvider>
    );
    expect(stdin).toBeDefined();
  });
});
