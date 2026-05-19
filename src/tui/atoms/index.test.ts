// SPDX-License-Identifier: Apache-2.0
/**
 * Basic smoke test for atoms/index.ts re-exports
 */

import { describe, it, expect } from 'vitest';

// Import the index to ensure all exports are valid
import * as Atoms from './index';

describe('atoms/index.ts exports', () => {
  it('should export Text class', () => {
    expect(Atoms.Text).toBeDefined();
  });

  it('should export Box class', () => {
    expect(Atoms.Box).toBeDefined();
  });

  it('should export ProcessTerminal class', () => {
    expect(Atoms.ProcessTerminal).toBeDefined();
  });

  it('should export key functions like visibleWidth', () => {
    expect(typeof Atoms.visibleWidth).toBe('function');
  });

  it('should export themes', () => {
    expect(Atoms.darkTheme).toBeDefined();
    expect(Atoms.lightTheme).toBeDefined();
  });

  // Markdown and Footer moved to molecules, not exported from atoms/index anymore
  it('should not export Markdown from atoms (moved to molecules)', () => {
    expect(Atoms.Markdown).toBeUndefined();
  });

  it('should not export Footer from atoms (moved to molecules)', () => {
    expect(Atoms.Footer).toBeUndefined();
  });

  // Input component removed/renamed - skip
  it.skip('should export Input (deprecated)', () => {
    expect(Atoms.Input).toBeDefined();
  });
});