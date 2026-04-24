/**
 * Code Tools
 * Tools for code analysis and refactoring
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ToolDefinition, ToolHandler } from '@picro/agent';

export interface CodeToolOptions {
  basePath?: string;
}

export class CodeTools {
  private basePath: string;

  constructor(options: CodeToolOptions = {}) {
    this.basePath = options.basePath || process.cwd();
  }

  private resolvePath(filePath: string): string {
    return path.resolve(this.basePath, filePath);
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'c',
      '.hpp': 'cpp',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.sh': 'shell',
      '.bash': 'shell',
      '.zsh': 'shell',
      '.ps1': 'powershell',
      '.sql': 'sql',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      '.md': 'markdown',
      '.txt': 'text',
    };

    return languageMap[ext] || 'unknown';
  }

  // Tool handlers
  private handleAnalyze: ToolHandler = async (_context: any, args: any) => {
    const filePath = args?.path;

    if (!filePath) {
      throw new Error('File path is required');
    }

    const resolved = this.resolvePath(filePath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(resolved, 'utf-8');
    const language = this.detectLanguage(filePath);
    const lines = content.split('\n');

    // Basic statistics
    const stats = {
      totalLines: lines.length,
      blankLines: lines.filter(l => l.trim() === '').length,
      codeLines: lines.filter(l => l.trim() !== '' && !l.trim().startsWith('//') && !l.trim().startsWith('#')).length,
      commentLines: lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('#')).length,
      characters: content.length,
      bytes: Buffer.byteLength(content, 'utf8'),
    };

    // Detect patterns
    const patterns: any[] = [];

    // Functions
    const functionPatterns: Record<string, RegExp> = {
      typescript: /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|(?:function\s*)?\([^)]*\)))/g,
      javascript: /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|(?:function\s*)?\([^)]*\)))/g,
      python: /def\s+(\w+)/g,
      java: /(?:public|private|protected)?\s*(?:static\s+)?(?:\w+)\s+(\w+)\s*\(/g,
      go: /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/g,
      rust: /fn\s+(\w+)/g,
    };

    const funcPattern = functionPatterns[language] || functionPatterns.javascript;
    let match;
    while ((match = funcPattern.exec(content)) !== null) {
      const name = match[1] || match[2];
      if (name) {
        patterns.push({ type: 'function', name });
      }
    }

    // Classes
    const classPatterns: Record<string, RegExp> = {
      typescript: /class\s+(\w+)/g,
      javascript: /class\s+(\w+)/g,
      python: /class\s+(\w+)/g,
      java: /(?:public\s+)?class\s+(\w+)/g,
      go: /type\s+(\w+)\s+struct/g,
      rust: /(?:pub\s+)?(?:struct|enum)\s+(\w+)/g,
    };

    const classPattern = classPatterns[language];
    if (classPattern) {
      while ((match = classPattern.exec(content)) !== null) {
        patterns.push({ type: 'class', name: match[1] });
      }
    }

    // Imports
    const importPatterns: Record<string, RegExp> = {
      typescript: /import\s+.*?from\s+['"]([^'"]+)['"]/g,
      javascript: /import\s+.*?from\s+['"]([^'"]+)['"]/g,
      python: /import\s+(\w+)|from\s+(\w+)\s+import/g,
      java: /import\s+([^;]+);/g,
      go: /import\s+['"]([^'"]+)['"]/g,
    };

    const importPattern = importPatterns[language];
    const imports: string[] = [];
    if (importPattern) {
      while ((match = importPattern.exec(content)) !== null) {
        imports.push(match[1] || match[2]);
      }
    }

    return JSON.stringify({
      success: true,
      path: filePath,
      language,
      stats,
      patterns: {
        functions: patterns.filter(p => p.type === 'function').length,
        classes: patterns.filter(p => p.type === 'class').length,
        imports: imports.length,
      },
      items: patterns,
      imports: [...new Set(imports)], // Deduplicate
    });
  };

  private handleFindReferences: ToolHandler = async (_context: any, args: any) => {
    const symbol = args?.symbol;
    const dirPath = args?.path || '.';

    if (!symbol) {
      throw new Error('Symbol name is required');
    }

    const resolved = this.resolvePath(dirPath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const results: any[] = [];

    const searchInFile = (filePath: string) => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const regex = new RegExp(`\\b${symbol}\\b`, 'g');

        lines.forEach((line, index) => {
          const matches = line.match(regex);
          if (matches) {
            results.push({
              file: path.relative(this.basePath, filePath),
              line: index + 1,
              text: line.trim(),
              count: matches.length,
            });
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

          if (entry.startsWith('.') || entry === 'node_modules') {
            continue;
          }

          const stats = fs.statSync(fullPath);

          if (stats.isDirectory()) {
            searchDir(fullPath);
          } else if (stats.isFile()) {
            const ext = path.extname(entry).toLowerCase();
            if (['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs'].includes(ext)) {
              searchInFile(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    searchDir(resolved);

    return JSON.stringify({
      success: true,
      symbol,
      path: dirPath,
      results,
      count: results.length,
    });
  };

  private handleExtractFunction: ToolHandler = async (_context: any, args: any) => {
    const filePath = args?.path;
    const startLine = args?.startLine;
    const endLine = args?.endLine;
    const functionName = args?.functionName;

    if (!filePath || !startLine || !endLine || !functionName) {
      throw new Error('path, startLine, endLine, and functionName are required');
    }

    const resolved = this.resolvePath(filePath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(resolved, 'utf-8');
    const lines = content.split('\n');

    if (startLine < 1 || endLine > lines.length || startLine > endLine) {
      throw new Error('Invalid line range');
    }

    // Extract the code to extract
    const extractedCode = lines.slice(startLine - 1, endLine).join('\n');

    // Determine language for proper syntax
    const language = this.detectLanguage(filePath);

    // Generate function code based on language
    let functionCode = '';
    if (['typescript', 'javascript'].includes(language)) {
      functionCode = `function ${functionName}() {\n${extractedCode}\n}`;
    } else if (language === 'python') {
      const indentedCode = extractedCode.split('\n').map(l => '  ' + l).join('\n');
      functionCode = `def ${functionName}():\n${indentedCode}`;
    } else {
      functionCode = `// ${functionName}\n${extractedCode}`;
    }

    // Replace original code with function call
    const newLines = [
      ...lines.slice(0, startLine - 1),
      `${functionName}();`,
      ...lines.slice(endLine),
    ];

    const newContent = newLines.join('\n');

    return JSON.stringify({
      success: true,
      path: filePath,
      language,
      extractedCode,
      functionCode,
      newContent,
      suggestion: `Add this function to your code:\n\n${functionCode}\n\nThen replace lines ${startLine}-${endLine} with:\n${functionName}();`,
    });
  };

  private handleRenameSymbol: ToolHandler = async (_context: any, args: any) => {
    const filePath = args?.path;
    const oldName = args?.oldName;
    const newName = args?.newName;

    if (!filePath || !oldName || !newName) {
      throw new Error('path, oldName, and newName are required');
    }

    const resolved = this.resolvePath(filePath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(resolved, 'utf-8');
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');

    const matches = content.match(regex);
    const newContent = content.replace(regex, newName);

    return JSON.stringify({
      success: true,
      path: filePath,
      oldName,
      newName,
      occurrences: matches ? matches.length : 0,
      newContent,
      suggestion: `Replace all ${matches?.length || 0} occurrences of "${oldName}" with "${newName}"`,
    });
  };

  private handleLint: ToolHandler = async (_context: any, args: any) => {
    const filePath = args?.path;

    if (!filePath) {
      throw new Error('File path is required');
    }

    const resolved = this.resolvePath(filePath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(resolved, 'utf-8');
    const lines = content.split('\n');
    const issues: any[] = [];

    // Basic linting rules
    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for trailing whitespace
      if (line !== line.trimEnd()) {
        issues.push({
          line: lineNum,
          type: 'warning',
          message: 'Trailing whitespace',
          code: line,
        });
      }

      // Check for tabs (prefer spaces)
      if (line.includes('\t')) {
        issues.push({
          line: lineNum,
          type: 'warning',
          message: 'Tab character detected (prefer spaces)',
          code: line,
        });
      }

      // Check for long lines
      if (line.length > 120) {
        issues.push({
          line: lineNum,
          type: 'warning',
          message: `Line too long (${line.length} characters, max 120)`,
          code: line,
        });
      }

      // Check for console.log (should be removed in production)
      if (line.includes('console.log') || line.includes('console.error')) {
        issues.push({
          line: lineNum,
          type: 'warning',
          message: 'Console statement detected (remove in production)',
          code: line,
        });
      }

      // Check for TODO comments
      if (line.toLowerCase().includes('todo')) {
        issues.push({
          line: lineNum,
          type: 'info',
          message: 'TODO comment found',
          code: line,
        });
      }

      // Check for FIXME comments
      if (line.toLowerCase().includes('fixme')) {
        issues.push({
          line: lineNum,
          type: 'error',
          message: 'FIXME comment found',
          code: line,
        });
      }
    });

    return JSON.stringify({
      success: true,
      path: filePath,
      issues,
      summary: {
        total: issues.length,
        errors: issues.filter(i => i.type === 'error').length,
        warnings: issues.filter(i => i.type === 'warning').length,
        info: issues.filter(i => i.type === 'info').length,
      },
    });
  };

  private handleFormat: ToolHandler = async (_context: any, args: any) => {
    const filePath = args?.path;

    if (!filePath) {
      throw new Error('File path is required');
    }

    const resolved = this.resolvePath(filePath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(resolved, 'utf-8');
    const lines = content.split('\n');

    // Basic formatting
    const formattedLines = lines.map(line => {
      // Remove trailing whitespace
      let formatted = line.trimEnd();

      // Replace tabs with 2 spaces
      formatted = formatted.replace(/\t/g, '  ');

      return formatted;
    });

    const formattedContent = formattedLines.join('\n');

    const changes = lines.length !== formattedLines.length ||
                    content !== formattedContent;

    return JSON.stringify({
      success: true,
      path: filePath,
      formatted: formattedContent,
      changes,
      summary: {
        originalLines: lines.length,
        formattedLines: formattedLines.length,
        tabsReplaced: (content.match(/\t/g) || []).length,
        trailingWhitespaceRemoved: lines.filter(l => l !== l.trimEnd()).length,
      },
    });
  };

  // Get all tool definitions
  getTools(): ToolDefinition[] {
    return [
      {
        name: 'code_analyze',
        description: 'Analyze code structure and statistics',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'File path to analyze',
            },
          },
          required: ['path'],
        },
        handler: this.handleAnalyze,
      },
      {
        name: 'code_find_references',
        description: 'Find all references to a symbol',
        parameters: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Symbol name to search for',
            },
            path: {
              type: 'string',
              description: 'Directory to search in',
            },
          },
          required: ['symbol'],
        },
        handler: this.handleFindReferences,
      },
      {
        name: 'code_extract_function',
        description: 'Extract code into a function',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'File path',
            },
            startLine: {
              type: 'number',
              description: 'Start line number (1-indexed)',
            },
            endLine: {
              type: 'number',
              description: 'End line number (1-indexed)',
            },
            functionName: {
              type: 'string',
              description: 'Name for the extracted function',
            },
          },
          required: ['path', 'startLine', 'endLine', 'functionName'],
        },
        handler: this.handleExtractFunction,
      },
      {
        name: 'code_rename_symbol',
        description: 'Rename a symbol throughout a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'File path',
            },
            oldName: {
              type: 'string',
              description: 'Current symbol name',
            },
            newName: {
              type: 'string',
              description: 'New symbol name',
            },
          },
          required: ['path', 'oldName', 'newName'],
        },
        handler: this.handleRenameSymbol,
      },
      {
        name: 'code_lint',
        description: 'Lint code and find issues',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'File path to lint',
            },
          },
          required: ['path'],
        },
        handler: this.handleLint,
      },
      {
        name: 'code_format',
        description: 'Format code according to basic rules',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'File path to format',
            },
          },
          required: ['path'],
        },
        handler: this.handleFormat,
      },
    ];
  }
}
