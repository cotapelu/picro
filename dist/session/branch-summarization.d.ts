/**
 * Branch Summarization for Tree Navigation
 *
 * Generates summaries of abandoned branches when navigating session tree.
 */
import type { AgentMessage } from "./agent-types.js";
import type { SessionEntry, SessionManager } from "../session/session-manager.js";
export interface BranchSummaryDetails {
    readFiles: string[];
    modifiedFiles: string[];
}
export interface CollectEntriesResult {
    entries: SessionEntry[];
    commonAncestorId: string | null;
}
export interface BranchPreparation {
    messages: AgentMessage[];
    fileOps: FileOperations;
    totalTokens: number;
}
export interface GenerateBranchSummaryOptions {
    model: any;
    apiKey: string;
    headers?: Record<string, string>;
    signal: AbortSignal;
    customInstructions?: string;
    replaceInstructions?: boolean;
    reserveTokens?: number;
}
export interface BranchSummaryResult {
    summary?: string;
    details?: BranchSummaryDetails;
    aborted?: boolean;
    error?: string;
}
export interface FileOperations {
    read: Set<string>;
    written: Set<string>;
    edited: Set<string>;
}
export declare function createFileOps(): FileOperations;
/**
 * Extract file operations from assistant message tool calls.
 */
export declare function extractFileOpsFromMessage(message: AgentMessage, fileOps: FileOperations): void;
export declare function computeFileLists(fileOps: FileOperations): {
    readFiles: string[];
    modifiedFiles: string[];
};
export declare function formatFileOperations(readFiles: string[], modifiedFiles: string[]): string;
export declare function estimateTokens(message: AgentMessage): number;
/**
 * Collect entries to summarize when navigating from oldLeafId to targetId.
 */
export declare function collectEntriesForBranchSummary(session: SessionManager, oldLeafId: string | null, targetId: string): CollectEntriesResult;
/**
 * Convert SessionEntry to AgentMessage (simplified).
 */
export declare function getMessageFromEntry(entry: SessionEntry): AgentMessage | undefined;
/**
 * Prepare branch entries for summarization with token budget.
 */
export declare function prepareBranchEntries(entries: SessionEntry[], tokenBudget?: number): BranchPreparation;
/**
 * Generate branch summary (stub implementation).
 * In production, this would call the LLM API.
 */
export declare function generateBranchSummary(_entries: SessionEntry[], options: GenerateBranchSummaryOptions): Promise<BranchSummaryResult>;
//# sourceMappingURL=branch-summarization.d.ts.map