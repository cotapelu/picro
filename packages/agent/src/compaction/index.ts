// SPDX-License-Identifier: Apache-2.0
/**
 * Compaction module - barrel export.
 */

export * from './utils.js';
export * from './core.js';
export * from './compaction.js';
export * from './branch-summarization.js';

// Re-export types from compaction.ts
export type { CompactOptions } from './compaction.js';
