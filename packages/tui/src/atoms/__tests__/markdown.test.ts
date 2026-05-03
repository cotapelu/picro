import { describe, it, expect } from 'vitest';
import { Markdown } from '../markdown';
import type { RenderContext } from '../base';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Markdown Component', () => {
  describe('Headings', () => {
    it('should render h1', () => {
      const md = new Markdown('# Heading 1');
      const ctx = createContext(80, 24);
      const result = md.draw(ctx);

      expect(result[0]).toContain('Heading 1');
    });

    it('should render h2', () => {
      const md = new Markdown('## Heading 2');
      const ctx = createContext(80, 24);
      const result = md.draw(ctx);

      expect(result[0]).toContain('Heading 2');
    });
  });

  describe('Emphasis', () => {
    it('should render bold', () => {
      const md = new Markdown('**bold**');
      const ctx = createContext(80, 24);
      const result = md.draw(ctx);

      expect(result[0]).toContain('bold');
      expect(result[0]).toContain('\x1b[1m');
    });

    it('should render italic', () => {
      const md = new Markdown('*italic*');
      const ctx = createContext(80, 24);
      const result = md.draw(ctx);

      expect(result[0]).toContain('italic');
    });

    it('should render strikethrough', () => {
      const md = new Markdown('~~strikethrough~~');
      const ctx = createContext(80, 24);
      const result = md.draw(ctx);

      expect(result[0]).toContain('strikethrough');
      expect(result[0]).toContain('\x1b[9m');
    });
  });

  describe('Inline Code', () => {
    it('should render inline code', () => {
      const md = new Markdown('`code`');
      const ctx = createContext(80, 24);
      const result = md.draw(ctx);

      expect(result[0]).toContain('code');
    });
  });

  describe('Links', () => {
    it('should render links', () => {
      const md = new Markdown('[link](http://example.com)');
      const ctx = createContext(80, 24);
      const result = md.draw(ctx);

      expect(result[0]).toContain('link');
      expect(result[0]).toContain('\x1b[4m'); // underline
    });
  });

  describe('Lists', () => {
    it('should render unordered list', () => {
      const md = new Markdown('- item1\n- item2');
      const ctx = createContext(80, 24);
      const result = md.draw(ctx);

      expect(result.some(l => l.includes('item1'))).toBe(true);
      expect(result.some(l => l.includes('item2'))).toBe(true);
    });

    it('should render ordered list', () => {
      const md = new Markdown('1. first\n2. second');
      const ctx = createContext(80, 24);
      const result = md.draw(ctx);

      expect(result.some(l => l.includes('first'))).toBe(true);
      expect(result.some(l => l.includes('second'))).toBe(true);
    });
  });

  describe('Blockquotes', () => {
    it('should render blockquote', () => {
      const md = new Markdown('> quote');
      const ctx = createContext(80, 24);
      const result = md.draw(ctx);

      expect(result[0]).toContain('>');
      expect(result[0]).toContain('quote');
    });
  });

  describe('Code Blocks', () => {
    it('should render fenced code block', () => {
      const md = new Markdown('```\nsome code\n```');
      const ctx = createContext(80, 24);
      const result = md.draw(ctx);

      expect(result.some(l => l.includes('some code'))).toBe(true);
    });
  });

  describe('Paragraphs', () => {
    it('should handle blank line separation', () => {
      const md = new Markdown('para1\n\npara2');
      const ctx = createContext(80, 24);
      const result = md.draw(ctx);

      expect(result.some(l => l.includes('para1'))).toBe(true);
      expect(result.some(l => l.includes('para2'))).toBe(true);
    });

    it('should wrap long paragraphs', () => {
      const md = new Markdown('This is a very long paragraph that should wrap');
      const ctx = createContext(20, 24);
      const result = md.draw(ctx);

      expect(result.length).toBeGreaterThan(1);
    });
  });

  describe('Complex Content', () => {
    it('should render mixed markdown', () => {
      const md = new Markdown('# Title\n\n- item1\n- item2\n\n`code`');
      const ctx = createContext(80, 24);
      const result = md.draw(ctx);

      expect(result.some(l => l.includes('Title'))).toBe(true);
      expect(result.some(l => l.includes('item1'))).toBe(true);
      expect(result.some(l => l.includes('code'))).toBe(true);
    });

    it('should handle unicode', () => {
      const md = new Markdown('Привет мир');
      const ctx = createContext(80, 24);
      const result = md.draw(ctx);

      expect(result[0]).toContain('Привет');
    });

    it('should handle emoji', () => {
      const md = new Markdown('Hello 🌍!');
      const ctx = createContext(80, 24);
      const result = md.draw(ctx);

      expect(result[0]).toContain('🌍');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const md = new Markdown('');
      const ctx = createContext(80, 24);
      const result = md.draw(ctx);

      expect(result).toEqual(['']);
    });

    it('should handle very small width', () => {
      const md = new Markdown('A very long line');
      const ctx = createContext(10, 24);
      const result = md.draw(ctx);

      result.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(10);
      });
    });
  });
});
