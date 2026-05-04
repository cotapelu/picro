// SPDX-License-Identifier: Apache-2.0
/**
 * Stream utilities for handling async iterables.
 * Different implementation names but similar functionality.
 */

// No specific type import needed; generic functions work with any stream

/**
 * Collect all chunks from a stream into an array.
 */
export async function collectStream<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of stream) {
    items.push(item);
  }
  return items;
}

/**
 * Pipe one stream into another (transform each chunk).
 */
export async function* pipeStream<T, U>(
  source: AsyncIterable<T>,
  transformer: (item: T) => U | Promise<U>
): AsyncIterable<U> {
  for await (const item of source) {
    yield await transformer(item);
  }
}

/**
 * Create a stream from an array.
 */
export async function* createStream<T>(items: T[]): AsyncIterable<T> {
  for (const item of items) {
    yield item;
  }
}

/**
 * Merge multiple tool call objects into one.
 * For streaming partial tool call data.
 */
export function mergeToolCalls(
  ...toolCalls: Partial<any>[]
): Map<string, any> {
  const map = new Map<string, any>();
  for (const tc of toolCalls) {
    if (!tc.id) continue;
    const existing = map.get(tc.id) || {};
    map.set(tc.id, {
      ...existing,
      ...tc,
      arguments: { ...(existing.arguments || {}), ...(tc.arguments || {}) },
    });
  }
  return map;
}

/**
 * Check if an LLM response supports streaming.
 * Simple check: does it have a streamWithTools method?
 */
export function supportsStreaming(llm: any): boolean {
  return typeof llm?.streamWithTools === 'function';
}
