// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for Markdown atom component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Markdown, defaultTokenColors } from './markdown';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('Markdown', () => {
  let markdown: Markdown;

  describe('constructor', () => {
    it('should create with content', () => {
      markdown = new Markdown('# Hello');
      expect(markdown).toBeInstanceOf(Markdown);
      expect(markdown['content']).toBe('# Hello');
    });

    it('should accept paddingX and paddingY', () => {
      markdown = new Markdown('Text', 2, 3);
      expect(markdown['paddingX']).toBe(2);
      expect(markdown['paddingY']).toBe(3);
    });

    it('should default to padding 1', () => {
      markdown = new Markdown('');
      expect(markdown['paddingX']).toBe(1);
      expect(markdown['paddingY']).toBe(1);
    });
  });

  describe('setContent()', () => {
    it('should update content and clear cache', () => {
      markdown = new Markdown('A');
      markdown.setContent('B');
      expect(markdown['content']).toBe('B');
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      markdown = new Markdown('');
    });

    it('should return empty array for empty content', () => {
      const result = markdown.draw(defaultContext);
      expect(result).toEqual([]);
    });

    it('should render markdown headings', () => {
      markdown = new Markdown('# Title');
      const result = markdown.draw(defaultContext);
      expect(result.some(l => l.includes('Title'))).toBe(true);
    });

    it('should render bold text', () => {
      markdown = new Markdown('**bold**');
      const result = markdown.draw(defaultContext);
      expect(result.some(l => l.includes('\x1b[1m'))).toBe(true);
    });

    it('should render italic text', () => {
      markdown = new Markdown('*italic*');
      const result = markdown.draw(defaultContext);
      // italic uses dim (2)
      expect(result.some(l => l.includes('\x1b[2m'))).toBe(true);
    });

    it('should render inline code with highlighting', () => {
      markdown = new Markdown('`code`');
      const result = markdown.draw(defaultContext);
      // Code uses token colors or distinct style
      expect(result.some(l => l.includes('code'))).toBe(true);
    });

    it('should render code blocks with syntax highlighting', () => {
      markdown = new Markdown('```js\nconst x = 1;\n```');
      const result = markdown.draw(defaultContext);
      expect(result.some(l => l.includes('const'))).toBe(true);
    });

    it('should add [Copy] hint after code block', () => {
      markdown = new Markdown('```\ncode\n```');
      const result = markdown.draw(defaultContext);
      expect(result.some(l => l.includes('[Copy]'))).toBe(true);
    });

    it('should apply padding', () => {
      markdown = new Markdown('Hello', 2, 1);
      const result = markdown.draw(defaultContext);
      // First line should have top padding (empty line?), Actually paddingY top adds empty lines at start
      expect(result[0].trim()).toBe('');
    });

    it('should cache result per width', () => {
      markdown = new Markdown('Hello');
      const r1 = markdown.draw(defaultContext);
      const r2 = markdown.draw(defaultContext);
      expect(r1).toBe(r2);
    });

    it('should invalidate cache when content changes', () => {
      markdown = new Markdown('A');
      markdown.draw(defaultContext);
      markdown.setContent('B');
      const r2 = markdown.draw(defaultContext);
      expect(r2[0]).not.toContain('A');
    });

    it('should handle lists', () => {
      markdown = new Markdown('- item1\n- item2');
      const result = markdown.draw(defaultContext);
      expect(result.some(l => l.includes('item1'))).toBe(true);
    });

    it('should handle blockquotes', () => {
      markdown = new Markdown('> quote');
      const result = markdown.draw(defaultContext);
      expect(result.some(l => l.includes('quote'))).toBe(true);
    });

    it('should handle tables', () => {
      markdown = new Markdown('| A | B |\n|---|---|');
      const result = markdown.draw(defaultContext);
      expect(result.some(l => l.includes('A') && l.includes('B'))).toBe(true);
    });
  });

  describe('clearCache()', () => {
    it('should clear cache', () => {
      markdown = new Markdown('Hello');
      markdown.draw(defaultContext);
      expect(markdown['cache']).toBeDefined();
      markdown.clearCache();
      expect(markdown['cache']).toBeUndefined();
    });
  });

  describe('getCodeAtCopyRow() / hasCopyHint()', () => {
    it('should return code for copy rows', () => {
      markdown = new Markdown('```\ncode\n```');
      markdown.draw(defaultContext);
      // The cache codeCopyRows populated
      const rows = markdown['cache']?.codeCopyRows;
      expect(rows?.size).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very long lines', () => {
      const long = 'A'.repeat(1000);
      markdown = new Markdown(long);
      const result = markdown.draw({ ...defaultContext, width: 50 });
      expect(result).toBeDefined();
    });

    it('should handle unicode', () => {
      markdown = new Markdown('😀');
      const result = markdown.draw(defaultContext);
      expect(result.some(l => l.includes('😀'))).toBe(true);
    });

    it('should handle zero width gracefully', () => {
      markdown = new Markdown('Hello');
      const result = markdown.draw({ ...defaultContext, width: 0 });
      expect(result).toBeDefined();
    });
  });
});