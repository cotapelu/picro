// SPDX-License-Identifier: Apache-2.0
/**
 * Stream utilities for handling async iterables.
 * Moved from agent/ to runtime/ as it's not core agent logic.
 */
// No specific type import needed; generic functions work with any stream
/**
 * Collect all chunks from a stream into an array.
 */
export async function collectStream(stream) {
    const items = [];
    for await (const item of stream) {
        items.push(item);
    }
    return items;
}
/**
 * Pipe one stream into another (transform each chunk).
 */
export async function* pipeStream(source, transformer) {
    for await (const item of source) {
        yield await transformer(item);
    }
}
/**
 * Create a stream from an array.
 */
export async function* createStream(items) {
    for (const item of items) {
        yield item;
    }
}
/**
 * Merge multiple tool call objects into one.
 * For streaming partial tool call data.
 */
export function mergeToolCalls(...toolCalls) {
    const map = new Map();
    for (const tc of toolCalls) {
        if (!tc.id)
            continue;
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
export function supportsStreaming(llm) {
    return typeof llm?.streamWithTools === 'function';
}
//# sourceMappingURL=stream-utils.js.map