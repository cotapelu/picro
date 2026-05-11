// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for ToolExecutionMessage atom
 */

import { describe, it, expect } from 'vitest';
import { ToolExecutionMessage, type ToolCallInfo } from './tool-execution';
import type { RenderContext } from './base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('ToolExecutionMessage', () => {
  describe('constructor', () => {
    it('should create with empty tools by default', () => {
      const msg = new ToolExecutionMessage();
      expect(msg['tools']).toEqual([]);
    });

    it('should accept initial tools', () => {
      const tools: ToolCallInfo[] = [{ name: 'ls', status: 'success' }];
      const msg = new ToolExecutionMessage({ tools });
      expect(msg['tools']).toHaveLength(1);
    });
  });

  describe('addToolCall()', () => {
    it('should add a tool to the list', () => {
      const msg = new ToolExecutionMessage();
      msg.addToolCall({ name: 'bash', status: 'running' });
      expect(msg['tools']).toHaveLength(1);
    });
  });

  describe('draw()', () => {
    it('should render bordered box with title', () => {
      const msg = new ToolExecutionMessage();
      const result = msg.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result.some(l => l.includes('Tool Execution'))).toBe(true);
    });

    it('should display tool with appropriate icon', () => {
      const tools: ToolCallInfo[] = [
        { name: 'bash', status: 'running' },
        { name: 'grep', status: 'success' },
        { name: 'cat', status: 'error' },
      ];
      const msg = new ToolExecutionMessage({ tools });
      const result = msg.draw(defaultContext);
      expect(result.some(l => l.includes('⏳'))).toBe(true);
      expect(result.some(l => l.includes('✓'))).toBe(true);
      expect(result.some(l => l.includes('✗'))).toBe(true);
    });

    it('should truncate output lines', () => {
      const tools: ToolCallInfo[] = [{ name: 'cmd', status: 'success', output: 'A'.repeat(200) }];
      const msg = new ToolExecutionMessage({ tools });
      const result = msg.draw(defaultContext);
      // Each line should fit within width
      result.forEach(l => {
        const visible = l.replace(/\x1b\[[0-9;]*m/g, '').length;
        expect(visible).toBeLessThanOrEqual(defaultContext.width);
      });
    });

    it('should not show output if not provided', () => {
      const tools: ToolCallInfo[] = [{ name: 'cmd', status: 'success' }];
      const msg = new ToolExecutionMessage({ tools });
      const result = msg.draw(defaultContext);
      // Only tool line appears, no extra output line.
      expect(result.filter(l => l.includes('cmd')).length).toBe(1);
    });

    it('should pad to fill height', () => {
      const msg = new ToolExecutionMessage({ tools: [] });
      const result = msg.draw({ ...defaultContext, height: 10 });
      expect(result.length).toBe(10);
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      const msg = new ToolExecutionMessage();
      expect(() => msg.clearCache()).not.toThrow();
    });
  });
});