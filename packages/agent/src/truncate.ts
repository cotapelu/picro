// SPDX-License-Identifier: Apache-2.0
/**
 * Truncation Strategies - Advanced output truncation utilities
 */

/**
 * Truncation result
 */
export interface TruncationResult {
  /** Truncated output */
  output: string;
  /** Whether truncation occurred */
  truncated: boolean;
  /** Reason for truncation */
  reason?: "size" | "lines" | "visual";
  /** Original length in bytes */
  originalBytes: number;
  /** Truncated bytes (if truncated) */
  truncatedBytes?: number;
}

/**
 * Simple truncate by bytes (append ellipsis)
 */
export function truncateBytes(
  input: string,
  maxBytes: number,
  ellipsis: string = "..."
): TruncationResult {
  if (Buffer.byteLength(input, "utf8") <= maxBytes) {
    return { output: input, truncated: false, originalBytes: Buffer.byteLength(input, "utf8") };
  }

  // Reduce length to fit ellipsis
  const targetBytes = maxBytes - Buffer.byteLength(ellipsis, "utf8");
  let len = 0;
  let i = 0;
  for (i = 0; i < input.length; i++) {
    const charLen = Buffer.byteLength(input[i], "utf8");
    if (len + charLen > targetBytes) break;
    len += charLen;
  }

  const truncated = input.slice(0, i) + ellipsis;
  return {
    output: truncated,
    truncated: true,
    reason: "size",
    originalBytes: Buffer.byteLength(input, "utf8"),
    truncatedBytes: Buffer.byteLength(truncated, "utf8"),
  };
}

/**
 * Truncate by number of lines
 */
export function truncateLines(
  input: string,
  maxLines: number,
  ellipsis: string = "..."
): TruncationResult {
  const lines = input.split("\n");
  if (lines.length <= maxLines) {
    return { output: input, truncated: false, originalBytes: Buffer.byteLength(input, "utf8") };
  }

  const truncated = lines.slice(0, maxLines).join("\n") + "\n" + ellipsis;
  return {
    output: truncated,
    truncated: true,
    reason: "lines",
    originalBytes: Buffer.byteLength(input, "utf8"),
    truncatedBytes: Buffer.byteLength(truncated, "utf8"),
  };
}

/**
 * Truncate for visual display (considering wide chars, etc).
 * This is a simple implementation that approximates visual width.
 */
export function truncateVisualLines(
  input: string,
  maxVisualLines: number,
  maxCols: number = 80,
  ellipsis: string = "..."
): TruncationResult {
  // For simplicity, treat each line as a visual line; can be enhanced with wide char handling
  const lines = input.split("\n");
  if (lines.length <= maxVisualLines) {
    return { output: input, truncated: false, originalBytes: Buffer.byteLength(input, "utf8") };
  }

  const truncatedLines = lines.slice(0, maxVisualLines);
  const lastLine = truncatedLines[truncatedLines.length - 1];
  if (lastLine.length > maxCols) {
    truncatedLines[truncatedLines.length - 1] = lastLine.slice(0, maxCols - ellipsis.length) + ellipsis;
  } else {
    truncatedLines.push(ellipsis);
  }

  const truncated = truncatedLines.join("\n");
  return {
    output: truncated,
    truncated: true,
    reason: "visual",
    originalBytes: Buffer.byteLength(input, "utf8"),
    truncatedBytes: Buffer.byteLength(truncated, "utf8"),
  };
}

/**
 * Truncate a single line (middle truncation with head/tail)
 */
export function truncateMiddle(
  input: string,
  maxLength: number,
  headLen: number = 30,
  tailLen: number = 30,
  ellipsis: string = "..."
): TruncationResult {
  if (input.length <= maxLength) {
    return { output: input, truncated: false, originalBytes: Buffer.byteLength(input, "utf8") };
  }

  const keep = maxLength - ellipsis.length;
  if (keep <= 0) {
    return { output: ellipsis.slice(0, maxLength), truncated: true, reason: "size", originalBytes: Buffer.byteLength(input, "utf8") };
  }

  const head = Math.min(headLen, Math.floor(keep / 2));
  const tail = keep - head;
  const truncated = input.slice(0, head) + ellipsis + input.slice(input.length - tail);
  return {
    output: truncated,
    truncated: true,
    reason: "size",
    originalBytes: Buffer.byteLength(input, "utf8"),
    truncatedBytes: Buffer.byteLength(truncated, "utf8"),
  };
}

/**
 * Truncate preserving start and end (suitable for code snippets)
 */
export function truncatePreserveEnds(
  input: string,
  maxLines: number,
  tailLines: number = 5,
  ellipsis: string = "..."
): TruncationResult {
  const lines = input.split("\n");
  if (lines.length <= maxLines) {
    return { output: input, truncated: false, originalBytes: Buffer.byteLength(input, "utf8") };
  }

  const keepTail = Math.min(tailLines, maxLines - 1);
  const keepHead = maxLines - keepTail - 1; // space for ellipsis line

  const head = lines.slice(0, keepHead);
  const tail = lines.slice(lines.length - keepTail);
  const truncated = [...head, ellipsis, ...tail].join("\n");

  return {
    output: truncated,
    truncated: true,
    reason: "lines",
    originalBytes: Buffer.byteLength(input, "utf8"),
    truncatedBytes: Buffer.byteLength(truncated, "utf8"),
  };
}
