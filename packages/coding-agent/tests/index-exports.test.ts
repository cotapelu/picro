import { ConfigManager, createMemoryStoreAdapter } from '../src/index.js';

describe('index.ts exports', () => {
  it('should export ConfigManager class', () => {
    expect(ConfigManager).toBeDefined();
  });

  it('should export createMemoryStoreAdapter function', () => {
    expect(createMemoryStoreAdapter).toBeDefined();
    expect(typeof createMemoryStoreAdapter).toBe('function');
  });
});
