// SPDX-License-Identifier: Apache-2.0
/**
 * Bash Tool - Execute bash commands
 *
 * This tool allows the agent to execute shell commands.
 */

import { spawn } from "child_process";
import { randomBytes } from "node:crypto";
import { createWriteStream, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolDefinition, ToolHandler, ToolContext } from "../types.js";

/**
 * Generate a unique temp file path for bash output.
 */
function getTempFilePath(): string {
  const id = randomBytes(8).toString("hex");
  return join(tmpdir(), `pi-bash-${id}.log`);
}

/**
 * Default timeout in seconds
 */
const DEFAULT_TIMEOUT = 60;

/**
 * Maximum output size in bytes
 */
const MAX_OUTPUT_BYTES = 100 * 1024; // 100KB

/**
 * Bash tool input type
 */
export interface BashToolInput {
  command: string;
  timeout?: number;
}

/**
 * Get shell configuration
 */
function getShellConfig(): { shell: string; args: string[] } {
  const isWindows = process.platform === "win32";
  return {
    shell: isWindows ? "cmd.exe" : "/bin/bash",
    args: isWindows ? ["/c"] : ["-c"],
  };
}

/**
 * Get shell environment
 */
function getShellEnv(): NodeJS.ProcessEnv {
  return { ...process.env };
}

/**
 * Kill process tree
 */
function killProcessTree(pid: number): void {
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", pid.toString(), "/T", "/F"], { shell: true });
    } else {
      // Kill process group
      try {
        process.kill(-pid, "SIGTERM");
      } catch {
        // If process group doesn't work, try direct kill
        try {
          process.kill(pid, "SIGTERM");
        } catch {
          // Process may have already exited
        }
      }
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Track detached child PID
 */
const trackedPids = new Set<number>();
function trackDetachedChildPid(pid: number): void {
  trackedPids.add(pid);
}
function untrackDetachedChildPid(pid: number): void {
  trackedPids.delete(pid);
}

/**
 * Format size for display
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Truncate output to max size
 */
function truncateOutput(output: string, maxBytes: number): { text: string; truncated: boolean } {
  if (output.length <= maxBytes) {
    return { text: output, truncated: false };
  }
  
  const truncated = output.slice(-maxBytes);
  return { text: truncated, truncated: true };
}

/**
 * Bash tool options
 */
export interface BashToolOptions {
  /** Working directory */
  cwd?: string;
  
  /** Maximum bytes to capture */
  maxBytes?: number;
}

/**
 * Execute bash command
 */
async function executeBash(
  command: string,
  cwd: string,
  options: {
    timeout?: number;
    maxBytes?: number;
    signal?: AbortSignal;
  } = {}
): Promise<{ output: string; exitCode: number | null; truncated: boolean; details: any }> {
  const { shell, args } = getShellConfig();
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const maxBytes = options.maxBytes ?? MAX_OUTPUT_BYTES;
  
  if (!existsSync(cwd)) {
    throw new Error(`Working directory does not exist: ${cwd}\nCannot execute bash commands.`);
  }
  
  return new Promise((resolve, reject) => {
    const child = spawn(shell, [...args, command], {
      cwd,
      detached: true,
      env: getShellEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    
    if (child.pid) {
      trackDetachedChildPid(child.pid);
    }
    
    let output = "";
    let timedOut = false;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    
    // Set timeout
    if (timeout > 0) {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        if (child.pid) {
          killProcessTree(child.pid);
        }
      }, timeout * 1000);
    }
    
    // Collect stdout
    child.stdout?.on("data", (data: Buffer) => {
      output += data.toString();
    });
    
    // Collect stderr
    child.stderr?.on("data", (data: Buffer) => {
      output += data.toString();
    });
    
    child.on("close", (code) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      if (child.pid) {
        untrackDetachedChildPid(child.pid);
      }
      
      const { text, truncated } = truncateOutput(output, maxBytes);
      
      resolve({
        output: text,
        exitCode: code,
        truncated,
        details: {
          timedOut,
          fullOutputLength: output.length,
        },
      });
    });
    
    child.on("error", (error) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      if (child.pid) {
        untrackDetachedChildPid(child.pid);
      }
      reject(error);
    });
    
    // Handle abort signal
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        if (child.pid) {
          killProcessTree(child.pid);
        }
      });
    }
  });
}

/**
 * Create bash tool handler
 */
export function createBashHandler(cwd: string, options?: BashToolOptions): ToolHandler {
  const actualCwd = options?.cwd || cwd || process.cwd();
  const maxBytes = options?.maxBytes ?? MAX_OUTPUT_BYTES;
  
  return async (args: Record<string, unknown>, context?: ToolContext) => {
    const command = args.command as string;
    const timeout = args.timeout as number | undefined;
    
    if (!command || typeof command !== "string") {
      throw new Error("command is required");
    }
    
    try {
      const result = await executeBash(command, actualCwd, {
        timeout,
        maxBytes,
        signal: context?.signal,
      });
      
      const sizeInfo = formatSize(Buffer.byteLength(result.output, "utf-8"));
      
      let output = result.output.trim() || "(empty output)";
      
      if (result.truncated) {
        output += `\n\n[Output truncated, ${sizeInfo}]`;
      }
      
      if (result.details.timedOut) {
        output += "\n\n[Command timed out]";
      }
      
      if (result.exitCode !== null && result.exitCode !== 0) {
        output += `\n\n[Exit code: ${result.exitCode}]`;
      }
      
      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `Error: ${message}`;
    }
  };
}

/**
 * Create a bash tool definition.
 */
export function createBashToolDefinition(cwd: string, options?: BashToolOptions): ToolDefinition {
  return {
    name: "bash",
    description: "Execute a bash command. Use for git operations, running tests, npm commands, etc. Returns command output.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Bash command to execute",
        },
        timeout: {
          type: "number",
          description: "Timeout in seconds (optional, default: 60)",
        },
      },
      required: ["command"],
    },
    handler: createBashHandler(cwd, options),
  };
}

/**
 * Create a bash tool instance.
 */
export function createBashTool(cwd: string, options?: BashToolOptions) {
  const definition = createBashToolDefinition(cwd, options);
  
  return {
    ...definition,
    execute: definition.handler,
  };
}

/**
 * Check if result is a bash tool result
 */
export function isBashToolResult(result: unknown): boolean {
  // This is a simple check - could be enhanced
  return typeof result === "string" && result.length > 0;
}