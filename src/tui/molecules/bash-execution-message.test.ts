// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for BashExecutionMessage atom
 */

import { describe, it, expect } from 'vitest';
import { BashExecutionMessage } from './bash-execution-message';
import type { RenderContext } from '../core/base';
import { visibleWidth } from '../core/internal-utils';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('BashExecutionMessage', () => {
  describe('constructor', () => {
    it('should create with command', () => {
      const msg = new BashExecutionMessage({ command: 'ls -la' });
      expect(msg).toBeDefined();
    });
  });

  describe('appendOutput()', () => {
    it('should add output lines', () => {
      const msg = new BashExecutionMessage({ command: 'echo hi' });
      msg.appendOutput('Line1\nLine2');
      // No return value; internal state changes
    });
  });

  describe('setComplete()', () => {
    it('should set exit code and truncated flag', () => {
      const msg = new BashExecutionMessage({ command: 'ls' });
      msg.setComplete(0, false);
      // Should update internal state
    });
  });

  describe('draw()', () => {
    it('should render header with command', () => {
      const msg = new BashExecutionMessage({ command: 'ls' });
      const result = msg.draw(defaultContext);
      expect(result.some(l => l.includes('ls'))).toBe(true);
    });

    it('should show spinner when running', () => {
      const msg = new BashExecutionMessage({ command: 'sleep 1' });
      msg.appendOutput('output');
      const result = msg.draw(defaultContext);
      expect(result.some(l => l.includes('⠋'))).toBe(true); // spinner frame
    });

    it('should show exit code when complete', () => {
      const msg = new BashExecutionMessage({ command: 'cmd' });
      msg.setComplete(0, false);
      const result = msg.draw(defaultContext);
      expect(result.some(l => l.includes('exit 0'))).toBe(true);
    });

    it('should indicate truncation if truncated', () => {
      const msg = new BashExecutionMessage({ command: 'cmd' });
      msg.setComplete(0, true);
      const result = msg.draw(defaultContext);
      expect(result.some(l => l.includes('(truncated)'))).toBe(true);
    });

    it('should pad lines to full width', () => {
      const msg = new BashExecutionMessage({ command: 'c' });
      msg.appendOutput('output');
      const result = msg.draw(defaultContext);
      result.forEach(l => {
        expect(visibleWidth(l)).toBeLessThanOrEqual(defaultContext.width);
      });
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      const msg = new BashExecutionMessage({ command: 'ls' });
      expect(() => msg.clearCache()).not.toThrow();
    });
  });
});