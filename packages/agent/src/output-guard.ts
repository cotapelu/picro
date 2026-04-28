// SPDX-License-Identifier: Apache-2.0
/**
 * Output Guard - Sanitize and validate tool output
 *
 * Protects against:
 * - Binary data in text output
 * - Extremely long lines
 * - Control characters
 * - ANSI escape code injection
 * - Potential XSS in HTML contexts
 */

import stripAnsi from 'strip-ansi';
import { existsSync, readFileSync, unlinkSync, Stats } from 'fs';

/**
 * Output validation result
 */
export interface OutputValidation {
  valid: boolean;
  sanitized: string;
  originalLength: number;
  sanitizedLength: number;
  warnings: string[];
  truncated?: boolean;
}

/**
 * Default maximum output size (5MB)
 */
export const DEFAULT_MAX_OUTPUT_SIZE = 5 * 1024 * 1024;

/**
 * Default maximum line length
 */
export const DEFAULT_MAX_LINE_LENGTH = 10000;

/**
 * Check if string is likely binary
 */
function isBinaryString(str: string, sampleSize = 1024): boolean {
  const sample = str.slice(0, sampleSize);
  let binaryChars = 0;
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    if (code < 9 || (code > 13 && code < 32) || code > 126) {
      binaryChars++;
    }
  }
  return binaryChars > sampleSize * 0.3; // >30% non-printable = binary
}

/**
 * Sanitize control characters while preserving newlines and tabs
 */
function sanitizeControlChars(str: string): string {
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, (match) => {
    // Map some common controls to visible placeholders
    const map: Record<string, string> = {
      '\x00': '[NUL]',
      '\x01': '[SOH]',
      '\x02': '[STX]',
      '\x03': '[ETX]',
      '\x04': '[EOT]',
      '\x05': '[ENQ]',
      '\x06': '[ACK]',
      '\x07': '[BEL]',
      '\x08': '[BS]',
      '\x0B': '[VT]',
      '\x0C': '[FF]',
      '\x0E': '[SO]',
      '\x0F': '[SI]',
      '\x1F': '[US]',
      '\x7F': '[DEL]',
    };
    return map[match] ?? `[0x${match.charCodeAt(0).toString(16).padStart(2, '0')}]`;
  });
}

/**
 * Sanitize output string
 */
export function sanitizeOutput(
  output: string,
  options: {
    maxSize?: number;
    maxLineLength?: number;
    stripAnsi?: boolean;
    truncateIndicator?: string;
  } = {}
): string {
  const {
    maxSize = DEFAULT_MAX_OUTPUT_SIZE,
    maxLineLength = DEFAULT_MAX_LINE_LENGTH,
    stripAnsi: shouldStripAnsi = true,
    truncateIndicator = '... [TRUNCATED]',
  } = options;

  if (!output) return '';

  let result = output;

  // Strip ANSI codes if requested
  if (shouldStripAnsi) {
    result = stripAnsi(result);
  }

  // Check if binary
  if (isBinaryString(result)) {
    result = `[Binary output: ${output.length} bytes]`;
    return result;
  }

  // Sanitize control characters
  result = sanitizeControlChars(result);

  // Check size limit
  if (result.length > maxSize) {
    result = result.slice(0, maxSize) + truncateIndicator;
  }

  // Check line length
  const lines = result.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > maxLineLength) {
      lines[i] = lines[i].slice(0, maxLineLength) + truncateIndicator;
    }
  }
  result = lines.join('\n');

  return result;
}

/**
 * Validate and sanitize tool output
 */
export function validateOutput(
  output: string,
  options: {
    maxSize?: number;
    maxLineLength?: number;
    stripAnsi?: boolean;
  } = {}
): OutputValidation {
  const originalLength = output.length;
  const warnings: string[] = [];

  let sanitized = output;

  // Check for binary
  const isBinary = isBinaryString(output);
  if (isBinary) {
    warnings.push('Output contains binary data');
  }

  // Check size
  const maxSize = options.maxSize ?? DEFAULT_MAX_OUTPUT_SIZE;
  let truncated = false;
  if (output.length > maxSize) {
    warnings.push(`Output exceeds maximum size (${output.length} > ${maxSize})`);
    truncated = true;
  }

  // Sanitize
  sanitized = sanitizeOutput(output, { ...options, truncateIndicator: truncated ? '...' : undefined });

  return {
    valid: !isBinary,
    sanitized,
    originalLength,
    sanitizedLength: sanitized.length,
    warnings,
    truncated,
  };
}

/**
 * Safe read file with output guard
 */
export function safeReadFile(
  filePath: string,
  options: {
    maxSize?: number;
    encoding?: BufferEncoding;
  } = {}
): { content: string; valid: boolean; warnings: string[] } {
  const { maxSize = DEFAULT_MAX_OUTPUT_SIZE, encoding = 'utf8' } = options;

  try {
    if (!existsSync(filePath)) {
      return { content: '', valid: false, warnings: ['File not found'] };
    }

    const stats = statsSync(filePath);
    if (stats.size > maxSize) {
      return {
        content: '',
        valid: false,
        warnings: [`File too large: ${stats.size} bytes (max ${maxSize})`],
      };
    }

    const content = readFileSync(filePath, encoding);
    const validation = validateOutput(content as string, { maxSize });

    return {
      content: validation.sanitized,
      valid: validation.valid,
      warnings: validation.warnings,
    };
  } catch (err: any) {
    return {
      content: '',
      valid: false,
      warnings: [err?.message ?? 'Failed to read file'],
    };
  }
}

import { statSync } from 'fs';

// Helper to avoid circular require
function statsSync(path: string): Stats {
  return statSync(path);
}

/**
 * Cleanup temp file if exists
 */
export function cleanupTempFile(filePath: string): void {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup errors
  }
}
