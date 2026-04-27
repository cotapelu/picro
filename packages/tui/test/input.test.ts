import { describe, it, expect } from 'vitest';
import { Input } from '../src/components/input.js';

describe('Input', () => {
  it('should render empty input', () => {
    const input = new Input({ placeholder: 'Type...' });
    const lines = input.draw({ width: 20, height: 1 });
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('Type...');
  });

  it('should render with value', () => {
    const input = new Input({ value: 'hello' });
    input.handleKey?.({
      raw: '\r',
      name: 'Enter',
      modifiers: {}
    });
    const lines = input.draw({ width: 20, height: 1 });
    expect(lines[0]).toContain('hello');
  });
});
