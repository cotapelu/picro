import { describe, it, expect } from 'vitest';
import { CustomMessage } from '../src/components/custom-message.js';

describe('CustomMessage', () => {
  it('should render header with customType as label', () => {
    const msg = new CustomMessage({
      customType: 'extension',
      content: 'Hello from extension',
    });
    const lines = msg.draw({ width: 80, height: 10 });
    expect(lines.join('\n')).toContain('[extension]');
  });

  it('should render content using Markdown', () => {
    const msg = new CustomMessage({
      customType: 'info',
      content: '**Bold text** and *italic*',
    });
    const lines = msg.draw({ width: 80, height: 10 });
    // Bold should include ANSI bold codes
    expect(lines.join('\n')).toContain('Bold text');
    expect(lines.join('\n')).toContain('italic');
  });

  it('should support custom label', () => {
    const msg = new CustomMessage({
      customType: 'note',
      label: 'My Note',
      content: 'Content',
    });
    const lines = msg.draw({ width: 80, height: 10 });
    expect(lines.join('\n')).toContain('My Note');
  });

  it('should apply custom text color', () => {
    const msg = new CustomMessage({
      customType: 'test',
      color: 'red',
      content: 'Red text',
    });
    const lines = msg.draw({ width: 80, height: 10 });
    expect(lines.join('\n')).toContain('\x1b[31m'); // red fg
  });

  it('should handle content as array with multiple text parts', () => {
    const msg = new CustomMessage({
      customType: 'rich',
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'world' },
      ],
    });
    const lines = msg.draw({ width: 80, height: 10 });
    expect(lines.join('\n')).toContain('Hello');
    expect(lines.join('\n')).toContain('world');
  });

  it('should display empty message for empty content', () => {
    const msg = new CustomMessage({
      customType: 'empty',
      content: '',
    });
    const lines = msg.draw({ width: 80, height: 10 });
    expect(lines.join('\n')).toContain('(empty)');
  });

  it('should apply padding', () => {
    const msg = new CustomMessage({
      customType: 'pad',
      content: 'Text',
      padding: 3,
    });
    const lines = msg.draw({ width: 80, height: 10 });
    // The first line should start with 3 spaces
    expect(lines[0].startsWith('   ')).toBe(true);
  });

  it('should clear cache without error', () => {
    const msg = new CustomMessage({
      customType: 'test',
      content: 'Test',
    });
    expect(() => msg.clearCache()).not.toThrow();
  });

  it('should set content via setContent', () => {
    const msg = new CustomMessage({
      customType: 'initial',
      content: 'First',
    });
    msg.setContent('Second');
    const lines = msg.draw({ width: 80, height: 10 });
    expect(lines.join('\n')).toContain('Second');
    expect(lines.join('\n')).not.toContain('First');
  });
});
