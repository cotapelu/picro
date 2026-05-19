// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for ToolMessage atom component
 */

import { describe, it, expect } from 'vitest';
import { ToolMessage } from './tool-message';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('ToolMessage', () => {
  it('should render tool name header', () => {
    const msg = new ToolMessage({ toolName: 'bash' });
    const result = msg.draw(defaultContext);
    expect(result[0]).toContain('[bash]');
  });

  it('should show duration if provided', () => {
    const msg = new ToolMessage({ toolName: 'ls', duration: 123 });
    expect(msg.draw(defaultContext)[0]).toContain('123ms');
  });

  it('should show output', () => {
    const msg = new ToolMessage({ toolName: 'echo', output: 'Hello' });
    const result = msg.draw(defaultContext);
    expect(result.some(l => l.includes('Hello'))).toBe(true);
  });

  it('should wrap output', () => {
    const long = 'A'.repeat(200);
    const msg = new ToolMessage({ toolName: 'test', output: long });
    const result = msg.draw(defaultContext);
    expect(result.length).toBeGreaterThan(2);
  });

  it('should show (no output) when output missing', () => {
    const msg = new ToolMessage({ toolName: 'x' });
    const result = msg.draw(defaultContext);
    expect(result.some(l => l.includes('(no output)'))).toBe(true);
  });

  it('should apply error styling', () => {
    const msg = new ToolMessage({ toolName: 'err', output: 'Oops', error: true });
    const result = msg.draw(defaultContext);
    // Header should be red, and output text should be red
    expect(result[0]).toContain('\x1b[31m');
    expect(result.some(l => l.includes('\x1b[31m') && l.includes('Oops'))).toBe(true);
  });

  it('should apply padding', () => {
    const msg = new ToolMessage({ toolName: 't', output: 'o', padding: 3 });
    const result = msg.draw(defaultContext);
    // Lines should start with spaces
    expect(result[0].startsWith('   ')).toBe(true);
  });

  it('setResult should update output and duration', () => {
    const msg = new ToolMessage({ toolName: 't' });
    msg.setResult('Done', 500);
    expect(msg.draw(defaultContext)[0]).toContain('500ms');
    expect(msg.draw(defaultContext).some(l => l.includes('Done'))).toBe(true);
  });

  it('setError should set error flag and output', () => {
    const msg = new ToolMessage({ toolName: 't' });
    msg.setError('Failed');
    const result = msg.draw(defaultContext);
    expect(result.some(l => l.includes('Failed'))).toBe(true);
  });

  it('should handle zero width?', () => {
    const ctx = { ...defaultContext, width: 0 };
    const msg = new ToolMessage({ toolName: 'x', output: 'y' });
    const result = msg.draw(ctx);
    expect(result).toBeDefined();
  });

  it('clearCache should no-op', () => {
    const msg = new ToolMessage({});
    msg.clearCache();
  });
});