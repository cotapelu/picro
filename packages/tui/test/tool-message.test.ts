import { describe, it, expect } from 'vitest';
import { ToolMessage } from '../src/components/tool-message.js';

describe('ToolMessage', () => {
  it('should render tool name header', () => {
    const msg = new ToolMessage({ toolName: 'read_file' });
    const lines = msg.draw({ width: 40, height: 10 });
    const output = lines.join('\n');
    expect(output).toContain('read_file');
  });

  it('should render output', () => {
    const msg = new ToolMessage({ toolName: 'test', output: 'Hello World' });
    const lines = msg.draw({ width: 40, height: 10 });
    expect(lines.join('\n')).toContain('Hello World');
  });

  it('should show error styling when error flag set', () => {
    const msg = new ToolMessage({ toolName: 'fail', output: 'Error msg', error: true });
    const lines = msg.draw({ width: 40, height: 10 });
    expect(lines.join('\n')).toContain('\x1b[31m'); // red color
  });
});
