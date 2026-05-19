// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for color-fallback atom
 */

import { describe, it, expect } from 'vitest';
import { adaptThemeToTerminal } from './color-fallback';

describe('color-fallback', () => {
  it('should map theme colors to terminal capabilities', () => {
    const theme = { primary: '\x1b[38;5;111m', background: '\x1b[48;5;235m' };
    const result = adaptThemeToTerminal(theme);
    expect(result).toBeDefined();
    expect(typeof result.primary).toBe('string');
  });
});