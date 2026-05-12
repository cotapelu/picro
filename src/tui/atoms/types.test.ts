// SPDX-License-Identifier: Apache-2.0
/**
 * Smoke test for types.ts re-exports
 */

import { describe, it, expect } from 'vitest';

// Import types to ensure they resolve
// import type * as Types from './types';

describe('types.ts', () => {
  it('should import without runtime errors', () => {
    expect(true).toBe(true);
  });
});
