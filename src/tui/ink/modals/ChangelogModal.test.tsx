/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ChangelogModal } from './ChangelogModal';
import { ThemeProvider } from '../hooks/useTheme.js';

describe('ChangelogModal', () => {
  it('renders without crashing', () => {
    const { stdin } = render(
      <ThemeProvider initialMode="dark">
        <ChangelogModal onClose={() => {}} />
      </ThemeProvider>
    );
    expect(stdin).toBeDefined();
  });
});
