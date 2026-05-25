/**
 * Build the initial message for the agent from stdin, file contents, and CLI arguments.
 */
import type { ImageContent } from "../llm/index.js";
import type { Args } from "../runtime/cli-args.js";
export interface InitialMessageInput {
    parsed: Args;
    fileText?: string;
    fileImages?: ImageContent[];
    stdinContent?: string;
}
export interface InitialMessageResult {
    initialMessage?: string;
    initialImages?: ImageContent[];
}
/**
 * Combine stdin, file text, and the first CLI message into a single
 * initial prompt. The first message from parsed.messages is consumed
 * (removed from the array).
 */
export declare function buildInitialMessage(input: InitialMessageInput): InitialMessageResult;
//# sourceMappingURL=initial-message.d.ts.map