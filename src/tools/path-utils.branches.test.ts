// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for src/tools/path-utils.js
 * Uses real temporary files to test resolveReadPath.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, writeFileSync, unlinkSync, rmSync, readdirSync } from 'node:fs';
import { resolveReadPath } from './path-utils.js';

const baseDir = join(tmpdir(), `path-utils-test-${Date.now()}`);

// Ensure baseDir exists before all tests
beforeAll(() => {
  mkdirSync(baseDir, { recursive: true });
});

// Cleanup entire baseDir after all tests
afterAll(() => {
  try {
    rmSync(baseDir, { recursive: true, force: true });
  } catch {}
});

// Clean up files after each test to avoid interference
afterEach(() => {
  try {
    const entries = readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(baseDir, entry.name);
      if (entry.isDirectory()) {
        rmSync(fullPath, { recursive: true, force: true });
      } else {
        unlinkSync(fullPath);
      }
    }
  } catch {
    // ignore
  }
});

function createFile(path: string) {
  writeFileSync(path, '', 'utf8');
}

describe('resolveReadPath branch coverage', () => {
  it('returns resolved path if file exists', () => {
    const filePath = 'file.txt';
    const resolved = join(baseDir, filePath);
    createFile(resolved);

    const result = resolveReadPath(filePath, baseDir);
    expect(result).toBe(resolved);
  });

  describe('macOS AM/PM variant', () => {
    it('returns amPmVariant when original does not exist but variant does', () => {
      const filePath = 'file AM.txt';
      const resolved = join(baseDir, filePath);
      const amPmVariant = join(baseDir, 'file\u202FAM.txt'); // narrow no-break space
      // Create only the variant file
      createFile(amPmVariant);

      const result = resolveReadPath(filePath, baseDir);
      expect(result).toBe(amPmVariant);
    });
  });

  describe('NFD variant', () => {
    it('returns nfdVariant when it exists and resolved does not', () => {
      // Use precomposed 'é' which normalizes to 'e' + combining acute.
      const filePath = 'café.txt'; // precomposed é
      const resolved = join(baseDir, filePath);
      const nfdVariant = resolved.normalize('NFD');

      // Ensure they differ
      if (nfdVariant === resolved) {
        // Skip test if normalization does not change (unlikely)
        return;
      }

      // Create only the nfdVariant file
      createFile(nfdVariant);

      const result = resolveReadPath(filePath, baseDir);
      expect(result).toBe(nfdVariant);
    });
  });

  describe('curly quote variant', () => {
    it('returns curlyVariant when it exists and previous variants do not', () => {
      const filePath = "file's.txt";
      const resolved = join(baseDir, filePath);
      const curlyVariant = resolved.replace(/'/g, "\u2019"); // right single quotation mark

      // Ensure curlyVariant differs
      if (curlyVariant === resolved) {
        return;
      }

      // Create only curlyVariant
      createFile(curlyVariant);

      const result = resolveReadPath(filePath, baseDir);
      expect(result).toBe(curlyVariant);
    });
  });

  describe('combined NFD + curly quote variant', () => {
    it('returns nfdCurlyVariant when previous variants not found but this exists', () => {
      // Path with both a combining char (via precomposed é) and a single quote
      const filePath = "café's.txt"; // precomposed é and ascii '
      const resolved = join(baseDir, filePath);
      const nfdVariant = resolved.normalize('NFD');
      const curlyVariant = resolved.replace(/'/g, "\u2019");
      const nfdCurlyVariant = nfdVariant.replace(/'/g, "\u2019");

      // Ensure they differ appropriately
      if (nfdVariant === resolved || curlyVariant === resolved || nfdCurlyVariant === resolved) {
        return;
      }

      // Create only the combined variant
      createFile(nfdCurlyVariant);

      const result = resolveReadPath(filePath, baseDir);
      expect(result).toBe(nfdCurlyVariant);
    });
  });

  describe('fallback', () => {
    it('returns resolved path if none of the variants exist', () => {
      const filePath = 'nonexistent.txt';
      const resolved = join(baseDir, filePath);
      // Do not create any files

      const result = resolveReadPath(filePath, baseDir);
      expect(result).toBe(resolved);
    });
  });
});
