/**
 * Autocomplete System
 * Provides autocomplete functionality for file paths, slash commands, and custom providers
 */

export interface AutocompleteItem {
  label: string;
  insertText?: string;
  kind?: string;
  detail?: string;
  icon?: string;
  score?: number;
}

export interface AutocompleteContext {
  query: string;
  cursorPos: number;
  line: string;
}

export interface AutocompleteProvider {
  name: string;
  complete(context: AutocompleteContext, signal?: AbortSignal): Promise<AutocompleteItem[]>;
}

/**
 * Combined Autocomplete Provider
 * Merges results from multiple providers
 */
export class CombinedAutocompleteProvider implements AutocompleteProvider {
  name = 'combined';

  constructor(private providers: AutocompleteProvider[]) {}

  async complete(context: AutocompleteContext, signal?: AbortSignal): Promise<AutocompleteItem[]> {
    const results = await Promise.all(
      this.providers.map(provider => provider.complete(context, signal))
    );

    // Flatten and deduplicate by label
    const allItems = results.flat();
    const seen = new Set<string>();
    const unique: AutocompleteItem[] = [];

    for (const item of allItems) {
      if (!seen.has(item.label)) {
        seen.add(item.label);
        unique.push(item);
      }
    }

    return unique;
  }
}

/**
 * Slash Command Autocomplete Provider
 * Completes slash commands like /help, /clear, etc.
 */
export class SlashCommandAutocompleteProvider implements AutocompleteProvider {
  name = 'slash-commands';

  constructor(private commands: Map<string, { description?: string; handler?: () => void }>) {}

  async complete(context: AutocompleteContext): Promise<AutocompleteItem[]> {
    const { query } = context;

    // Only trigger if query starts with /
    if (!query.startsWith('/')) {
      return [];
    }

    const searchTerm = query.slice(1).toLowerCase();
    const items: AutocompleteItem[] = [];

    for (const [command, info] of this.commands.entries()) {
      if (command.toLowerCase().includes(searchTerm)) {
        items.push({
          label: `/${command}`,
          insertText: `/${command} `,
          kind: 'command',
          detail: info.description || '',
          icon: '⚡',
        });
      }
    }

    // Sort by relevance (exact match first, then prefix match, then contains)
    items.sort((a, b) => {
      const aLabel = a.label.slice(1).toLowerCase();
      const bLabel = b.label.slice(1).toLowerCase();

      if (aLabel === searchTerm) return -1;
      if (bLabel === searchTerm) return 1;
      if (aLabel.startsWith(searchTerm) && !bLabel.startsWith(searchTerm)) return -1;
      if (bLabel.startsWith(searchTerm) && !aLabel.startsWith(searchTerm)) return 1;
      return aLabel.localeCompare(bLabel);
    });

    return items;
  }
}

/**
 * File Path Autocomplete Provider
 * Completes file and directory paths
 */
export class FilePathAutocompleteProvider implements AutocompleteProvider {
  name = 'file-paths';

  constructor(private options: {
    rootDir?: string;
    includeHidden?: boolean;
    maxResults?: number;
  } = {}) {}

  async complete(context: AutocompleteContext, signal?: AbortSignal): Promise<AutocompleteItem[]> {
    const { query } = context;

    // Only trigger if query looks like a path (contains / or starts with . or ~)
    if (!query && !query.includes('/') && !query.startsWith('.') && !query.startsWith('~')) {
      return [];
    }

    const fs = await import('fs');
    const path = await import('path');

    // Expand ~ to home directory
    let searchPath = query.replace(/^~/, process.env.HOME || '');

    // Get directory and partial name
    let dir = path.dirname(searchPath) || '.';
    const partial = path.basename(searchPath);

    // If query ends with /, search inside that directory
    if (query.endsWith('/')) {
      dir = searchPath;
    }

    // Check if directory exists
    try {
      const stats = await fs.promises.stat(dir);
      if (!stats.isDirectory()) {
        return [];
      }
    } catch {
      return [];
    }

    // Read directory
    let entries: string[];
    try {
      entries = await fs.promises.readdir(dir);
    } catch {
      return [];
    }

    // Filter by partial match
    const { includeHidden = false, maxResults = 50 } = this.options;
    const items: AutocompleteItem[] = [];

    for (const entry of entries) {
      // Check for abort signal
      if (signal?.aborted) {
        break;
      }

      // Skip hidden files unless requested
      if (!includeHidden && entry.startsWith('.')) {
        continue;
      }

      // Check partial match
      if (!entry.toLowerCase().includes(partial.toLowerCase())) {
        continue;
      }

      // Get entry stats
      const fullPath = path.join(dir, entry);
      let isDir = false;
      try {
        const stats = await fs.promises.stat(fullPath);
        isDir = stats.isDirectory();
      } catch {
        continue;
      }

      // Build insert text
      let insertText: string;
      if (isDir) {
        insertText = path.join(query.replace(/\/$/, ''), entry) + '/';
      } else {
        insertText = path.join(query.replace(/\/$/, ''), entry);
      }

      items.push({
        label: entry,
        insertText,
        kind: isDir ? 'directory' : 'file',
        icon: isDir ? '📁' : '📄',
      });

      // Limit results
      if (items.length >= maxResults) {
        break;
      }
    }

    // Sort: directories first, then alphabetically
    items.sort((a, b) => {
      if (a.kind === 'directory' && b.kind !== 'directory') return -1;
      if (a.kind !== 'directory' && b.kind === 'directory') return 1;
      return a.label.localeCompare(b.label);
    });

    return items;
  }
}

