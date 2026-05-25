/**
 * Stream utilities for handling async iterables.
 * Moved from agent/ to runtime/ as it's not core agent logic.
 */
/**
 * Collect all chunks from a stream into an array.
 */
export declare function collectStream<T>(stream: AsyncIterable<T>): Promise<T[]>;
/**
 * Pipe one stream into another (transform each chunk).
 */
export declare function pipeStream<T, U>(source: AsyncIterable<T>, transformer: (item: T) => U | Promise<U>): AsyncIterable<U>;
/**
 * Create a stream from an array.
 */
export declare function createStream<T>(items: T[]): AsyncIterable<T>;
/**
 * Merge multiple tool call objects into one.
 * For streaming partial tool call data.
 */
export declare function mergeToolCalls(...toolCalls: Partial<any>[]): Map<string, any>;
/**
 * Check if an LLM response supports streaming.
 * Simple check: does it have a streamWithTools method?
 */
export declare function supportsStreaming(llm: any): boolean;
//# sourceMappingURL=stream-utils.d.ts.map