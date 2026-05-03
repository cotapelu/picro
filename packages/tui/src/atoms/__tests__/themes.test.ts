import { describe, it, expect } from 'vitest';
import { darkTheme, lightTheme } from '../themes.js';

describe('Themes', () => {
  it('should export dark theme', () => {
    expect(darkTheme).toBeDefined();
  });

  it('should export light theme', () => {
    expect(lightTheme).toBeDefined();
  });
});
