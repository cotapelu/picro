import { describe, it, expect } from 'vitest';
import { simpleHash, sha256, cacheKey, hashMessages, requestFingerprint } from '../../src/utils/hash';

describe('simpleHash', () => {
  it('should return consistent hash for same input', () => {
    const hash1 = simpleHash('hello world');
    const hash2 = simpleHash('hello world');
    expect(hash1).toBe(hash2);
  });

  it('should return different hash for different input', () => {
    const hash1 = simpleHash('hello');
    const hash2 = simpleHash('world');
    expect(hash1).not.toBe(hash2);
  });

  it('should return 8-character hex string', () => {
    const hash = simpleHash('test');
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('should handle empty string', () => {
    const hash = simpleHash('');
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('sha256', () => {
  it('should return consistent hash for same input', async () => {
    const hash1 = await sha256('hello world');
    const hash2 = await sha256('hello world');
    expect(hash1).toBe(hash2);
  });

  it('should return different hash for different input', async () => {
    const hash1 = await sha256('hello');
    const hash2 = await sha256('world');
    expect(hash1).not.toBe(hash2);
  });

  it('should return 64-character hex string', async () => {
    const hash = await sha256('test');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should handle empty string', async () => {
    const hash = await sha256('');
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('cacheKey', () => {
  it('should combine multiple parts', () => {
    const key1 = cacheKey('model', 'messages', 'options');
    const key2 = cacheKey('model', 'messages', 'options');
    expect(key1).toBe(key2);
  });

  it('should handle different parts', () => {
    const key1 = cacheKey('a', 'b', 'c');
    const key2 = cacheKey('x', 'y', 'z');
    expect(key1).not.toBe(key2);
  });
});

describe('hashMessages', () => {
  it('should hash simple messages', () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];
    const hash1 = hashMessages(messages);
    const hash2 = hashMessages(messages);
    expect(hash1).toBe(hash2);
  });

  it('should return different hash for different messages', () => {
    const hash1 = hashMessages([{ role: 'user', content: 'Hello' }]);
    const hash2 = hashMessages([{ role: 'user', content: 'World' }]);
    expect(hash1).not.toBe(hash2);
  });
});

describe('requestFingerprint', () => {
  it('should generate fingerprint for model and messages', () => {
    const fp1 = requestFingerprint('gpt-4', [{ role: 'user', content: 'Hello' }]);
    const fp2 = requestFingerprint('gpt-4', [{ role: 'user', content: 'Hello' }]);
    expect(fp1).toBe(fp2);
  });

  it('should return different fingerprint for different options keys', () => {
    const fp1 = requestFingerprint('gpt-4', [{ role: 'user', content: 'Hello' }], { temperature: 0.7 });
    const fp2 = requestFingerprint('gpt-4', [{ role: 'user', content: 'Hello' }], { maxTokens: 100 });
    expect(fp1).not.toBe(fp2);
  });
});