/**
 * Fuzzy Autocomplete
 * Provides fuzzy matching and scoring for autocomplete items
 */
export class FuzzyAutocomplete {
  /**
   * Calculate fuzzy match score
   * Higher score = better match
   */
  static score(text: string, query: string): number {
    if (!query) return 1;
    if (!text) return 0;

    const t = text.toLowerCase();
    const q = query.toLowerCase();

    // Exact match
    if (t === q) return 1;

    // Prefix match
    if (t.startsWith(q)) return 0.8;

    // Contains match
    if (t.includes(q)) return 0.6;

    // Fuzzy match
    let ti = 0;
    let qi = 0;
    let matches = 0;

    while (ti < t.length && qi < q.length) {
      if (t[ti] === q[qi]) {
        matches++;
        qi++;
      }
      ti++;
    }

    if (qi === q.length) {
      // All query characters found
      return 0.4 + (matches / q.length) * 0.2;
    }

    return 0;
  }

  /**
   * Filter and sort items by fuzzy match
   */
  static filter(
    items: AutocompleteItem[],
    query: string,
    options?: { minScore?: number; maxResults?: number }
  ): AutocompleteItem[] {
    const { minScore = 0.3, maxResults = 100 } = options || {};

    // Score each item
    const scored = items.map(item => ({
      item,
      score: this.score(item.label, query),
    }));

    // Filter by minimum score
    const filtered = scored.filter(s => s.score >= minScore);

    // Sort by score (descending), then by label
    filtered.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.label.localeCompare(b.item.label);
    });

    // Return top results
    return filtered.slice(0, maxResults).map(s => ({
      ...s.item,
      score: s.score,
    }));
  }

  /**
   * Highlight fuzzy matches in text
   * Returns ANSI-highlighted string
   */
  static highlight(text: string, query: string): string {
    if (!query) return text;

    const t = text.toLowerCase();
    const q = query.toLowerCase();

    // Find all match positions
    const positions: number[] = [];
    let ti = 0;
    let qi = 0;

    while (ti < t.length && qi < q.length) {
      if (t[ti] === q[qi]) {
        positions.push(ti);
        qi++;
      }
      ti++;
    }

    if (positions.length === 0) {
      return text;
    }

    // Build highlighted string
    let result = '';
    let lastPos = 0;

    for (const pos of positions) {
      result += text.slice(lastPos, pos);
      result += `\x1b[1m\x1b[38;5;221m${text[pos]}\x1b[0m`; // Yellow bold
      lastPos = pos + 1;
    }

    result += text.slice(lastPos);

    return result;
  }
}

/**
 * Default autocomplete provider with common providers
 */
export function createDefaultAutocomplete(
  commands?: Map<string, { description?: string; handler?: () => void }>,
  options?: {
    rootDir?: string;
    includeHidden?: boolean;
  }
): CombinedAutocompleteProvider {
  const providers: AutocompleteProvider[] = [];

  // Add slash command provider if commands provided
  if (commands && commands.size > 0) {
    providers.push(new SlashCommandAutocompleteProvider(commands));
  }

  // Add file path provider
  providers.push(new FilePathAutocompleteProvider(options));

  return new CombinedAutocompleteProvider(providers);
}
