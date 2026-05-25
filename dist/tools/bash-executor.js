"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeBash = executeBash;
exports.executeBashLocal = executeBashLocal;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const DEFAULT_MAX_BYTES = 1024 * 1024; // 1MB
const DEFAULT_MAX_LINES = 10000;
/**
 * Sanitize binary output - replace non-UTF8 sequences with placeholders
 */
function sanitizeOutput(data) {
    try {
        // Try to decode as UTF-8
        const text = data.toString('utf8');
        // Check for common binary patterns
        if (text.includes('\x00') || text.includes('\x1b[?') && text.length > 100) {
            // Might be binary, replace non-printable
            return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '?');
        }
        return text;
    }
    catch {
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
async function executeBash(command, options = {}) {
    const { onChunk, signal, cwd = process.cwd(), timeout = 0, env = process.env, maxBytes = DEFAULT_MAX_BYTES, maxLines = DEFAULT_MAX_LINES, } = options;
    const outputChunks = [];
    let totalBytes = 0;
    let totalLines = 0;
    let stderrString = '';
    let truncated = false;
    let tempFilePath;
    let tempFileStream;
    const ensureTempFile = () => {
        if (tempFilePath)
            return;
        const id = Math.random().toString(36).slice(2, 10);
        tempFilePath = (0, path_1.join)((0, os_1.tmpdir)(), `pi-bash-${id}-${Date.now()}.log`);
        tempFileStream = {
            write: (data) => {
                try {
                    (0, fs_1.writeFileSync)(tempFilePath, data, { flag: 'a' });
                }
                catch { }
            },
            end: () => { },
        };
        // Write existing chunks
        for (const chunk of outputChunks) {
            tempFileStream.write(chunk);
        }
    };
    const spawnChild = () => {
        const [shell, ...args] = process.platform === 'win32'
            ? ['cmd.exe', '/c', command]
            : ['bash', '-c', command];
        const child = (0, child_process_1.spawn)(shell, args, {
            cwd,
            env,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', (data) => {
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
        child.stderr?.on('data', (data) => {
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
    let timeoutId;
    let exited = false;
    let exitCode;
    // Handle timeout
    if (timeout > 0) {
        timeoutId = setTimeout(() => {
            if (!exited) {
                // Try to kill entire process tree (Unix)
                if (child.pid) {
                    try {
                        process.kill(-child.pid, 'SIGTERM');
                    }
                    catch { }
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
                    try {
                        process.kill(-child.pid, 'SIGTERM');
                    }
                    catch { }
                }
                child.kill('SIGTERM');
            }
        });
    }
    // Wait for exit
    await new Promise((resolve, reject) => {
        child.on('close', (code) => {
            exited = true;
            exitCode = code ?? undefined;
            if (timeoutId)
                clearTimeout(timeoutId);
            tempFileStream?.end();
            resolve();
        });
        child.on('error', (err) => {
            if (timeoutId)
                clearTimeout(timeoutId);
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
            fullOutputPath: (0, fs_1.existsSync)(tempFilePath) ? tempFilePath : undefined,
        };
    }
    // Cleanup temp file if not needed
    if (tempFilePath && (0, fs_1.existsSync)(tempFilePath)) {
        try {
            (0, fs_1.unlinkSync)(tempFilePath);
        }
        catch { }
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
async function executeBashLocal(command, cwd, options = {}) {
    return executeBash(command, { ...options, cwd });
}
//# sourceMappingURL=bash-executor.js.map