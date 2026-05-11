// SPDX-License-Identifier: Apache-2.0
/**
 * Smoke test for tui/index.ts main entry
 */

import { describe, it, expect } from 'vitest';

import { TerminalUI, ProcessTerminal, InteractiveMode } from './index';

describe('tui/index.ts', () => {
  it('should export TerminalUI', () => {
    expect(TerminalUI).toBeDefined();
  });

  it('should export ProcessTerminal', () => {
    expect(ProcessTerminal).toBeDefined();
  });

  it('should export InteractiveMode', () => {
    expect(InteractiveMode).toBeDefined();
  });
});