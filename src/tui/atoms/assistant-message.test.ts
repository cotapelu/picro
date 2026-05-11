// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for AssistantMessage atom component
 */

import { describe, it, expect } from 'vitest';
import { AssistantMessage } from './assistant-message';
import type { RenderContext } from './base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('AssistantMessage', () => {
  it('should render markdown content', () => {
    const msg = new AssistantMessage({ content: '**Bold** text' });
    const result = msg.draw(defaultContext);
    expect(result.length).toBeGreaterThan(0);
    // Markdown should produce bold styling
    expect(result.some(l => l.includes('\x1b[1m'))).toBe(true);
  });

  it('should return empty array for empty content', () => {
    const msg = new AssistantMessage({ content: '' });
    const result = msg.draw(defaultContext);
    expect(result).toHaveLength(0);
  });

  it('should show loading indicator when isLoading', () => {
    const msg = new AssistantMessage({ isLoading: true });
    const result = msg.draw(defaultContext);
    expect(result[0]).toContain('Thinking...');
  });

  it('should apply padding', () => {
    const msg = new AssistantMessage({ content: 'Hello', padding: 5 });
    const result = msg.draw(defaultContext);
    // First line should start with spaces
    expect(result[0].startsWith('     ')).toBe(true);
  });

  it('should apply text color', () => {
    const msg = new AssistantMessage({ content: 'Hello', color: 'red' });
    const result = msg.draw(defaultContext);
    expect(result[0]).toContain('\x1b[31m');
  });

  it('should update content via setContent', () => {
    const msg = new AssistantMessage({ content: 'A' });
    msg.setContent('B');
    const result = msg.draw(defaultContext);
    expect(result.some(l => l.includes('B'))).toBe(true);
  });

  it('should update loading via setLoading', () => {
    const msg = new AssistantMessage({ isLoading: false });
    msg.setLoading(true);
    const result = msg.draw(defaultContext);
    expect(result[0]).toContain('Thinking...');
  });

  it('should handle narrow width', () => {
    const msg = new AssistantMessage({ content: 'Hello world' });
    const result = msg.draw({ ...defaultContext, width: 5 });
    expect(result).toBeDefined();
  });

  it('should handle unicode in content', () => {
    const msg = new AssistantMessage({ content: '😀😁😂' });
    const result = msg.draw(defaultContext);
    expect(result.some(l => l.includes('😀'))).toBe(true);
  });

  it('clearCache should no-op', () => {
    const msg = new AssistantMessage({});
    msg.clearCache();
  });
});