// SPDX-License-Identifier: Apache-2.0
/**
 * Smoke test for types-atoms.ts
 */

import { describe, it, expect } from 'vitest';

// This file re-exports types from arabic-reshaper.
// Ensure import works without runtime errors.
import type * as Types from './types-atoms';

describe('types-atoms.ts', () => {
  it('should import without error', () => {
    // No explicit assertions; just compilation check
    expect(true).toBe(true);
  });
});