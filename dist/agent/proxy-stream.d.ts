/**
 * Proxy stream function for routing LLM calls through a server.
 * Moved from agent/ to runtime/ as it's not core agent logic.
 */
import type { LLMStreamEvent } from './types.js';
export interface ProxyOptions {
    authToken: string;
    proxyUrl: string;
    temperature?: number;
    maxTokens?: number;
    reasoning?: string;
    signal?: AbortSignal;
}
/**
 * Stream function that proxies requests through a server.
 * Reconstructs assistant message from delta events.
 */
export declare function createProxyStream(options: ProxyOptions): (model: any, context: any, streamOptions?: any) => AsyncIterable<LLMStreamEvent>;
//# sourceMappingURL=proxy-stream.d.ts.map