/**
 * Search Tools
 * Tools for searching files and content
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import type { ToolDefinition, ToolHandler } from '@picro/agent';

export interface SearchToolOptions {
  basePath?: string;
  maxResults?: number;
  ignorePatterns?: string[];
}

export class SearchTools {
  private basePath: string;
  private maxResults: number;
  private ignorePatterns: RegExp[];

  constructor(options: SearchToolOptions = {}) {
    this.basePath = path.resolve(options.basePath || process.cwd());
    this.maxResults = options.maxResults || 100;
    this.ignorePatterns = (options.ignorePatterns || [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.*\.log',
    ]).map(p => new RegExp(p));
  }

  private validatePath(resolvedPath: string): void {
    // Ensure the resolved path is within basePath to prevent directory traversal
    try {
      const realBase = fs.realpathSync(this.basePath);
      const realPath = fs.realpathSync(resolvedPath);
      if (!realPath.startsWith(realBase + path.sep) && realPath !== realBase) {
        throw new Error('Path not allowed');
      }
    } catch (e: any) {
      if (e.code === 'ENOENT' || e.code === 'ENOTDIR') {
        // If file/dir doesn't exist yet, check parent
        const parent = path.dirname(resolvedPath);
        try {
          const realBase = fs.realpathSync(this.basePath);
          const realParent = fs.realpathSync(parent);
          if (!realParent.startsWith(realBase + path.sep) && realParent !== realBase) {
            throw new Error('Path not allowed');
          }
          return; // allowed
        } catch {
          throw new Error('Invalid path');
        }
      }
      // Other errors rethrow
      throw e;
    }
  }

  private shouldIgnore(filePath: string): boolean {
    const basename = path.basename(filePath);
    return this.ignorePatterns.some(pattern => {
      if (pattern.test(filePath)) return true;
      if (pattern.test(basename)) return true;
      return false;
    });
  }

  private resolvePath(filePath: string): string {
    return path.resolve(this.basePath, filePath);
  }

  // Tool handlers
  private handleSearchFiles: ToolHandler = async (_context: any, args: any) => {
    const pattern = args?.pattern || '*';
    const dirPath = args?.path || '.';
    const recursive = args?.recursive !== false;
    const caseSensitive = args?.caseSensitive || false;
    const maxResults = args?.maxResults || this.maxResults;

    const resolvedDir = this.resolvePath(dirPath);
    this.validatePath(resolvedDir);

    if (!fs.existsSync(resolvedDir)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    if (!fs.statSync(resolvedDir).isDirectory()) {
      throw new Error(`Not a directory: ${dirPath}`);
    }

    const results: string[] = [];
    const regex = new RegExp(pattern, caseSensitive ? '' : 'i');

    const searchDir = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir);

        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const relativePath = path.relative(this.basePath, fullPath);

          if (this.shouldIgnore(relativePath)) {
            continue;
          }

          const stats = fs.statSync(fullPath);

          if (stats.isDirectory() && recursive) {
            searchDir(fullPath);
          } else if (stats.isFile() && regex.test(entry)) {
            results.push(relativePath);

            if (results.length >= maxResults) {
              return;
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    searchDir(resolvedDir);

    if (results.length === 0) {
      return `No files found matching pattern "${pattern}" in ${dirPath}.`;
    }
    return `Found ${results.length} files matching pattern "${pattern}" in ${dirPath}:\n${results.join('\n')}`;
  };

  private handleSearchContent: ToolHandler = async (_context: any, args: any) => {
    const query = args?.query;
    const dirPath = args?.path || '.';
    const recursive = args?.recursive !== false;
    const caseSensitive = args?.caseSensitive || false;
    const maxResults = args?.maxResults || this.maxResults;
    const includeLineNumbers = args?.includeLineNumbers || false;
    const contextLines = args?.contextLines || 0;

    if (!query) {
      throw new Error('Search query is required');
    }

    const resolvedDir = this.resolvePath(dirPath);
    this.validatePath(resolvedDir);

    if (!fs.existsSync(resolvedDir)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const results: any[] = [];
    const regex = new RegExp(query, caseSensitive ? '' : 'i');

    const searchInFile = (filePath: string) => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          const matches = line.match(regex);
          if (matches) {
            const result: any = {
              file: path.relative(this.basePath, filePath),
              line: index + 1,
              text: line.trim(),
              matches: matches.length,
            };

            // Add context if requested
            if (contextLines > 0) {
              const start = Math.max(0, index - contextLines);
              const end = Math.min(lines.length - 1, index + contextLines);
              result.context = lines.slice(start, end + 1).map((l, i) => ({
                line: start + i + 1,
                text: l,
                isMatch: i === index - start,
              }));
            }

            results.push(result);

            if (results.length >= maxResults) {
              return;
            }
          }
        });
      } catch (error) {
        // Skip files we can't read
      }
    };

    const searchDir = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir);

        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const relativePath = path.relative(this.basePath, fullPath);

          if (this.shouldIgnore(relativePath)) {
            continue;
          }

          const stats = fs.statSync(fullPath);

          if (stats.isDirectory() && recursive) {
            searchDir(fullPath);
          } else if (stats.isFile()) {
            searchInFile(fullPath);

            if (results.length >= maxResults) {
              return;
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    searchDir(resolvedDir);

    if (results.length === 0) {
      return `No content found matching "${query}" in ${dirPath}.`;
    }
    return `Found ${results.length} matches for "${query}" in ${dirPath}:\n${results.map(r => `${r.file}:${r.line}: ${r.text}`).join('\n')}`;
  };

  private handleGrep: ToolHandler = async (_context: any, args: any) => {
    const pattern = args?.pattern;
    const dirPath = args?.path || '.';
    const options = args?.options || '-rn';

    if (!pattern) {
      throw new Error('Pattern is required');
    }

    const resolvedDir = this.resolvePath(dirPath);

    return new Promise<string>((resolve, reject) => {
      exec(
        `grep ${options} "${pattern}" "${resolvedDir}" 2>/dev/null || true`,
        { maxBuffer: 1024 * 1024 * 10 },
        (error, stdout, stderr) => {
          const lines = stdout.trim().split('\n').filter(l => l);

          if (lines.length === 0) {
            resolve(`No matches found for pattern "${pattern}" in ${dirPath}.`);
            return;
          }

          resolve(`Found ${lines.length} matches for pattern "${pattern}" in ${dirPath}:\n${lines.join('\n')}`);
        }
      );
    });
  };

  private handleFind: ToolHandler = async (_context: any, args: any) => {
    const dirPath = args?.path || '.';
    const name = args?.name;
    const type = args?.type; // 'f' for file, 'd' for directory
    const maxDepth = args?.maxDepth;

    const resolvedDir = this.resolvePath(dirPath);

    if (!fs.existsSync(resolvedDir)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const results: any[] = [];

    const find = (dir: string, depth: number = 0) => {
      if (maxDepth !== undefined && depth > maxDepth) {
        return;
      }

      try {
        const entries = fs.readdirSync(dir);

        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const relativePath = path.relative(this.basePath, fullPath);

          if (this.shouldIgnore(relativePath)) {
            continue;
          }

          const stats = fs.statSync(fullPath);

          // Recurse first if directory
          if (stats.isDirectory()) {
            find(fullPath, depth + 1);
          }

          // Filter by type
          if (type === 'f' && !stats.isFile()) continue;
          if (type === 'd' && !stats.isDirectory()) continue;

          // Filter by name
          if (name && !entry.match(new RegExp(name, 'i'))) continue;

          results.push({
            path: relativePath,
            name: entry,
            type: stats.isFile() ? 'file' : 'directory',
            size: stats.size,
            modified: stats.mtime.toISOString(),
          });
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    find(resolvedDir);

    if (results.length === 0) {
      return `No files or directories found matching criteria in ${dirPath}.`;
    }

    return `Found ${results.length} items in ${dirPath}:\n${results.map(r => {
      let line = `- ${r.path}`;
      if (r.name) line += ` (${r.name})`;
      if (r.type) line += ` [${r.type}]`;
      if (r.size !== undefined) line += ` (${r.size} bytes)`;
      if (r.modified) line += ` modified ${new Date(r.modified).toLocaleString()}`;
      return line;
    }).join('\n')}`;
  };

  private handleFindInFiles: ToolHandler = async (_context: any, args: any) => {
    const extensions = args?.extensions || [];
    const dirPath = args?.path || '.';

    if (!extensions || !Array.isArray(extensions) || extensions.length === 0) {
      throw new Error('Extensions array is required');
    }

    const resolvedDir = this.resolvePath(dirPath);

    if (!fs.existsSync(resolvedDir)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const results: string[] = [];

    const find = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir);

        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const relativePath = path.relative(this.basePath, fullPath);

          if (this.shouldIgnore(relativePath)) {
            continue;
          }

          const stats = fs.statSync(fullPath);

          if (stats.isDirectory()) {
            find(fullPath);
          } else if (stats.isFile()) {
            const ext = path.extname(entry).toLowerCase();
            if (extensions.includes(ext) || extensions.includes(ext.substring(1))) {
              results.push(relativePath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    find(resolvedDir);

    if (results.length === 0) {
      return `No files found with extensions ${extensions.join(', ')} in ${dirPath}.`;
    }
    return `Found ${results.length} files with extensions ${extensions.join(', ')} in ${dirPath}:\n${results.join('\n')}`;
  };

  // Get all tool definitions
  getTools(): ToolDefinition[] {
    return [
      {
        name: 'search_files',
        description: 'Search for files by name pattern',
        parameters: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'File name pattern (supports wildcards)',
            },
            path: {
              type: 'string',
              description: 'Directory to search in (default: current directory)',
            },
            recursive: {
              type: 'boolean',
              description: 'Search recursively',
            },
            caseSensitive: {
              type: 'boolean',
              description: 'Case-sensitive search',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results',
            },
          },
          required: [],
        },
        handler: this.handleSearchFiles,
      },
      {
        name: 'search_content',
        description: 'Search for content within files',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (supports regex)',
            },
            path: {
              type: 'string',
              description: 'Directory to search in',
            },
            recursive: {
              type: 'boolean',
              description: 'Search recursively',
            },
            caseSensitive: {
              type: 'boolean',
              description: 'Case-sensitive search',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results',
            },
            includeLineNumbers: {
              type: 'boolean',
              description: 'Include line numbers in results',
            },
            contextLines: {
              type: 'number',
              description: 'Number of context lines to include',
            },
          },
          required: ['query'],
        },
        handler: this.handleSearchContent,
      },
      {
        name: 'grep',
        description: 'Use grep to search for patterns (faster for large projects)',
        parameters: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Grep pattern',
            },
            path: {
              type: 'string',
              description: 'Directory to search in',
            },
            options: {
              type: 'string',
              description: 'Grep options (default: -rn)',
            },
          },
          required: ['pattern'],
        },
        handler: this.handleGrep,
      },
      {
        name: 'find',
        description: 'Find files and directories',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Directory to search in',
            },
            name: {
              type: 'string',
              description: 'Name pattern',
            },
            type: {
              type: 'string',
              enum: ['f', 'd'],
              description: 'Type: f for file, d for directory',
            },
            maxDepth: {
              type: 'number',
              description: 'Maximum search depth',
            },
          },
          required: [],
        },
        handler: this.handleFind,
      },
      {
        name: 'find_by_extension',
        description: 'Find files by extension',
        parameters: {
          type: 'object',
          properties: {
            extensions: {
              type: 'array',
              description: 'Array of file extensions (e.g., [".ts", ".js"])',
              items: { type: 'string' },
            },
            path: {
              type: 'string',
              description: 'Directory to search in',
            },
          },
          required: ['extensions'],
        },
        handler: this.handleFindInFiles,
      },
    ];
  }
}
