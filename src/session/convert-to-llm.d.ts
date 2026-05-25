/**
 * Convert session-specific message types to LLM-compatible Messages.
 * Moved from agent/ to session/ because it's session-specific.
 *
 * This handles custom message types used in session persistence:
 * - BashExecutionMessage -> user message with formatted output
 * - BranchSummaryMessage -> user message with summary prefix
 * - CompactionSummaryMessage -> user message with summary prefix
 * - CustomMessage -> user message with content
 */
import type { Message, TextContent } from '../llm/index.js';
export interface BashExecutionMessage {
    role: 'bashExecution';
    command: string;
    output: string;
    exitCode: number | undefined;
    cancelled: boolean;
    truncated: boolean;
    fullOutputPath?: string;
    timestamp: number;
    excludeFromContext?: boolean;
}
export interface BranchSummaryMessage {
    role: 'branchSummary';
    summary: string;
    fromId: string;
    timestamp: number;
}
export interface CompactionSummaryMessage {
    role: 'compactionSummary';
    summary: string;
    tokensBefore: number;
    timestamp: number;
}
export interface CustomMessage {
    role: 'custom';
    customType: string;
    content: string | TextContent[];
    display: boolean;
    details?: unknown;
    timestamp: number;
}
/**
 * Convert an array of session messages to LLM-compatible Messages.
 *
 * This function transforms custom session message types into standard
 * LLM messages (user role) that can be sent to the model.
 *
 * - BashExecutionMessage -> user message with formatted output
 * - BranchSummaryMessage -> user message with branch summary
 * - CompactionSummaryMessage -> user message with compaction summary
 * - CustomMessage -> user message with custom content
 * - Standard messages (user, assistant, toolResult) are passed through unchanged
 */
export declare function convertSessionMessagesToLlm(messages: any[]): Message[];
//# sourceMappingURL=convert-to-llm.d.ts.map