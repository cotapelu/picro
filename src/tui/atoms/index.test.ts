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

  it('should export Terminal interface', () => {
    expect(Atoms.Terminal).toBeDefined();
  });

  it('should export key functions like visibleWidth', () => {
    expect(typeof Atoms.visibleWidth).toBe('function');
  });

  it('should export themes', () => {
    expect(Atoms.darkTheme).toBeDefined();
    expect(Atoms.lightTheme).toBeDefined();
  });

  it('should export Markdown', () => {
    expect(Atoms.Markdown).toBeDefined();
  });

  it('should export Footer', () => {
    expect(Atoms.Footer).toBeDefined();
  });

  it('should export Input', () => {
    expect(Atoms.Input).toBeDefined();
  });
});