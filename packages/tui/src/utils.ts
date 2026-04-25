/**
 * Utility Functions for TUI
 * 
 * This module re-exports all utilities from components/internal-utils.ts
 * for backward compatibility and public API.
 */

export {
  getSegmenter,
  visibleWidth,
  extractAnsiCode,
  extractSegments,
  sliceByColumn,
  sliceWithWidth,
  stripAnsi,
  hasAnsi,
  wrapText,
  truncateText,
  padText,
  escapeRegex,
  splitGraphemes,
  graphemeLength,
} from './components/internal-utils.js';
