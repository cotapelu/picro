/**
 * Simple event stream implementation
 */
import type { AssistantMessageEvent, AssistantMessage } from './types.js';
export declare class AssistantMessageEventStream implements AsyncIterable<AssistantMessageEvent> {
    private queue;
    private waiting;
    private done;
    private resolveFinal;
    private readonly resultPromise;
    constructor();
    push(event: AssistantMessageEvent): void;
    end(result?: AssistantMessage): void;
    result(): Promise<AssistantMessage>;
    [Symbol.asyncIterator](): AsyncIterator<AssistantMessageEvent>;
}
//# sourceMappingURL=event-stream.d.ts.map