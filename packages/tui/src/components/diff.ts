/**
 * Diff Component
 * Renders git diff output with syntax highlighting
 */
import type { UIElement, RenderContext } from '../tui.js';
import { visibleWidth, stripAnsi } from '../utils.js';

// Diff line types
export type DiffLineType = 'added' | 'removed' | 'context' | 'header' | 'hunk';

export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

export interface DiffTheme {
  /** Header lines (file paths, mode changes) */
  headerColor: (s: string) => string;
  /** Hunk info lines (@@ lines) */
  hunkColor: (s: string) => string;
  /** Added lines */
  addedColor: (s: string) => string;
  /** Removed lines */
  removedColor: (s: string) => string;
  /** Context lines (unchanged) */
  contextColor: (s: string) => string;
  /** Inverse highlight for intra-line diffs */
  inverseColor: (s: string) => string;
}

export interface DiffOptions {
  /** Diff text content */
  diffText: string;
  /** Theme styling */
  theme?: Partial<DiffTheme>;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Max width for content (auto-wrap if exceeded) */
  maxWidth?: number;
  /** Enable intra-line diff highlighting */
  intraLineDiff?: boolean;
}

// Default theme
const defaultTheme: DiffTheme = {
  headerColor: (s) => `\x1b[1;35m${s}\x1b[0m`,      // Bold magenta
  hunkColor: (s) => `\x1b[36m${s}\x1b[0m`,           // Cyan
  addedColor: (s) => `\x1b[32m${s}\x1b[0m`,          // Green
  removedColor: (s) => `\x1b[31m${s}\x1b[0m`,        // Red
  contextColor: (s) => `\x1b[90m${s}\x1b[0m`,        // Dim gray
  inverseColor: (s) => `\x1b[7m${s}\x1b[0m`,         // Inverse video
};

/**
 * Parse a diff line
 */
function parseDiffLine(line: string): { type: DiffLineType; content: string; oldNum?: number; newNum?: number } | null {
  // Header lines
  if (line.startsWith('diff --git') || line.startsWith('index ') || 
      line.startsWith('--- ') || line.startsWith('+++ ') ||
      line.startsWith('Binary') || line.startsWith('new file') ||
      line.startsWith('deleted file') || line.startsWith('rename')) {
    return { type: 'header', content: line };
  }

  // Hunk header @@ -old,oldCount +new,newCount @@
  const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/);
  if (hunkMatch) {
    return { 
      type: 'hunk', 
      content: line,
      oldNum: parseInt(hunkMatch[1], 10),
      newNum: parseInt(hunkMatch[2], 10),
    };
  }

  // Added line
  if (line.startsWith('+')) {
    return { type: 'added', content: line.slice(1) };
  }

  // Removed line
  if (line.startsWith('-')) {
    return { type: 'removed', content: line.slice(1) };
  }

  // Context line (space)
  if (line.startsWith(' ') || line === '') {
    return { type: 'context', content: line.startsWith(' ') ? line.slice(1) : line };
  }

  return { type: 'context', content: line };
}

/**
 * Simple word-level diff for intra-line highlighting
 */
function wordDiff(oldLine: string, newLine: string): { old: string; new: string } {
  const oldWords = oldLine.split(/(\s+)/).filter(Boolean);
  const newWords = newLine.split(/(\s+)/).filter(Boolean);
  
  let oldResult = '';
  let newResult = '';
  let i = 0;
  let j = 0;

  while (i < oldWords.length || j < newWords.length) {
    const oldWord = oldWords[i];
    const newWord = newWords[j];

    if (oldWord === newWord) {
      oldResult += oldWord;
      newResult += newWord;
      i++;
      j++;
    } else {
      // Find next matching word
      let matchFound = false;
      let lookAhead = 1;
      
      while (!matchFound && (i + lookAhead < oldWords.length || j + lookAhead < newWords.length)) {
        const futureOld = oldWords.slice(i + lookAhead, i + lookAhead + 3);
        const futureNew = newWords.slice(j + lookAhead, j + lookAhead + 3);
        
        if (futureOld.join('') === futureNew.join('')) {
          matchFound = true;
          break;
        }
        lookAhead++;
      }

      // Mark differences
      for (let k = 0; k < lookAhead && i < oldWords.length; k++) {
        oldResult += `{inverse}${oldWords[i]}{/inverse}`;
        i++;
      }
      for (let k = 0; k < lookAhead && j < newWords.length; k++) {
        newResult += `{inverse}${newWords[j]}{/inverse}`;
        j++;
      }
    }
  }

  return { old: oldResult, new: newResult };
}

/**
 * Replace tabs with spaces
 */
function replaceTabs(text: string, tabSize = 4): string {
  return text.replace(/\t/g, ' '.repeat(tabSize));
}

/**
 * Diff component - renders git diff with syntax highlighting
 * 
 * @example
 * const diff = new Diff({
 *   diffText: diffOutput,
 *   theme: {
 *     addedColor: (s) => `\x1b[42m${s}\x1b[0m`,
 *     removedColor: (s) => `\x1b[41m${s}\x1b[0m`,
 *   },
 *   showLineNumbers: true,
 *   intraLineDiff: true,
 * });
 */
export class Diff implements UIElement {
  private diffText: string;
  private theme: DiffTheme;
  private showLineNumbers: boolean;
  private intraLineDiff: boolean;
  private cachedLines?: string[];
  private cachedWidth?: number;

