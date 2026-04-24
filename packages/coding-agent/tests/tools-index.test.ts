import { FileTools, CodeTools, CommandTools, SearchTools } from '../src/tools/index.js';

describe('Tools index', () => {
  it('should export FileTools class', () => {
    expect(FileTools).toBeDefined();
    expect(typeof FileTools).toBe('function');
  });

  it('should export CodeTools class', () => {
    expect(CodeTools).toBeDefined();
    expect(typeof CodeTools).toBe('function');
  });

  it('should export CommandTools class', () => {
    expect(CommandTools).toBeDefined();
    expect(typeof CommandTools).toBe('function');
  });

  it('should export SearchTools class', () => {
    expect(SearchTools).toBeDefined();
    expect(typeof SearchTools).toBe('function');
  });
});
