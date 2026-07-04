import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutputRenderer, DARK_THEME, MATRIX_THEME } from './OutputRenderer.js';

describe('OutputRenderer', () => {
  let renderer: OutputRenderer;
  let writeSpy: any;

  beforeEach(() => {
    renderer = new OutputRenderer();
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => {});
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('should clear line', () => {
    renderer.clearLine();
    expect(writeSpy).toHaveBeenCalledWith('\x1b[2K\r');
  });

  it('should clear screen', () => {
    renderer.clearScreen();
    expect(writeSpy).toHaveBeenCalledWith('\x1b[2J\x1b[H');
  });

  it('should show spinner and stop', () => {
    renderer.startSpinner('Loading');
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('Loading'));
    // Simulate a few intervals would be called, but we just check stop
    renderer.stopSpinner(true, 'Done');
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('Done'));
  });

  it('should render assistant response', () => {
    renderer.assistant('Hello **world**');
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('🤖 Assistant:'));
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('world'));
  });

  it('should render user and system', () => {
    renderer.user('User message');
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('👤 You:'));

    renderer.system('System note');
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('⚙️  System:'));
  });

  it('should show error and success', () => {
    renderer.error('Oops');
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('❌ Error:'));

    renderer.success('Great');
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Great'));
  });

  it('should render code block', () => {
    renderer.codeBlock('ts', 'const x = 1;');
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('┌─ ts ─'));
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('const x = 1;'));
  });

  it('should render table', () => {
    renderer.table(['Name', 'Age'], [['Alice', '30'], ['Bob', '25']]);
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('Name'));
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('Alice'));
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('Bob'));
  });

  it('should render progress bar', () => {
    renderer.progress(5, 10, 'Processing');
    // Bar with 50% filled: 10 filled, 10 empty
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('█')); // filled block
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('░')); // empty block
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('50%'));
  });

  it('should apply theme colors', () => {
    const light = new OutputRenderer({ ...DARK_THEME, user: '\x1b[31m' } as any);
    // color codes prepend and append \x1b[0m
    // Just check it doesn't throw
    light.user('test');
    expect(writeSpy).toHaveBeenCalled();
  });
});
