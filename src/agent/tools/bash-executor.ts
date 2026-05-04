// SPDX-License-Identifier: Apache-2.0
/**
 * Bash Command Executor with Streaming, Cancellation, and Output Guard
 *
 * Provides reliable bash execution with:
 * - Streaming output via onChunk callback
 * - AbortSignal cancellation
 * - Automatic truncation for large outputs
 * - Full output backup to temp file when truncated
 * - Binary output sanitization
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { EventEmitter } from '../event-emitter';

const DEFAULT_MAX_BYTES = 1024 * 1024; // 1MB
const DEFAULT_MAX_LINES = 10000;

/**
 * Options for bash execution
 */
export interface BashExecutorOptions {
  /** Callback for streaming output chunks (already sanitized) */
  onChunk?: (chunk: string) => void;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Working directory (default: process.cwd()) */
  cwd?: string;
  /** Timeout in milliseconds (0 = no timeout) */
  timeout?: number;
  /** Environment variables */
  env?: Record<string, string>;
  /** Maximum output bytes before truncation (default: 1MB) */
  maxBytes?: number;
  /** Maximum output lines before truncation (default: 10000) */
  maxLines?: number;
}

/**
 * Result of bash execution
 */
export interface BashResult {
  /** Combined stdout + stderr output (sanitized, possibly truncated) */
  output: string;
  /** Separate stderr output (if any) */
  stderr?: string;
  /** Process exit code (undefined if killed/cancelled) */
  exitCode: number | undefined;
  /** Whether the command was cancelled via signal */
  cancelled: boolean;
  /** Whether the output was truncated */
  truncated: boolean;
  /** Path to temp file containing full output (if output exceeded truncation threshold) */
  fullOutputPath?: string;
}

/**
 * Sanitize binary output - replace non-UTF8 sequences with placeholders
 */
function sanitizeOutput(data: Buffer): string {
  try {
    // Try to decode as UTF-8
    const text = data.toString('utf8');
    // Check for common binary patterns
    if (text.includes('\x00') || text.includes('\x1b[?') && text.length > 100) {
      // Might be binary, replace non-printable
      return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '?');
    }
    return text;
  } catch {
    // Binary data, return placeholder
    return `[Binary output: ${data.length} bytes]`;
  }
}

/**
 * Execute a bash command with streaming and cancellation support.
 *
 * @param command - The bash command to execute
 * @param options - Execution options
 * @returns Promise<BashResult> with execution result
 */
export async function executeBash(
  command: string,
  options: BashExecutorOptions = {}
): Promise<BashResult> {
  const {
    onChunk,
    signal,
    cwd = process.cwd(),
    timeout = 0,
    env = process.env,
    maxBytes = DEFAULT_MAX_BYTES,
    maxLines = DEFAULT_MAX_LINES,
  } = options;

  const outputChunks: string[] = [];
  let totalBytes = 0;
  let totalLines = 0;
  let stderrString = '';
  let truncated = false;
  let tempFilePath: string | undefined;
  let tempFileStream: { write: (data: string) => void; end: () => void } | undefined;

  const ensureTempFile = () => {
    if (tempFilePath) return;
    const id = Math.random().toString(36).slice(2, 10);
    tempFilePath = join(tmpdir(), `pi-bash-${id}-${Date.now()}.log`);
    tempFileStream = {
      write: (data: string) => {
        try {
          writeFileSync(tempFilePath!, data, { flag: 'a' });
        } catch {}
      },
      end: () => {},
    };
    // Write existing chunks
    for (const chunk of outputChunks) {
      tempFileStream!.write(chunk);
    }
  };

  const spawnChild = () => {
    const [shell, ...args] = process.platform === 'win32'
      ? ['cmd.exe', '/c', command]
      : ['bash', '-c', command];

    const child = spawn(shell, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => {
      const chunk = sanitizeOutput(data);
      stdout += chunk;
      outputChunks.push(chunk);
      totalBytes += data.length;
      totalLines += chunk.split('\n').length - 1;
      onChunk?.(chunk);
      if (tempFileStream) {
        tempFileStream.write(chunk);
      }
      // Check truncation
      if (totalBytes > maxBytes || totalLines > maxLines) {
        truncated = true;
        ensureTempFile();
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      const chunk = sanitizeOutput(data);
      stderrString += chunk;
      outputChunks.push(chunk);
      totalBytes += data.length;
      totalLines += chunk.split('\n').length - 1;
      onChunk?.(chunk);
      if (tempFileStream) {
        tempFileStream.write(chunk);
      }
      if (totalBytes > maxBytes || totalLines > maxLines) {
        truncated = true;
        ensureTempFile();
      }
    });

    return child;
  };

  let child = spawnChild();
  let timeoutId: any;
  let exited = false;
  let exitCode: number | undefined;

  // Handle timeout
  if (timeout > 0) {
    timeoutId = setTimeout(() => {
      if (!exited) {
        // Try to kill entire process tree (Unix)
        if (child.pid) {
          try { process.kill(-child.pid, 'SIGTERM'); } catch {}
        }
        child.kill('SIGTERM');
      }
    }, timeout);
  }

  // Handle abort signal
  if (signal) {
    signal.addEventListener('abort', () => {
      if (!exited) {
        if (child.pid) {
          try { process.kill(-child.pid, 'SIGTERM'); } catch {}
        }
        child.kill('SIGTERM');
      }
    });
  }

  // Wait for exit
  await new Promise<void>((resolve, reject) => {
    child.on('close', (code) => {
      exited = true;
      exitCode = code ?? undefined;
      if (timeoutId) clearTimeout(timeoutId as any);
      tempFileStream?.end();
      resolve();
    });
    child.on('error', (err) => {
      if (timeoutId) clearTimeout(timeoutId as any);
      reject(err);
    });
  });

  const output = outputChunks.join('');

  // If truncated, keep temp file path
  if (truncated && tempFilePath) {
    // Trim output to max size/lines
    const lines = output.split('\n');
    const truncatedLines = lines.slice(0, maxLines);
    const truncatedOutput = truncatedLines.join('\n');
    return {
      output: truncatedOutput,
      stderr: stderrString,
      exitCode,
      cancelled: false,
      truncated: true,
      fullOutputPath: existsSync(tempFilePath) ? tempFilePath : undefined,
    };
  }

  // Cleanup temp file if not needed
  if (tempFilePath && existsSync(tempFilePath)) {
    try {
      unlinkSync(tempFilePath);
    } catch {}
  }

  return {
    output,
    stderr: stderrString,
    exitCode,
    cancelled: false,
    truncated: false,
  };
}

/**
 * Convenience wrapper using local system bash.
 * Similar signature to tui-agent's executeBashWithOperations but simpler.
 */
export async function executeBashLocal(
  command: string,
  cwd?: string,
  options: BashExecutorOptions = {}
): Promise<BashResult> {
  return executeBash(command, { ...options, cwd });
}
