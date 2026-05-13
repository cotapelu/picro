// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for Autocomplete atom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AutocompleteItem,
  AutocompleteContext,
  AutocompleteProvider,
  CombinedAutocompleteProvider,
  SlashCommandAutocompleteProvider,
  FilePathAutocompleteProvider,
} from './autocomplete';
import { afterEach } from 'vitest';
import { promises as fsPromises } from 'fs';
import * as path from 'path';

afterEach(() => {
  vi.restoreAllMocks();
});

// Mock fs and path for FilePath provider
vi.mock('fs', () => ({
  promises: {
    stat: vi.fn(),
    readdir: vi.fn(),
  },
}));

vi.mock('path', () => ({
  dirname: vi.fn(),
  basename: vi.fn(),
  join: vi.fn(),
}));

describe('Autocomplete', () => {
  describe('SlashCommandAutocompleteProvider', () => {
    let provider: SlashCommandAutocompleteProvider;
    let commands: Map<string, { description?: string; handler?: () => void }>;

    beforeEach(() => {
      commands = new Map([
        ['help', { description: 'Show help' }],
        ['clear', { description: 'Clear chat' }],
        ['quit', { description: 'Exit' }],
      ]);
      provider = new SlashCommandAutocompleteProvider(commands);
    });

    it('should only match queries starting with /', async () => {
      const result = await provider.complete({ query: 'help', cursorPos: 5, line: 'help' });
      expect(result).toHaveLength(0);
    });

    it('should match commands by substring', async () => {
      const result = await provider.complete({ query: '/he', cursorPos: 3, line: '/he' });
      expect(result.some(i => i.label === '/help')).toBe(true);
    });

    it('should be case-insensitive', async () => {
      const result = await provider.complete({ query: '/HE', cursorPos: 3, line: '/HE' });
      expect(result.some(i => i.label === '/help')).toBe(true);
    });

    it('should include description as detail', async () => {
      const result = await provider.complete({ query: '/help', cursorPos: 6, line: '/help' });
      const item = result.find(i => i.label === '/help');
      expect(item?.detail).toBe('Show help');
    });

    it('should include icon', async () => {
      const result = await provider.complete({ query: '/c', cursorPos: 2, line: '/c' });
      expect(result[0].icon).toBe('⚡');
    });

    it('should sort: exact match first, then prefix, then contains', async () => {
      const result = await provider.complete({ query: '/c', cursorPos: 2, line: '/c' });
      const labels = result.map(i => i.label);
      // /clear starts with /c, /quit contains c but doesn't start with c? Actually /quit doesn't contain c after slash? it contains c in 'quit'. So both contain c. Prefix should come first.
      expect(labels[0]).toBe('/clear');
    });
  });

  describe('FilePathAutocompleteProvider', () => {
    let provider: FilePathAutocompleteProvider;

    beforeEach(() => {
      provider = new FilePathAutocompleteProvider({ rootDir: '/test' });
    });

    it('should return empty if query does not look like path', async () => {
      const result = await provider.complete({ query: 'hello', cursorPos: 5, line: 'hello' });
      expect(result).toHaveLength(0);
    });

    it('should return empty if directory does not exist', async () => {
      vi.spyOn(fsPromises, 'stat').mockRejectedValue(new Error());
      const result = await provider.complete({ query: '/nonexistent/', cursorPos: 14, line: '/nonexistent/' });
      expect(result).toHaveLength(0);
    });

    it('should return files in directory if query ends with /', async () => {
      vi.spyOn(fsPromises, 'stat').mockResolvedValue({ isDirectory: () => true } as any);
      vi.spyOn(fsPromises, 'readdir').mockResolvedValue(['file1.txt', 'file2.txt']);
      vi.spyOn(path, 'dirname').mockReturnValue('/test');
      vi.spyOn(path, 'basename').mockReturnValue('');

      const result = await provider.complete({ query: '/test/', cursorPos: 6, line: '/test/' });
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('CombinedAutocompleteProvider', () => {
    it('should merge results from multiple providers', async () => {
      const provider1 = { complete: vi.fn().mockResolvedValue([{ label: 'A' }]) } as any;
      const provider2 = { complete: vi.fn().mockResolvedValue([{ label: 'B' }]) } as any;
      const combined = new CombinedAutocompleteProvider([provider1, provider2]);
      const result = await combined.complete({ query: '', cursorPos: 0, line: '' });
      expect(result).toHaveLength(2);
    });

    it('should deduplicate by label', async () => {
      const provider1 = { complete: vi.fn().mockResolvedValue([{ label: 'A' }]) } as any;
      const provider2 = { complete: vi.fn().mockResolvedValue([{ label: 'A' }]) } as any;
      const combined = new CombinedAutocompleteProvider([provider1, provider2]);
      const result = await combined.complete({ query: '', cursorPos: 0, line: '' });
      expect(result).toHaveLength(1);
    });
  });
});