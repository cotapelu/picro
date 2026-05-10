// SPDX-License-Identifier: Apache-2.0
/**
 * Compaction module - barrel export.
 */

export * from './utils';
export * from './core';
export * from './compaction';
export * from './branch-summarization';

// Re-export types from compaction.ts
export type { CompactOptions } from './compaction';
