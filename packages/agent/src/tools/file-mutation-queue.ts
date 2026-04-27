// SPDX-License-Identifier: Apache-2.0
/**
 * FileMutationQueue - Queue file edits, apply atomically, rollback on failure
 * 
 * Features:
 * - Queue multiple edits across multiple files
 * - Apply all mutations atomically (all-or-nothing)
 * - Rollback on failure (restore original state)
 */

import { readFile, writeFile, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";

export interface FileMutation {
  path: string;
  oldText: string;
  newText: string;
}

export interface QueuedMutation {
  path: string;
  oldContent: string;
  newContent: string;
  applied: boolean;
}

interface Snapshot {
  path: string;
  content: string;
  mtimeMs: number;
}

/**
 * FileMutationQueue - queues edits and applies them atomically
 */
export class FileMutationQueue {
  private mutations: QueuedMutation[] = [];
  private snapshots: Snapshot[] = [];
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Add a mutation to the queue
   */
  async queueEdit(mutation: FileMutation): Promise<void> {
    const absolutePath = resolve(this.cwd, mutation.path);
    
    // Read current file content
    let oldContent: string;
    try {
      oldContent = await readFile(absolutePath, "utf-8");
    } catch {
      // File doesn't exist, create empty content
      oldContent = "";
    }

    // Compute new content
    const normalizedOld = oldContent.replace(/\r\n/g, "\n");
    const index = normalizedOld.indexOf(mutation.oldText);
    
    if (index === -1 && mutation.oldText.length > 0) {
      throw new Error(
        `Could not find text to replace in ${mutation.path}: ` +
        `${mutation.oldText.substring(0, 50)}...`
      );
    }

    const newContent = mutation.oldText.length > 0
      ? normalizedOld.slice(0, index) + mutation.newText + normalizedOld.slice(index + mutation.oldText.length)
      : mutation.newText + normalizedOld;

    this.mutations.push({
      path: absolutePath,
      oldContent,
      newContent,
      applied: false,
    });
  }

  /**
   * Apply all queued mutations atomically
   */
  async applyAll(): Promise<{ applied: number; files: string[] }> {
    if (this.mutations.length === 0) {
      return { applied: 0, files: [] };
    }

    // Create snapshots before applying
    this.snapshots = [];
    for (const mutation of this.mutations) {
      try {
        const stats = await stat(mutation.path);
        this.snapshots.push({
          path: mutation.path,
          content: mutation.oldContent,
          mtimeMs: stats.mtimeMs,
        });
      } catch {
        // File doesn't exist - will be created
        this.snapshots.push({
          path: mutation.path,
          content: "",
          mtimeMs: 0,
        });
      }
    }

    // Apply all mutations
    const files: string[] = [];
    for (const mutation of this.mutations) {
      try {
        await writeFile(mutation.path, mutation.newContent, "utf-8");
        mutation.applied = true;
        files.push(relative(this.cwd, mutation.path));
      } catch (error) {
        // Rollback on failure
        await this.rollback();
        throw new Error(
          `Failed to apply mutations, rolled back: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    const applied = this.mutations.filter(m => m.applied).length;
    this.clear();
    return { applied, files };
  }

  /**
   * Rollback all applied mutations
   */
  async rollback(): Promise<{ rolledBack: number }> {
    let rolledBack = 0;
    
    for (const snapshot of this.snapshots) {
      try {
        if (snapshot.mtimeMs === 0) {
          // File was created, delete it
          const { unlink } = await import("node:fs/promises");
          await unlink(snapshot.path);
        } else {
          // Restore original content
          await writeFile(snapshot.path, snapshot.content, "utf-8");
        }
        rolledBack++;
      } catch {
        // Ignore rollback errors
      }
    }

    this.clear();
    return { rolledBack };
  }

  /**
   * Clear the queue without applying
   */
  clear(): void {
    this.mutations = [];
    this.snapshots = [];
  }

  /**
   * Get queue length
   */
  get length(): number {
    return this.mutations.length;
  }

  /**
   * Preview changes without applying
   */
  preview(): Array<{ path: string; oldContent: string; newContent: string }> {
    return this.mutations.map(m => ({
      path: relative(this.cwd, m.path),
      oldContent: m.oldContent,
      newContent: m.newContent,
    }));
  }
}

/**
 * Helper to create mutation queue and apply edits
 */
export async function applyMutations(
  mutations: FileMutation[],
  cwd: string = process.cwd()
): Promise<{ applied: number; files: string[] }> {
  const queue = new FileMutationQueue(cwd);
  
  for (const mutation of mutations) {
    await queue.queueEdit(mutation);
  }
  
  return queue.applyAll();
}