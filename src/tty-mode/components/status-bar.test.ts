import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatusBar } from './status-bar.js';

describe('StatusBar', () => {
  let statusBar: StatusBar;
  let writeSpy: any;

  beforeEach(() => {
    statusBar = new StatusBar();
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => {});
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('should print with model only', () => {
    statusBar.print('openai/gpt-4');
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('📦 openai/gpt-4'));
  });

  it('should print with context usage', () => {
    statusBar.print(undefined, { tokens: 1234, contextWindow: 4096, percent: 30 });
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('1234/4096'));
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('[███'));
  });

  it('should print with message', () => {
    statusBar.print(undefined, undefined, 'Connected');
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('Connected'));
  });

  it('should clear line', () => {
    statusBar.clear();
    expect(writeSpy).toHaveBeenCalledWith('\r\x1b[2K');
  });
});
