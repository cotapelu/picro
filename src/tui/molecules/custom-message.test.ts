// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for CustomMessage atom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CustomMessage } from './custom-message';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('CustomMessage', () => {
  describe('constructor', () => {
    it('should create with required options', () => {
      const msg = new CustomMessage({ customType: 'info', content: 'Hello' });
      expect(msg).toBeDefined();
    });

    it('should accept optional label, color, padding', () => {
      const msg = new CustomMessage({
        customType: 'info',
        content: 'Hi',
        label: 'Custom',
        color: 'red',
        padding: 2,
      });
      expect(msg['opts'].label).toBe('Custom');
      expect(msg['opts'].padding).toBe(2);
    });
  });

  describe('setContent()', () => {
    it('should update content', () => {
      const msg = new CustomMessage({ customType: 'info', content: 'A' });
      msg.setContent('B');
      expect(msg['opts'].content).toBe('B');
    });
  });

  describe('setExpanded()', () => {
    it('should update expanded flag', () => {
      const msg = new CustomMessage({ customType: 'info', content: 'Hi' });
      msg.setExpanded(false);
      expect(msg['opts'].expanded).toBe(false);
    });
  });

  describe('draw()', () => {
    it('should render header with custom type label', () => {
      const msg = new CustomMessage({ customType: 'info', content: 'Hello' });
      const result = msg.draw(defaultContext);
      expect(result.some(l => l.includes('[info]'))).toBe(true);
    });

    it('should use custom label if provided', () => {
      const msg = new CustomMessage({ customType: 'info', content: 'Hi', label: 'Note' });
      const result = msg.draw(defaultContext);
      expect(result.some(l => l.includes('Note'))).toBe(true);
    });

    it('should apply color to label', () => {
      const msg = new CustomMessage({ customType: 'info', content: 'Hi', color: 'red' });
      const result = msg.draw(defaultContext);
      expect(result.some(l => l.includes('\x1b[31m'))).toBe(true);
    });

    it('should apply background color if provided', () => {
      const msg = new CustomMessage({ customType: 'info', content: 'Hi', bgColor: 'blue' });
      const result = msg.draw(defaultContext);
      // Should have bg color ansi somewhere
      expect(result.some(l => l.includes('\x1b[44m'))).toBe(true);
    });

    it('should render content via Markdown', () => {
      const msg = new CustomMessage({ customType: 'info', content: '**Bold**' });
      const result = msg.draw(defaultContext);
      expect(result.some(l => l.includes('\x1b[1m'))).toBe(true);
    });

    it('should handle array content with text type', () => {
      const msg = new CustomMessage({
        customType: 'info',
        content: [{ type: 'text', text: 'Hello' }, { type: 'text', text: 'World' }],
      });
      const result = msg.draw(defaultContext);
      expect(result.some(l => l.includes('Hello') && l.includes('World'))).toBe(true);
    });

    it('should filter non-text content blocks', () => {
      const msg = new CustomMessage({
        customType: 'info',
        content: [{ type: 'image', text: '' }, { type: 'text', text: 'Only text' }],
      });
      const result = msg.draw(defaultContext);
      expect(result.some(l => l.includes('Only text'))).toBe(true);
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      const msg = new CustomMessage({ customType: 'info', content: '' });
      expect(() => msg.clearCache()).not.toThrow();
    });
  });
});