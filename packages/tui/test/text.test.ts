import { describe, it, expect } from 'vitest';
import { Text } from '../src/components/text.js';

describe('Text', () => {
  it('should render simple text', () => {
    const text = new Text('Hello World');
    const lines = text.draw({ width: 80, height: 1 });
    expect(lines[0]).toBe('Hello World');
  });

  it('should wrap text when wrap enabled', () => {
    const text = new Text('This is a long text that should wrap', { wrap: true });
    const lines = text.draw({ width: 10, height: 5 });
    expect(lines.length).toBeGreaterThan(1);
  });

  it('should apply colors', () => {
    const text = new Text('Red text', { color: 'red' });
    const lines = text.draw({ width: 80, height: 1 });
    expect(lines[0]).toContain('\x1b[31m');
  });
});
