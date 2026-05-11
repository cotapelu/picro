// SPDX-License-Identifier: Apache-2.0
/**
 * Basic smoke test for organisms/index.ts re-exports
 */

import { describe, it, expect } from 'vitest';
import * as Organisms from './index';

describe('organisms/index.ts exports', () => {
  it('should export CommandPalette', () => {
    expect(Organisms.CommandPalette).toBeDefined();
  });

  it('should export Modal', () => {
    expect(Organisms.Modal).toBeDefined();
  });

  it('should export ContextMenu', () => {
    expect(Organisms.ContextMenu).toBeDefined();
  });

  it('should export LoginDialog', () => {
    expect(Organisms.LoginDialog).toBeDefined();
  });

  it('should export FileBrowser', () => {
    expect(Organisms.FileBrowser).toBeDefined();
  });

  it('should export DebugPanel', () => {
    expect(Organisms.DebugPanel).toBeDefined();
  });

  it('should export Editor', () => {
    expect(Organisms.Editor).toBeDefined();
  });

  it('should export ThinkingSelector', () => {
    expect(Organisms.ThinkingSelector).toBeDefined();
  });
});