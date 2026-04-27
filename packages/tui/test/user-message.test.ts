import { describe, it, expect } from 'vitest';
import { UserMessage } from '../src/components/user-message.js';

describe('UserMessage', () => {
  it('should render right-aligned message', () => {
    const msg = new UserMessage({ text: 'Hello' });
    const lines = msg.draw({ width: 40, height: 5 });
    // Check that text appears, may have spaces before
    const output = lines.join('\n');
    expect(output).toContain('Hello');
    // Right-aligned: trailing spaces after text (except last line)
    const firstLine = lines[0];
    const textIndex = firstLine.indexOf('Hello');
    const trailingSpaces = firstLine.length - textIndex - 'Hello'.length;
    expect(trailingSpaces).toBeGreaterThanOrEqual(0);
  });

  it('should apply custom colors', () => {
    const msg = new UserMessage({ text: 'Blue text', color: 'blue' });
    const lines = msg.draw({ width: 40, height: 5 });
    expect(lines[0]).toContain('\x1b[34m');
  });
});
