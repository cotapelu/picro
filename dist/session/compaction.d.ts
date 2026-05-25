/**
 * Compaction - Session context compaction
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Token estimation từ usage và heuristic
 * - Cut point detection
 * - Compaction preparation
 * - Summarization (stub)
 */
import type { AgentMessage, AssistantMessage } from "./agent-types.js";
import type { SessionEntry } from "../session/session-manager.js";
type Usage = AssistantMessage['usage'];
export interface CompactionSettings {
    enabled: boolean;
    reserveTokens: number;
    keepRecentTokens: number;
}
export declare const DEFAULT_COMPACTION_SETTINGS: CompactionSettings;
export interface FileOperations {
    read: Set<string>;
    written: Set<string>;
    edited: Set<string>;
}
export declare function createFileOps(): FileOperations;
export declare function extractFileOpsFromMessage(message: AgentMessage, fileOps: FileOperations): void;
export declare function computeFileLists(fileOps: FileOperations): {
    readFiles: string[];
    modifiedFiles: string[];
};
export declare function formatFileOperations(readFiles: string[], modifiedFiles: string[]): string;
export declare function estimateTokens(message: any): number;
/**
 * Simple total token estimation (sum of per-message estimates).
 */
export declare function estimateContextTokens(messages: AgentMessage[]): number;
export interface CutPointResult {
    firstKeptIndex: number;
    isSplitTurn: boolean;
}
export declare function findCutPoint(messages: AgentMessage[], keepRecentTokens: number): CutPointResult;
export declare function calculateContextTokens(usage: any): number;
/**
 * Get usage from an assistant message if available.
 * Skips aborted and error messages.
 */
export declare function getAssistantUsage(msg: AgentMessage): Usage | undefined;
/**
 * Estimate context tokens from messages, using last assistant usage when available.
 * Returns total tokens, tokens from usage, trailing tokens after usage, and index of last usage.
 */
export declare function estimateContextUsage(messages: AgentMessage[]): {
    tokens: number;
    usageTokens: number;
    trailingTokens: number;
    lastUsageIndex: number | null;
};
/**
 * Check if compaction should trigger based on context usage.
 */
export declare function shouldCompact(contextTokens: number, contextWindow: number, settings: CompactionSettings): boolean;
export interface CompactionResult {
    summary: string;
    keptMessages: AgentMessage[];
    discardedMessages: AgentMessage[];
}
export declare function compactSession(messages: AgentMessage[], settings?: CompactionSettings, _llmSummarize?: (text: string) => Promise<string>): Promise<CompactionResult>;
export interface CompactionPreparation {
    firstKeptEntryId: string;
    messagesToSummarize: AgentMessage[];
    turnPrefixMessages: AgentMessage[];
    isSplitTurn: boolean;
    tokensBefore: number;
    previousSummary: string | undefined;
    fileOps: FileOperations;
    settings: CompactionSettings;
}
/**
 * Extract AgentMessage from a SessionEntry.
 * Returns undefined for entries that don't contribute to LLM context.
 */
export declare function getMessageFromEntry(entry: SessionEntry): AgentMessage | undefined;
/**
 * Find indices of valid cut points in entries array.
 * Returns array of indices that are valid cut positions (user, assistant, custom, bashExecution).
 */
export declare function findValidCutPoints(entries: SessionEntry[]): number[];
/**
 * Prepare compaction: determine what to summarize, token counts, file ops.
 * This is the core logic before LLM summarization.
 */
export declare function prepareCompaction(entries: SessionEntry[], settings: CompactionSettings): CompactionPreparation | null;
/**
 * Core compaction function that generates summary via LLM.
 * This is a stub - should call LLM API.
 */
export declare function compact(preparation: CompactionPreparation, _model: any, _apiKey: string, _headers?: Record<string, string>, _customInstructions?: string, _signal?: AbortSignal, _thinkingLevel?: string): Promise<{
    summary: string;
    firstKeptEntryId: string;
    tokensBefore: number;
    details?: {
        readFiles: string[];
        modifiedFiles: string[];
    };
}>;
export {};
//# sourceMappingURL=compaction.d.ts.map