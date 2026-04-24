/**
 * File Tools
 * Tools for file operations: read, write, edit, delete
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ToolDefinition, ToolHandler } from '@picro/agent';
import { toolResult, toolError } from './tool-helper.js';

export interface FileToolOptions {
  basePath?: string;
  allowedPaths?: string[];
  maxSize?: number;
}

export class FileTools {
  private basePath: string;
  private allowedPaths: string[];
  private maxSize: number;
  private fileCache: Map<string, { content: string; mtime: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(options: FileToolOptions = {}) {
    this.basePath = options.basePath || process.cwd();
    this.allowedPaths = options.allowedPaths || [this.basePath];
    this.maxSize = options.maxSize || 1024 * 1024; // 1MB default
  }

  private resolvePath(filePath: string): string {
    return path.resolve(this.basePath, filePath);
  }

  private async readFileWithCache(resolved: string): Promise<string> {
    const now = Date.now();
    const cached = this.fileCache.get(resolved);
    
    if (cached) {
      try {
        const stat = await fs.promises.stat(resolved);
        if (stat.mtime.getTime() === cached.mtime && (now - cached.timestamp) < this.CACHE_TTL) {
          return cached.content; // Cache hit
        }
      } catch {
        // File might have been deleted, ignore cache
      }
    }
    
    // Cache miss or stale - read from disk
    const content = await fs.promises.readFile(resolved, 'utf-8');
    const stat = await fs.promises.stat(resolved);
    this.fileCache.set(resolved, {
      content,
      mtime: stat.mtime.getTime(),
      timestamp: now,
    });
    return content;
  }

  private validatePath(filePath: string): void {
    const resolved = this.resolvePath(filePath);
    
    // Resolve symlinks to get canonical path
    let canonicalPath: string;
    try {
      canonicalPath = fs.realpathSync(resolved);
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        // File might not exist yet (for write), check parent directory
        const parent = path.dirname(resolved);
        try {
          const parentCanonical = fs.realpathSync(parent);
          canonicalPath = path.join(parentCanonical, path.basename(resolved));
        } catch {
          throw new Error(`Invalid path: ${filePath}`);
        }
      } else {
        throw e;
      }
    }
    
    // Check if canonical path is within allowed paths (also canonicalized)
    const isAllowed = this.allowedPaths.some(allowedPath => {
      const allowedAbs = path.resolve(allowedPath);
      try {
        const allowedCanonical = fs.realpathSync(allowedAbs);
        return canonicalPath.startsWith(allowedCanonical + path.sep) || canonicalPath === allowedCanonical;
      } catch {
        // If allowed path doesn't exist yet, fall back to simple prefix check
        return canonicalPath.startsWith(allowedAbs + path.sep) || canonicalPath === allowedAbs;
      }
    });
    
    if (!isAllowed) {
      throw new Error(`Path not allowed: ${filePath}`);
    }
  }

  private validateSize(content: string): void {
    if (content.length > this.maxSize) {
      throw new Error(`Content too large: ${content.length} bytes (max: ${this.maxSize})`);
    }
  }

  // Tool handlers
  private handleRead: ToolHandler = async (_context: any, args: any) => {
    const filePath = args?.path;
    if (!filePath) {
      throw new Error('File path is required. Provide a path like "./src/index.ts"');
    }

    this.validatePath(filePath);
    const resolved = this.resolvePath(filePath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: ${filePath}. Use file_exists to verify the path.`);
    }

    if (!fs.statSync(resolved).isFile()) {
      throw new Error(`Not a file: ${filePath}`);
    }

    const content = await this.readFileWithCache(resolved);
    this.validateSize(content);

    return toolResult({
      success: true,
      path: filePath,
      content,
      size: content.length,
      encoding: 'utf-8',
    });
  };

  private handleWrite: ToolHandler = async (_context: any, args: any) => {
    const filePath = args?.path;
    const content = args?.content;

    if (!filePath) {
      throw new Error('File path is required. Provide a path like "./output.txt"');
    }

    if (content === undefined || content === null) {
      throw new Error('Content is required. Provide a string to write.');
    }

    this.validatePath(filePath);
    this.validateSize(content);

    const resolved = this.resolvePath(filePath);

    // Create directory if it doesn't exist
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(resolved, content, 'utf-8');

    return toolResult({
      success: true,
      path: filePath,
      size: content.length,
      action: 'created',
    });
  };

  private handleEdit: ToolHandler = async (_context: any, args: any) => {
    const filePath = args?.path;
    const edits = args?.edits;

    if (!filePath) {
      throw new Error('File path is required. Provide a path like "./config.json"');
    }

    if (!edits || !Array.isArray(edits) || edits.length === 0) {
      throw new Error('Edits array is required. Provide an array of {oldText, newText} objects.');
    }

    this.validatePath(filePath);
    const resolved = this.resolvePath(filePath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: ${filePath}`);
    }

    let content = await this.readFileWithCache(resolved);
    const appliedEdits: any[] = [];

    for (const edit of edits) {
      const { oldText, newText } = edit;

      if (!oldText || !newText) {
        throw new Error('Each edit must have oldText and newText');
      }

      if (!content.includes(oldText)) {
        throw new Error(`Old text not found in file: ${oldText.substring(0, 50)}...`);
      }

      content = content.replace(oldText, newText);
      appliedEdits.push({
        oldText: oldText.substring(0, 50) + '...',
        newText: newText.substring(0, 50) + '...',
      });
    }

    this.validateSize(content);
    fs.writeFileSync(resolved, content, 'utf-8');
    // Invalidate cache after write
    this.fileCache.delete(resolved);

    return toolResult({
      success: true,
      path: filePath,
      editsApplied: appliedEdits.length,
      edits: appliedEdits,
      newSize: content.length,
    });
  };

  private handleDelete: ToolHandler = async (_context: any, args: any) => {
    const filePath = args?.path;
    const confirm = args?.confirm;

    if (!filePath) {
      throw new Error('File path is required. Provide a path like "./oldfile.txt"');
    }

    if (!confirm) {
      throw new Error('Confirmation required. Set confirm=true to delete. This action cannot be undone.');
    }

    this.validatePath(filePath);
    const resolved = this.resolvePath(filePath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(resolved);
    fs.unlinkSync(resolved);

    return toolResult({
      success: true,
      path: filePath,
      action: 'deleted',
      wasFile: stats.isFile(),
      wasDirectory: stats.isDirectory(),
    });
  };

  private handleList: ToolHandler = async (_context: any, args: any) => {
    const dirPath = args?.path || '.';
    const recursive = args?.recursive || false;
    const pattern = args?.pattern;

    this.validatePath(dirPath);
    const resolved = this.resolvePath(dirPath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`Directory not found: ${dirPath}. Check the path and try again.`);
    }

    if (!fs.statSync(resolved).isDirectory()) {
      throw new Error(`Not a directory: ${dirPath}`);
    }

    const items: any[] = [];

    const scanDir = (dir: string, base: string = '') => {
      const entries = fs.readdirSync(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relativePath = path.join(base, entry);
        const stats = fs.statSync(fullPath);

        // Apply pattern filter if specified
        if (pattern && !entry.match(new RegExp(pattern, 'i'))) {
          continue;
        }

        items.push({
          name: entry,
          path: relativePath,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime.toISOString(),
        });

        // Recurse if needed
        if (recursive && stats.isDirectory() && !entry.startsWith('.')) {
          scanDir(fullPath, relativePath);
        }
      }
    };

    scanDir(resolved);

    return toolResult({
      success: true,
      path: dirPath,
      items,
      count: items.length,
    });
  };

  private handleExists: ToolHandler = async (_context: any, args: any) => {
    const filePath = args?.path;

    if (!filePath) {
      throw new Error('File path is required. Provide a path to check.');
    }

    this.validatePath(filePath);
    const resolved = this.resolvePath(filePath);

    const exists = fs.existsSync(resolved);
    let stats: any = null;

    if (exists) {
      const s = fs.statSync(resolved);
      stats = {
        isFile: s.isFile(),
        isDirectory: s.isDirectory(),
        size: s.size,
        modified: s.mtime.toISOString(),
      };
    }

    return toolResult({
      success: true,
      path: filePath,
      exists,
      stats,
    });
  };

  // Get all tool definitions
  getTools(): ToolDefinition[] {
    return [
      {
        name: 'file_read',
        description: 'Read the contents of a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to read',
            },
          },
          required: ['path'],
        },
        handler: this.handleRead,
      },
      {
        name: 'file_write',
        description: 'Write content to a file (creates or overwrites)',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to write',
            },
            content: {
              type: 'string',
              description: 'Content to write to the file',
            },
          },
          required: ['path', 'content'],
        },
        handler: this.handleWrite,
      },
      {
        name: 'file_edit',
        description: 'Edit a file by replacing specific text',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to edit',
            },
            edits: {
              type: 'array',
              description: 'Array of edits to apply',
              items: {
                type: 'object',
                properties: {
                  oldText: {
                    type: 'string',
                    description: 'Text to replace',
                  },
                  newText: {
                    type: 'string',
                    description: 'Replacement text',
                  },
                },
                required: ['oldText', 'newText'],
              },
            },
          },
          required: ['path', 'edits'],
        },
        handler: this.handleEdit,
      },
      {
        name: 'file_delete',
        description: 'Delete a file or directory',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file or directory to delete',
            },
            confirm: {
              type: 'boolean',
              description: 'Set to true to confirm deletion',
            },
          },
          required: ['path', 'confirm'],
        },
        handler: this.handleDelete,
      },
      {
        name: 'file_list',
        description: 'List files and directories',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the directory to list (default: current directory)',
            },
            recursive: {
              type: 'boolean',
              description: 'List files recursively',
            },
            pattern: {
              type: 'string',
              description: 'Filter pattern (regex)',
            },
          },
          required: [],
        },
        handler: this.handleList,
      },
      {
        name: 'file_exists',
        description: 'Check if a file or directory exists',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to check',
            },
          },
          required: ['path'],
        },
        handler: this.handleExists,
      },
    ];
  }
}