  constructor(options: DiffOptions) {
    this.diffText = options.diffText;
    this.theme = { ...defaultTheme, ...options.theme };
    this.showLineNumbers = options.showLineNumbers ?? true;
    this.intraLineDiff = options.intraLineDiff ?? false;
  }

  /**
   * Update diff content
   */
  setDiffText(text: string): void {
    this.diffText = text;
    this.clearCache();
  }

  /**
   * Get current diff text
   */
  getDiffText(): string {
    return this.diffText;
  }

  clearCache(): void {
    this.cachedLines = undefined;
    this.cachedWidth = undefined;
  }

  draw(context: RenderContext): string[] {
    // Use cache if available
    if (this.cachedLines && this.cachedWidth === context.width) {
      return this.cachedLines;
    }

    const lines: string[] = [];
    const rawLines = this.diffText.split('\n');
    
    let oldLineNum = 0;
    let newLineNum = 0;
    
    // For collecting intra-line diff pairs
    let removedBuffer: { content: string; lineNum: number } | null = null;

    for (const rawLine of rawLines) {
      const parsed = parseDiffLine(rawLine);
      if (!parsed) {
        lines.push(this.theme.contextColor(rawLine));
        continue;
      }

      switch (parsed.type) {
        case 'header':
          lines.push(this.theme.headerColor(rawLine));
          break;
          
        case 'hunk':
          lines.push(this.theme.hunkColor(rawLine));
          if (parsed.oldNum) oldLineNum = parsed.oldNum;
          if (parsed.newNum) newLineNum = parsed.newNum;
          break;
          
        case 'removed':
          if (this.intraLineDiff) {
            if (removedBuffer) {
              // Two consecutive removes - show first
              lines.push(this.formatLine('removed', removedBuffer.content, removedBuffer.lineNum, null));
            }
            removedBuffer = { content: parsed.content, lineNum: oldLineNum };
          } else {
            lines.push(this.formatLine('removed', parsed.content, oldLineNum, null));
          }
          oldLineNum++;
          break;
          
        case 'added':
          if (this.intraLineDiff && removedBuffer) {
            // Do intra-line diff
            const { old, new: newChanged } = wordDiff(
              replaceTabs(removedBuffer.content),
              replaceTabs(parsed.content)
            );
            const styledOld = old.replace(/{inverse}(.*?){\/inverse}/g, (_, m) => this.theme.inverseColor(m));
            const styledNew = newChanged.replace(/{inverse}(.*?){\/inverse}/g, (_, m) => this.theme.inverseColor(m));
            
            lines.push(this.formatLineIntra('removed', styledOld, removedBuffer.lineNum, null));
            lines.push(this.formatLineIntra('added', styledNew, null, newLineNum));
            removedBuffer = null;
          } else {
            lines.push(this.formatLine('added', parsed.content, null, newLineNum));
          }
          newLineNum++;
          break;
          
        case 'context':
          // Flush any pending removed buffer
          if (removedBuffer) {
            lines.push(this.formatLine('removed', removedBuffer.content, removedBuffer.lineNum, null));
            removedBuffer = null;
          }
          lines.push(this.formatLine('context', parsed.content, oldLineNum, newLineNum));
          oldLineNum++;
          newLineNum++;
          break;
      }
    }

    // Flush remaining buffer
    if (removedBuffer) {
      lines.push(this.formatLine('removed', removedBuffer.content, removedBuffer.lineNum, null));
    }

    this.cachedLines = lines;
    this.cachedWidth = context.width;
    return lines;
  }

  /**
   * Format a diff line with line numbers
   */
  private formatLine(type: DiffLineType, content: string, oldNum: number | null, newNum: number | null): string {
    const lineNumWidth = 6;
    let prefix = '';
    let styled: string;
    
    if (this.showLineNumbers) {
      const oldStr = oldNum !== null ? oldNum.toString().padStart(lineNumWidth) : ' '.repeat(lineNumWidth);
      const newStr = newNum !== null ? newNum.toString().padStart(lineNumWidth) : ' '.repeat(lineNumWidth);
      prefix = `${oldStr} ${newStr} `;
    }
    
    switch (type) {
      case 'added':
        styled = this.theme.addedColor(content);
        break;
      case 'removed':
        styled = this.theme.removedColor(content);
        break;
      case 'context':
        styled = this.theme.contextColor(content);
        break;
      default:
        styled = content;
    }
    
    return prefix + styled;
  }

  /**
   * Format intra-line diff (already styled)
   */
  private formatLineIntra(type: DiffLineType, content: string, oldNum: number | null, newNum: number | null): string {
    const lineNumWidth = 6;
    let prefix = '';
    let styled: string;
    
    if (this.showLineNumbers) {
      const oldStr = oldNum !== null ? oldNum.toString().padStart(lineNumWidth) : ' '.repeat(lineNumWidth);
      const newStr = newNum !== null ? newNum.toString().padStart(lineNumWidth) : ' '.repeat(lineNumWidth);
      prefix = `${oldStr} ${newStr} `;
    }
    
    switch (type) {
      case 'added':
        styled = this.theme.addedColor(content);
        break;
      case 'removed':
        styled = this.theme.removedColor(content);
        break;
      default:
        styled = content;
    }
    
    return prefix + styled;
  }
}

/**
 * Utility to render diff string to terminal
 * Simple standalone function for basic diff rendering
 */
export function renderDiff(diffText: string, theme?: Partial<DiffTheme>): string[] {
  const d = new Diff({ diffText, theme });
  return d.draw({ width: 120, height: 40 });
}
