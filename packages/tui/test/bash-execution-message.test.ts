import { describe, it, expect } from 'vitest';
import { BashExecutionMessage } from '../src/components/bash-execution-message.js';

describe('BashExecutionMessage', () => {
  it('should render command header', () => {
    const msg = new BashExecutionMessage({ command: 'ls -la' });
    const lines = msg.draw({ width: 80, height: 10 });
    const output = lines.join('\n');
    expect(output).toContain('$ ls -la');
  });

  it('should show running status in cyan when isRunning', () => {
    const msg = new BashExecutionMessage({ command: 'echo hi', isRunning: true });
    const lines = msg.draw({ width: 80, height: 10 });
    const output = lines.join('\n');
    expect(output).toContain('\x1b[36m');
  });

  it('should display output when provided', () => {
    const msg = new BashExecutionMessage({ command: 'echo test', output: 'test' });
    const lines = msg.draw({ width: 80, height: 10 });
    expect(lines.join('\n')).toContain('test');
  });

  it('should show success green when exitCode 0 and not running', () => {
    const msg = new BashExecutionMessage({ command: 'true', exitCode: 0, isRunning: false });
    const lines = msg.draw({ width: 80, height: 10 });
    expect(lines.join('\n')).toContain('\x1b[32m'); // green
  });

  it('should show error red when exitCode non-zero', () => {
    const msg = new BashExecutionMessage({ command: 'false', exitCode: 1, isRunning: false });
    const lines = msg.draw({ width: 80, height: 10 });
    expect(lines.join('\n')).toContain('\x1b[31m'); // red
  });

  it('should show cancelled yellow', () => {
    const msg = new BashExecutionMessage({ command: 'sleep', isCancelled: true, isRunning: false });
    const lines = msg.draw({ width: 80, height: 10 });
    expect(lines.join('\n')).toContain('\x1b[33m'); // yellow
  });

  it('should append output via appendOutput', () => {
    const msg = new BashExecutionMessage({ command: 'cat' });
    msg.appendOutput('line1\n');
    msg.appendOutput('line2');
    const lines = msg.draw({ width: 80, height: 10 });
    expect(lines.join('\n')).toContain('line1');
    expect(lines.join('\n')).toContain('line2');
  });

  it('should truncate output when not expanded', () => {
    const manyLines = Array.from({ length: 30 }, (_, i) => `Line ${i}`).join('\n');
    const msg = new BashExecutionMessage({ command: 'cat', output: manyLines, expanded: false });
    const lines = msg.draw({ width: 80, height: 10 });
    // By default previewLines=20, should not show all 30 lines
    expect(lines.join('\n')).not.toContain('Line 0');
    expect(lines.join('\n')).toContain('Line 29'); // last lines shown
  });

  it('should show full output when expanded', () => {
    const manyLines = Array.from({ length: 5 }, (_, i) => `Line ${i}`).join('\n');
    const msg = new BashExecutionMessage({ command: 'cat', output: manyLines, expanded: true });
    const lines = msg.draw({ width: 80, height: 10 });
    expect(lines.join('\n')).toContain('Line 0');
    expect(lines.join('\n')).toContain('Line 4');
  });

  it('should clear cache on clearCache', () => {
    const msg = new BashExecutionMessage({ command: 'test' });
    expect(() => msg.clearCache()).not.toThrow();
  });
});
