import { describe, it, expect } from 'vitest';
import { simpleHash, cacheKey, hashMessages, requestFingerprint, sha256 } from './hash';

describe('simpleHash', () => {
  it('should return consistent hash for same input', () => {
    const hash1 = simpleHash('hello');
    const hash2 = simpleHash('hello');
    expect(hash1).toBe(hash2);
  });

  it('should return different hashes for different inputs', () => {
    const hash1 = simpleHash('hello');
    const hash2 = simpleHash('world');
    expect(hash1).not.toBe(hash2);
  });

  it('should return 8-character hex string', () => {
    const hash = simpleHash('test');
    expect(hash).toHaveLength(8);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('handles empty string', () => {
    const hash = simpleHash('');
    expect(hash).toHaveLength(8);
  });
});

describe('cacheKey', () => {
  it('should generate consistent key from same parts', () => {
    const key1 = cacheKey('model1', 'user:hello', true);
    const key2 = cacheKey('model1', 'user:hello', true);
    expect(key1).toBe(key2);
  });

  it('should treat undefined and null as empty string', () => {
    const key1 = cacheKey('a', undefined, null);
    const key2 = cacheKey('a', '', '');
    expect(key1).toBe(key2);
  });
});

describe('hashMessages', () => {
  it('should hash array of messages consistently', () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ];
    const hash1 = hashMessages(messages);
    const hash2 = hashMessages(messages);
    expect(hash1).toBe(hash2);
  });

  it('should handle message content as string', () => {
    const messages = [{ role: 'user', content: 'Text' }];
    const hash = hashMessages(messages);
    expect(hash).toHaveLength(8);
  });

  it('should handle message content as array (JSON.stringify)', () => {
    const messages = [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }];
    const hash = hashMessages(messages);
    expect(hash).toHaveLength(8);
  });
});

describe('requestFingerprint', () => {
  it('should generate consistent fingerprint', () => {
    const messages = [{ role: 'user', content: 'Hello' }];
    const fp1 = requestFingerprint('gpt-4', messages, { temperature: 0.7 });
    const fp2 = requestFingerprint('gpt-4', messages, { temperature: 0.7 });
    expect(fp1).toBe(fp2);
  });

  it('should change fingerprint when model changes', () => {
    const messages = [{ role: 'user', content: 'Hello' }];
    const fp1 = requestFingerprint('gpt-4', messages);
    const fp2 = requestFingerprint('gpt-3.5-turbo', messages);
    expect(fp1).not.toBe(fp2);
  });

  it('should be sensitive to options keys only, not values', () => {
    const messages = [{ role: 'user', content: 'Hello' }];
    const fp1 = requestFingerprint('gpt-4', messages, { temperature: 0.7 });
    const fp2 = requestFingerprint('gpt-4', messages, { temperature: 0.5 });
    // By design, only option keys affect fingerprint
    expect(fp1).toBe(fp2);
  });

  it('should change fingerprint when different option keys are used', () => {
    const messages = [{ role: 'user', content: 'Hello' }];
    const fp1 = requestFingerprint('gpt-4', messages, { temperature: 0.7 });
    const fp2 = requestFingerprint('gpt-4', messages, { max_tokens: 100 });
    expect(fp1).not.toBe(fp2);
  });
});

describe('sha256', () => {
  it('should return 64-character hex string', async () => {
    const hash = await sha256('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('should return consistent hash for same input', async () => {
    const hash1 = await sha256('test');
    const hash2 = await sha256('test');
    expect(hash1).toBe(hash2);
  });
});
