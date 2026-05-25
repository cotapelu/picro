"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Shell utilities for cross-platform command execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShellConfig = getShellConfig;
exports.getShellEnv = getShellEnv;
exports.sanitizeBinaryOutput = sanitizeBinaryOutput;
exports.trackDetachedChildPid = trackDetachedChildPid;
exports.untrackDetachedChildPid = untrackDetachedChildPid;
exports.killProcessTree = killProcessTree;
exports.killTrackedDetachedChildren = killTrackedDetachedChildren;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
/**
 * Find bash executable on PATH (cross-platform)
 */
function findBashOnPath() {
    if (process.platform === 'win32') {
        try {
            const result = (0, child_process_1.spawnSync)('where', ['bash.exe'], { encoding: 'utf-8', timeout: 5000 });
            if (result.status === 0 && result.stdout) {
                const firstMatch = result.stdout.trim().split(/\r?\n/)[0];
                if (firstMatch && (0, fs_1.existsSync)(firstMatch)) {
                    return firstMatch;
                }
            }
        }
        catch { }
        return null;
    }
    // Unix: Use 'which' and trust its output
    try {
        const result = (0, child_process_1.spawnSync)('which', ['bash'], { encoding: 'utf-8', timeout: 5000 });
        if (result.status === 0 && result.stdout) {
            const firstMatch = result.stdout.trim().split(/\r?\n/)[0];
            if (firstMatch) {
                return firstMatch;
            }
        }
    }
    catch { }
    return null;
}
/**
 * Resolve shell configuration based on platform and optional custom shell path.
 */
function getShellConfig(customShellPath) {
    // 1. Check user-specified shell path
    if (customShellPath) {
        if ((0, fs_1.existsSync)(customShellPath)) {
            return { shell: customShellPath, args: ['-c'] };
        }
        throw new Error(`Custom shell path not found: ${customShellPath}`);
    }
    if (process.platform === 'win32') {
        // 2. Try Git Bash in known locations
        const paths = [];
        const programFiles = process.env.ProgramFiles;
        if (programFiles) {
            paths.push(`${programFiles}\\Git\\bin\\bash.exe`);
        }
        const programFilesX86 = process.env['ProgramFiles(x86)'];
        if (programFilesX86) {
            paths.push(`${programFilesX86}\\Git\\bin\\bash.exe`);
        }
        for (const path of paths) {
            if ((0, fs_1.existsSync)(path)) {
                return { shell: path, args: ['-c'] };
            }
        }
        // 3. Fallback: search bash.exe on PATH
        const bashOnPath = findBashOnPath();
        if (bashOnPath) {
            return { shell: bashOnPath, args: ['-c'] };
        }
        throw new Error(`No bash shell found. Install Git for Windows or add bash to PATH.`);
    }
    // Unix: try /bin/bash, then bash on PATH, then fallback to sh
    if ((0, fs_1.existsSync)('/bin/bash')) {
        return { shell: '/bin/bash', args: ['-c'] };
    }
    const bashOnPath = findBashOnPath();
    if (bashOnPath) {
        return { shell: bashOnPath, args: ['-c'] };
    }
    return { shell: 'sh', args: ['-c'] };
}
/**
 * Get shell environment with updated PATH
 */
function getShellEnv() {
    // For now, just return current env
    // Could add bin directory to PATH if needed
    return { ...process.env };
}
/**
 * Sanitize binary output for display/storage.
 * Removes characters that could crash string-width or cause display issues.
 */
function sanitizeBinaryOutput(str) {
    return Array.from(str)
        .filter((char) => {
        const code = char.codePointAt(0);
        if (code === undefined)
            return false;
        // Allow tab, newline, carriage return
        if (code === 0x09 || code === 0x0a || code === 0x0d)
            return true;
        // Filter out control characters (0x00-0x1F, except allowed)
        if (code <= 0x1f)
            return false;
        // Filter out Unicode format characters
        if (code >= 0xfff9 && code <= 0xfffb)
            return false;
        return true;
    })
        .join('');
}
/**
 * Detached child processes must be tracked so they can be killed on shutdown.
 */
const trackedDetachedChildPids = new Set();
function trackDetachedChildPid(pid) {
    trackedDetachedChildPids.add(pid);
}
function untrackDetachedChildPid(pid) {
    trackedDetachedChildPids.delete(pid);
}
/**
 * Kill a process and all its children (cross-platform)
 */
function killProcessTree(pid) {
    if (process.platform === 'win32') {
        try {
            (0, child_process_1.spawn)('taskkill', ['/F', '/T', '/PID', String(pid)], {
                stdio: 'ignore',
                detached: true,
            });
        }
        catch {
            // Ignore errors
        }
    }
    else {
        try {
            process.kill(-pid, 'SIGKILL');
        }
        catch {
            try {
                process.kill(pid, 'SIGKILL');
            }
            catch {
                // Process might already be dead
            }
        }
    }
}
function killTrackedDetachedChildren() {
    for (const pid of trackedDetachedChildPids) {
        killProcessTree(pid);
    }
    trackedDetachedChildPids.clear();
}
//# sourceMappingURL=shell.js.map