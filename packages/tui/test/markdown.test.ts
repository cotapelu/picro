import { describe, it, expect } from 'vitest';
import { Markdown } from '../src/components/markdown.js';

describe('Markdown', () => {
  it('should render simple markdown text', () => {
    const md = new Markdown('Hello **world**');
    const lines = md.draw({ width: 40, height: 10 });
    expect(lines.length).toBeGreaterThan(0);
    const output = lines.join('\n');
    expect(output).toContain('Hello');
    // Bold might be applied with ANSI
    expect(output).toContain('world');
  });

  it('should handle headers', () => {
    const md = new Markdown('# Header\n\nParagraph');
    const lines = md.draw({ width: 30, height: 10 });
    expect(lines.join('\n')).toContain('Header');
    expect(lines.join('\n')).toContain('Paragraph');
  });

  it('should handle code blocks', () => {
    const md = new Markdown('```\ncode\n```');
    const lines = md.draw({ width: 20, height: 5 });
    expect(lines.join('\n')).toContain('code');
  });

  it('should handle lists', () => {
    const md = new Markdown('- item1\n- item2');
    const lines = md.draw({ width: 20, height: 10 });
    expect(lines.join('\n')).toContain('item1');
    expect(lines.join('\n')).toContain('item2');
  });

  it('should clear cache when clearCache is called', () => {
    const md = new Markdown('Test');
    expect(() => md.clearCache()).not.toThrow();
  });
});
