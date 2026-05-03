import { describe, it, expect } from 'vitest';
import { getTheme, setTheme } from '../theme.js';

describe('Theme', () => {
  it('should get current theme', () => {
    const theme = getTheme();
    expect(theme).toBeDefined();
  });

  it('should set theme by name', () => {
    setTheme('light');
    const theme = getTheme();
    // theme should have some properties
    expect(theme).toBeDefined();
  });
});
