// SPDX-License-Identifier: Apache-2.0
/**
 * Basic smoke test for molecules/index.ts re-exports
 */

import { describe, it, expect } from 'vitest';
import * as Molecules from './index';

describe('molecules/index.ts exports', () => {
  it('should export Input', () => {
    expect(Molecules.Input).toBeDefined();
  });

  it('should export SelectList', () => {
    expect(Molecules.SelectList).toBeDefined();
  });

  it('should export Form', () => {
    expect(Molecules.Form).toBeDefined();
  });

  it('should export Loader', () => {
    expect(Molecules.Loader).toBeDefined();
  });

  it('should export TreeView', () => {
    expect(Molecules.TreeView).toBeDefined();
  });

  it('should export SessionSelector', () => {
    expect(Molecules.SessionSelector).toBeDefined();
  });

  it('should export ModelSelector', () => {
    expect(Molecules.ModelSelector).toBeDefined();
  });
});