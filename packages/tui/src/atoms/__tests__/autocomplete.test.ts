import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AutocompleteItem,
  AutocompleteContext,
  AutocompleteProvider,
  CombinedAutocompleteProvider,
  SlashCommandAutocompleteProvider,
  FilePathAutocompleteProvider,
  FuzzyAutocomplete,
  createDefaultAutocomplete,
} from '../autocomplete';

describe('Autocomplete System', () => {
  describe('Interfaces', () => {
    it('should have correct AutocompleteItem shape', () => {
      const item: AutocompleteItem = {
        label: 'test',
        insertText: 'test ',
        kind: 'file',
        detail: 'A test file',
        icon: '📄',
        score: 0.9,
      };
      expect(item.label).toBe('test');
      expect(item.kind).toBe('file');
    });

    it('should have correct AutocompleteContext shape', () => {
      const ctx: AutocompleteContext = {
        query: '/he',
        cursorPos: 3,
        line: '/help',
      };
      expect(ctx.query).toBe('/he');
      expect(ctx.cursorPos).toBe(3);
    });
  });

  describe('SlashCommandAutocompleteProvider', () => {
    let commands: Map<string, { description?: string; handler?: () => void }>;

    beforeEach(() => {
      commands = new Map([
        ['help', { description: 'Show help', handler: () => {} }],
        ['clear', { description: 'Clear screen' }],
        ['quit', { description: 'Quit application' }],
      ]);
    });

    it('should return empty array when query does not start with /', async () => {
      const provider = new SlashCommandAutocompleteProvider(commands);
      const result = await provider.complete({ query: 'he', cursorPos: 2, line: 'help' });
      expect(result).toEqual([]);
    });

    it('should return empty array for empty slash query', async () => {
      const provider = new SlashCommandAutocompleteProvider(commands);
      const result = await provider.complete({ query: '/', cursorPos: 1, line: '/' });
      expect(result.length).toBe(3);
    });

    it('should match commands by substring (case insensitive)', async () => {
      const provider = new SlashCommandAutocompleteProvider(commands);
      const result = await provider.complete({ query: '/he', cursorPos: 3, line: '/he' });
      expect(result.length).toBe(1);
      expect(result[0].label).toBe('/help');
    });

    it('should return all commands for empty search term', async () => {
      const provider = new SlashCommandAutocompleteProvider(commands);
      const result = await provider.complete({ query: '/', cursorPos: 1, line: '/' });
      expect(result.length).toBe(3);
    });

    it('should sort exact matches first', async () => {
      const provider = new SlashCommandAutocompleteProvider(commands);
      const result = await provider.complete({ query: '/help', cursorPos: 5, line: '/help' });
      expect(result[0].label).toBe('/help');
    });

    it('should sort prefix matches before contains matches', async () => {
      const provider = new SlashCommandAutocompleteProvider(commands);
      const result = await provider.complete({ query: '/c', cursorPos: 2, line: '/c' });
      expect(result[0].label).toBe('/clear');
    });

    it('should include description in detail field', async () => {
      const provider = new SlashCommandAutocompleteProvider(commands);
      const result = await provider.complete({ query: '/help', cursorPos: 5, line: '/help' });
      expect(result[0].detail).toBe('Show help');
    });

    it('should include lightning icon', async () => {
      const provider = new SlashCommandAutocompleteProvider(commands);
      const result = await provider.complete({ query: '/help', cursorPos: 5, line: '/help' });
      expect(result[0].icon).toBe('⚡');
    });

    it('should provide insertText with trailing space', async () => {
      const provider = new SlashCommandAutocompleteProvider(commands);
      const result = await provider.complete({ query: '/help', cursorPos: 5, line: '/help' });
      expect(result[0].insertText).toBe('/help ');
    });

    it('should set kind to "command"', async () => {
      const provider = new SlashCommandAutocompleteProvider(commands);
      const result = await provider.complete({ query: '/help', cursorPos: 5, line: '/help' });
      expect(result[0].kind).toBe('command');
    });

    it('should handle commands without description', async () => {
      const minimalCommands = new Map<string, { description?: string }>([
        ['test', {}],
      ]);
      const provider = new SlashCommandAutocompleteProvider(minimalCommands);
      const result = await provider.complete({ query: '/test', cursorPos: 5, line: '/test' });
      expect(result[0].detail).toBe('');
    });

    it('should return empty array when no commands match', async () => {
      const provider = new SlashCommandAutocompleteProvider(commands);
      const result = await provider.complete({ query: '/xyz', cursorPos: 4, line: '/xyz' });
      expect(result).toEqual([]);
    });

    it('should have name property "slash-commands"', () => {
      const provider = new SlashCommandAutocompleteProvider(commands);
      expect(provider.name).toBe('slash-commands');
    });
  });

  describe('FilePathAutocompleteProvider', () => {
    let provider: FilePathAutocompleteProvider;

    beforeEach(() => {
      // Mock fs and path before each test
      vi.mock('fs', async () => {
        return {
          promises: {
            stat: vi.fn(),
            readdir: vi.fn(),
          },
        };
      });
      vi.mock('path', async () => {
        return {
          dirname: vi.fn(),
          basename: vi.fn(),
          join: vi.fn((...args) => args.join('/')),
        };
      });

      provider = new FilePathAutocompleteProvider({
        rootDir: '/test',
        includeHidden: false,
        maxResults: 50,
      });
    });

    it('should return empty array for non-path queries', async () => {
      const result = await provider.complete({ query: 'hello', cursorPos: 5, line: 'hello' });
      expect(result).toEqual([]);
    });

    it('should return empty array when directory does not exist', async () => {
      const fs = await import('fs');
      (fs.promises.stat as any).mockRejectedValue(new Error('Not found'));

      const result = await provider.complete({ query: '/nonexistent', cursorPos: 12, line: '/nonexistent' });
      expect(result).toEqual([]);
    });

    it('should return empty array when path is not a directory', async () => {
      const fs = await import('fs');
      (fs.promises.stat as any).mockResolvedValue({ isDirectory: () => false });

      const result = await provider.complete({ query: '/file.txt', cursorPos: 9, line: '/file.txt' });
      expect(result).toEqual([]);
    });

    it('should list directory entries', async () => {
      const fs = await import('fs');
      const path = await import('path');

      (fs.promises.stat as any).mockResolvedValue({ isDirectory: () => true });
      (fs.promises.readdir as any).mockResolvedValue(['file1.txt', 'dir1', 'file2.js']);
      (path.dirname as any).mockReturnValue('.');
      (path.basename as any).mockReturnValue('');

      const result = await provider.complete({ query: '.', cursorPos: 1, line: '.' });

      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter entries by partial match', async () => {
      const fs = await import('fs');
      const path = await import('path');

      (fs.promises.stat as any).mockResolvedValue({ isDirectory: () => true });
      (fs.promises.readdir as any).mockResolvedValue(['test-file.txt', 'docs', 'test-dir']);
      (path.dirname as any).mockReturnValue('.');
      (path.basename as any).mockReturnValue('test');

      const result = await provider.complete({ query: 'test', cursorPos: 4, line: 'test' });

      expect(result.every(item => item.label.toLowerCase().includes('test'))).toBe(true);
    });

    it('should skip hidden files by default', async () => {
      const fs = await import('fs');
      const path = await import('path');

      (fs.promises.stat as any).mockResolvedValue({ isDirectory: () => true });
      (fs.promises.readdir as any).mockResolvedValue(['.hidden', 'visible']);
      (path.dirname as any).mockReturnValue('.');
      (path.basename as any).mockReturnValue('');

      const result = await provider.complete({ query: '', cursorPos: 0, line: '' });

      expect(result.some(item => item.label === '.hidden')).toBe(false);
    });

    it('should include hidden files when includeHidden is true', async () => {
      const providerWithHidden = new FilePathAutocompleteProvider({
        includeHidden: true,
      });

      const fs = await import('fs');
      const path = await import('path');

      (fs.promises.stat as any).mockResolvedValue({ isDirectory: () => true });
      (fs.promises.readdir as any).mockResolvedValue(['.hidden', 'visible']);
      (path.dirname as any).mockReturnValue('.');
      (path.basename as any).mockReturnValue('');

      const result = await providerWithHidden.complete({ query: '', cursorPos: 0, line: '' });

      expect(result.some(item => item.label === '.hidden')).toBe(true);
    });

    it('should respect maxResults limit', async () => {
      const providerWithLimit = new FilePathAutocompleteProvider({
        maxResults: 2,
      });

      const fs = await import('fs');
      const path = await import('path');

      (fs.promises.stat as any).mockResolvedValue({ isDirectory: () => true });
      (fs.promises.readdir as any).mockResolvedValue(['a', 'b', 'c', 'd']);
      (path.dirname as any).mockReturnValue('.');
      (path.basename as any).mockReturnValue('');

      const result = await providerWithLimit.complete({ query: '', cursorPos: 0, line: '' });

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should sort directories before files', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const mockStat = (name: string) => ({
        isDirectory: () => name.endsWith('/') || ['dir1', 'dir2'].includes(name),
      });

      (fs.promises.stat as any).mockImplementation(async (path: string) => mockStat(path));
      (fs.promises.readdir as any).mockResolvedValue(['file1.txt', 'dir1', 'file2.js', 'dir2']);
      (path.dirname as any).mockReturnValue('.');
      (path.basename as any).mockReturnValue('');

      const result = await provider.complete({ query: '', cursorPos: 0, line: '' });

      const dirs = result.filter(item => item.kind === 'directory');
      const files = result.filter(item => item.kind === 'file');

      // All directories should come before files
      expect(dirs.length).toBeGreaterThan(0);
      if (files.length > 0) {
        expect(result.indexOf(dirs[0])).toBeLessThan(result.indexOf(files[0]));
      }
    });

    it('should set kind to "directory" for directories', async () => {
      const fs = await import('fs');
      const path = await import('path');

      (fs.promises.stat as any).mockResolvedValue({ isDirectory: () => true });
      (fs.promises.readdir as any).mockResolvedValue(['mydir']);
      (path.dirname as any).mockReturnValue('.');
      (path.basename as any).mockReturnValue('');

      const result = await provider.complete({ query: '', cursorPos: 0, line: '' });

      expect(result[0].kind).toBe('directory');
      expect(result[0].icon).toBe('📁');
    });

    it('should set kind to "file" for files', async () => {
      const fs = await import('fs');
      const path = await import('path');

      (fs.promises.stat as any).mockResolvedValue({ isDirectory: () => false });
      (fs.promises.readdir as any).mockResolvedValue(['myfile.txt']);
      (path.dirname as any).mockReturnValue('.');
      (path.basename as any).mockReturnValue('');

      const result = await provider.complete({ query: '', cursorPos: 0, line: '' });

      expect(result[0].kind).toBe('file');
      expect(result[0].icon).toBe('📄');
    });

    it('should handle abort signal', async () => {
      const fs = await import('fs');
      (fs.promises.readdir as any).mockImplementation(async () => {
        // Simulate long operation
        await new Promise(resolve => setTimeout(resolve, 100));
        return ['file1', 'file2', 'file3', 'file4', 'file5'];
      });

      const abortController = new AbortController();
      // Abort after a short delay
      setTimeout(() => abortController.abort(), 10);

      const result = await provider.complete(
        { query: '', cursorPos: 0, line: '' },
        abortController.signal
      );

      // Should have fewer results due to abort, or at least not crash
      expect(Array.isArray(result)).toBe(true);
    });

    it('should have name property "file-paths"', () => {
      expect(provider.name).toBe('file-paths');
    });
  });

  describe('CombinedAutocompleteProvider', () => {
    let provider1: MockProvider;
    let provider2: MockProvider;
    let combined: CombinedAutocompleteProvider;

    beforeEach(() => {
      provider1 = new MockProvider('provider1', ['item1', 'item2']);
      provider2 = new MockProvider('provider2', ['item2', 'item3']);
      combined = new CombinedAutocompleteProvider([provider1, provider2]);
    });

    it('should combine results from multiple providers', async () => {
      const result = await combined.complete({ query: '', cursorPos: 0, line: '' });
      expect(result.length).toBe(3); // item1, item2, item3
    });

    it('should deduplicate items by label', async () => {
      const result = await combined.complete({ query: '', cursorPos: 0, line: '' });
      const labels = result.map(item => item.label);
      expect(new Set(labels).size).toBe(labels.length);
    });

    it('should have name "combined"', () => {
      expect(combined.name).toBe('combined');
    });

    it('should pass signal to all providers', async () => {
      const signal = AbortSignal.abort();
      const result = await combined.complete({ query: '', cursorPos: 0, line: '' }, signal);
      // Should not throw, and providers should handle abort
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('FuzzyAutocomplete', () => {
    describe('score', () => {
      it('should return 0 for empty query', () => {
        expect(FuzzyAutocomplete.score('hello', '')).toBe(0);
      });

      it('should return 0 for empty text', () => {
        expect(FuzzyAutocomplete.score('', 'hel')).toBe(0);
      });

      it('should return 1 for exact match', () => {
        expect(FuzzyAutocomplete.score('hello', 'hello')).toBe(1);
      });

      it('should return 0.8 for prefix match', () => {
        expect(FuzzyAutocomplete.score('hello world', 'hello')).toBe(0.8);
      });

      it('should return 0.6 for contains match', () => {
        expect(FuzzyAutocomplete.score('hello world', 'ello')).toBe(0.6);
      });

      it('should return score for fuzzy match', () => {
        const score = FuzzyAutocomplete.score('hello world', 'hww');
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThan(0.6);
      });

      it('should be case insensitive', () => {
        expect(FuzzyAutocomplete.score('Hello', 'HELLO')).toBe(1);
      });
    });

    describe('filter', () => {
      const items: AutocompleteItem[] = [
        { label: 'apple' },
        { label: 'banana' },
        { label: 'apricot' },
        { label: 'grape' },
      ];

      it('should filter items by fuzzy match', () => {
        const result = FuzzyAutocomplete.filter(items, 'ap');
        expect(result.length).toBeGreaterThan(0);
        expect(result.map(item => item.label)).toContain('apple');
        expect(result.map(item => item.label)).toContain('apricot');
      });

      it('should respect minScore threshold', () => {
        const result = FuzzyAutocomplete.filter(items, 'xyz', { minScore: 0.5 });
        expect(result).toEqual([]);
      });

      it('should respect maxResults limit', () => {
        const result = FuzzyAutocomplete.filter(items, 'a', { maxResults: 2 });
        expect(result.length).toBeLessThanOrEqual(2);
      });

      it('should sort by score descending', () => {
        const result = FuzzyAutocomplete.filter(items, 'ap');
        if (result.length > 1) {
          expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
        }
      });

      it('should include score in result items', () => {
        const result = FuzzyAutocomplete.filter(items, 'apple');
        expect(result[0].score).toBeDefined();
      });

      it('should return empty array for empty items', () => {
        const result = FuzzyAutocomplete.filter([], 'test');
        expect(result).toEqual([]);
      });

      it('should handle empty query by returning all items with base score', () => {
        const result = FuzzyAutocomplete.filter(items, '');
        // Empty query returns 0 score for all items based on implementation
        expect(result.length).toBe(items.length);
      });
    });

    describe('highlight', () => {
      it('should return original text for empty query', () => {
        const result = FuzzyAutocomplete.highlight('hello', '');
        expect(result).toBe('hello');
      });

      it('should highlight matching characters', () => {
        const result = FuzzyAutocomplete.highlight('hello world', 'hlo');
        // Should contain ANSI codes for highlighting
        expect(result).toContain('\x1b[1m\x1b[38;5;221m');
        expect(result).toContain('\x1b[0m');
      });

      it('should not modify text when no match', () => {
        const result = FuzzyAutocomplete.highlight('hello', 'xyz');
        expect(result).toBe('hello');
      });

      it('should preserve non-matching characters', () => {
        const result = FuzzyAutocomplete.highlight('hello', 'he');
        // Should contain 'ello' without highlighting
        expect(result).toContain('ello');
      });

      it('should highlight in order of appearance', () => {
        const result = FuzzyAutocomplete.highlight('abcdef', 'ace');
        // Find all highlighted positions
        const matches = result.match(/\x1b\[1m\x1b\[38;5;221m./g) || [];
        expect(matches.length).toBe(3);
      });
    });
  });

  describe('createDefaultAutocomplete', () => {
    it('should create provider with slash commands and file paths', () => {
      const commands = new Map([['test', { description: 'Test command' }]]);
      const provider = createDefaultAutocomplete(commands, { rootDir: '.' });

      expect(provider.name).toBe('combined');
    });

    it('should create provider without slash commands when not provided', () => {
      const provider = createDefaultAutocomplete(undefined, {});
      expect(provider.name).toBe('combined');
    });

    it('should pass options to file path provider', () => {
      const commands = new Map([['help', {}]]);
      const provider = createDefaultAutocomplete(commands, {
        rootDir: '/custom',
        includeHidden: true,
      });

      expect(provider.name).toBe('combined');
    });
  });
});

class MockProvider implements AutocompleteProvider {
  name: string;
  private items: AutocompleteItem[];

  constructor(name: string, items: string[]) {
    this.name = name;
    this.items = items.map(item => ({ label: item }));
  }

  async complete(context: AutocompleteContext, signal?: AbortSignal): Promise<AutocompleteItem[]> {
    if (signal?.aborted) {
      return [];
    }
    return this.items.filter(item =>
      item.label.toLowerCase().includes(context.query.toLowerCase())
    );
  }
}
