import type { Model, Context, StreamOptions } from '../types.js';
import { AssistantMessageEventStream } from '../event-stream.js';
interface OpenAICompatOptions extends StreamOptions {
    toolChoice?: 'auto' | 'none' | 'required' | {
        type: 'function';
        function: {
            name: string;
        };
    };
    reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
}
export declare function stream(model: Model, context: Context, options?: OpenAICompatOptions): Promise<AssistantMessageEventStream>;
export declare function complete(model: Model, context: Context, options?: OpenAICompatOptions): Promise<any>;
export {};
//# sourceMappingURL=openai-compatible.d.ts.map