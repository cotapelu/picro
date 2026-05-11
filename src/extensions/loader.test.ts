// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for extension loader.
 */

import { describe, it, expect } from 'vitest';
import { discoverAndLoadExtensions } from './loader';
import type { LoadExtensionsResult } from './types';
import { tmpdir } from 'os';

describe('Extension Loader', () => {
  it('should discover and load extensions without throwing', async () => {
    const result: LoadExtensionsResult = await discoverAndLoadExtensions({
      cwd: process.cwd(),
      agentDir: tmpdir(),
    });
    expect(result).toBeDefined();
    expect(result.extensions).toBeInstanceOf(Array);
    expect(result.errors).toBeInstanceOf(Array);
    expect(result.runtime).toBeDefined();
  });
});
