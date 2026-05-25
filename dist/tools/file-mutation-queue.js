"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * FileMutationQueue - Queue file edits, apply atomically, rollback on failure
 *
 * Features:
 * - Queue multiple edits across multiple files
 * - Apply all mutations atomically (all-or-nothing)
 * - Rollback on failure (restore original state)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileMutationQueue = void 0;
exports.applyMutations = applyMutations;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
/**
 * FileMutationQueue - queues edits and applies them atomically
 */
class FileMutationQueue {
    mutations = [];
    snapshots = [];
    cwd;
    constructor(cwd = process.cwd()) {
        this.cwd = cwd;
    }
    /**
     * Add a mutation to the queue
     */
    async queueEdit(mutation) {
        const absolutePath = (0, node_path_1.resolve)(this.cwd, mutation.path);
        // Read current file content
        let oldContent;
        try {
            oldContent = await (0, promises_1.readFile)(absolutePath, "utf-8");
        }
        catch {
            // File doesn't exist, create empty content
            oldContent = "";
        }
        // Compute new content
        const normalizedOld = oldContent.replace(/\r\n/g, "\n");
        const index = normalizedOld.indexOf(mutation.oldText);
        if (index === -1 && mutation.oldText.length > 0) {
            throw new Error(`Could not find text to replace in ${mutation.path}: ` +
                `${mutation.oldText.substring(0, 50)}...`);
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
    async applyAll() {
        if (this.mutations.length === 0) {
            return { applied: 0, files: [] };
        }
        // Create snapshots before applying
        this.snapshots = [];
        for (const mutation of this.mutations) {
            try {
                const stats = await (0, promises_1.stat)(mutation.path);
                this.snapshots.push({
                    path: mutation.path,
                    content: mutation.oldContent,
                    mtimeMs: stats.mtimeMs,
                });
            }
            catch {
                // File doesn't exist - will be created
                this.snapshots.push({
                    path: mutation.path,
                    content: "",
                    mtimeMs: 0,
                });
            }
        }
        // Apply all mutations
        const files = [];
        for (const mutation of this.mutations) {
            try {
                await (0, promises_1.writeFile)(mutation.path, mutation.newContent, "utf-8");
                mutation.applied = true;
                files.push((0, node_path_1.relative)(this.cwd, mutation.path));
            }
            catch (error) {
                // Rollback on failure
                await this.rollback();
                throw new Error(`Failed to apply mutations, rolled back: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        const applied = this.mutations.filter(m => m.applied).length;
        this.clear();
        return { applied, files };
    }
    /**
     * Rollback all applied mutations
     */
    async rollback() {
        let rolledBack = 0;
        for (const snapshot of this.snapshots) {
            try {
                if (snapshot.mtimeMs === 0) {
                    // File was created, delete it
                    const { unlink } = await Promise.resolve().then(() => __importStar(require("node:fs/promises")));
                    await unlink(snapshot.path);
                }
                else {
                    // Restore original content
                    await (0, promises_1.writeFile)(snapshot.path, snapshot.content, "utf-8");
                }
                rolledBack++;
            }
            catch {
                // Ignore rollback errors
            }
        }
        this.clear();
        return { rolledBack };
    }
    /**
     * Clear the queue without applying
     */
    clear() {
        this.mutations = [];
        this.snapshots = [];
    }
    /**
     * Get queue length
     */
    get length() {
        return this.mutations.length;
    }
    /**
     * Preview changes without applying
     */
    preview() {
        return this.mutations.map(m => ({
            path: (0, node_path_1.relative)(this.cwd, m.path),
            oldContent: m.oldContent,
            newContent: m.newContent,
        }));
    }
}
exports.FileMutationQueue = FileMutationQueue;
/**
 * Helper to create mutation queue and apply edits
 */
async function applyMutations(mutations, cwd = process.cwd()) {
    const queue = new FileMutationQueue(cwd);
    for (const mutation of mutations) {
        await queue.queueEdit(mutation);
    }
    return queue.applyAll();
}
//# sourceMappingURL=file-mutation-queue.js.map