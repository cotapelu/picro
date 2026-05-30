// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import { createProxyStream } from './proxy-stream.js';

describe('createProxyStream', () => {
  it('creates a stream function', () => {
    const fn = createProxyStream({ authToken: 't', proxyUrl: 'https://p' });
    expect(typeof fn).toBe('function');
  });
});
