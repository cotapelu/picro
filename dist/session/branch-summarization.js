// SPDX-License-Identifier: Apache-2.0
/**
 * Branch Summarization for Tree Navigation
 *
 * Generates summaries of abandoned branches when navigating session tree.
 */
export function createFileOps() {
    return { read: new Set(), written: new Set(), edited: new Set() };
}
/**
 * Extract file operations from assistant message tool calls.
 */
export function extractFileOpsFromMessage(message, fileOps) {
    if (message.role !== "assistant")
        return;
    const content = message.content;
    for (const block of content) {
        if (block.type === "toolCall") {
            const args = block.arguments;
            if (!args)
                continue;
            const path = typeof args.path === "string" ? args.path : undefined;
            if (!path)
                continue;
            switch (block.name) {
                case "read":
                    fileOps.read.add(path);
                    break;
                case "write":
                    fileOps.written.add(path);
                    break;
                case "edit":
                    fileOps.edited.add(path);
                    break;
            }
        }
    }
}
export function computeFileLists(fileOps) {
    const modified = new Set([...fileOps.edited, ...fileOps.written]);
    const readOnly = [...fileOps.read].filter((f) => !modified.has(f)).sort();
    const modifiedFiles = [...modified].sort();
    return { readFiles: readOnly, modifiedFiles };
}
export function formatFileOperations(readFiles, modifiedFiles) {
    const sections = [];
    if (readFiles.length > 0)
        sections.push(`<read-files>\n${readFiles.join("\n")}\n</read-files>`);
    if (modifiedFiles.length > 0)
        sections.push(`<modified-files>\n${modifiedFiles.join("\n")}\n</modified-files>`);
    return sections.length ? `\n\n${sections.join("\n\n")}` : "";
}
// ============================================================================
// Token Estimation
// ============================================================================
export function estimateTokens(message) {
    return 0; // stub - would use from compaction module
}
// ============================================================================
// Entry Collection
// ============================================================================
/**
 * Collect entries to summarize when navigating from oldLeafId to targetId.
 */
export function collectEntriesForBranchSummary(session, oldLeafId, targetId) {
    if (!oldLeafId) {
        return { entries: [], commonAncestorId: null };
    }
    const oldBranch = session.getBranch(oldLeafId);
    const oldPath = new Set(oldBranch.map(e => e.id));
    const targetPath = session.getBranch(targetId);
    let commonAncestorId = null;
    for (let i = targetPath.length - 1; i >= 0; i--) {
        if (oldPath.has(targetPath[i].id)) {
            commonAncestorId = targetPath[i].id;
            break;
        }
    }
    const entries = [];
    let current = oldLeafId;
    while (current && current !== commonAncestorId) {
        const entry = session.getEntry(current);
        if (!entry)
            break;
        entries.push(entry);
        current = entry.parentId;
    }
    entries.reverse();
    return { entries, commonAncestorId };
}
// ============================================================================
// Message Conversion & Preparation
// ============================================================================
/**
 * Convert SessionEntry to AgentMessage (simplified).
 */
export function getMessageFromEntry(entry) {
    if (entry.type === "message") {
        return entry.message;
    }
    // custom_message, branch_summary, compaction could be converted
    return undefined;
}
/**
 * Prepare branch entries for summarization with token budget.
 */
export function prepareBranchEntries(entries, tokenBudget = 0) {
    const messages = [];
    const fileOps = createFileOps();
    let totalTokens = 0;
    // Collect file ops from all entries (including previous summaries)
    for (const entry of entries) {
        if (entry.type === "branch_summary" && entry.details) {
            const details = entry.details;
            for (const f of details.readFiles)
                fileOps.read.add(f);
            for (const f of details.modifiedFiles)
                fileOps.edited.add(f);
        }
    }
    // Walk from newest to oldest
    for (let i = entries.length - 1; i >= 0; i--) {
        const message = getMessageFromEntry(entries[i]);
        if (!message)
            continue;
        extractFileOpsFromMessage(message, fileOps);
        const tokens = estimateTokens(message);
        if (tokenBudget > 0 && totalTokens + tokens > tokenBudget) {
            if (entries[i].type === "compaction" || entries[i].type === "branch_summary") {
                if (totalTokens < tokenBudget * 0.9) {
                    messages.unshift(message);
                    totalTokens += tokens;
                }
            }
            break;
        }
        messages.unshift(message);
        totalTokens += tokens;
    }
    return { messages, fileOps, totalTokens };
}
// ============================================================================
// Summary Generation (Stub)
// ============================================================================
const BRANCH_SUMMARY_PREAMBLE = `The user explored a different conversation branch before returning here.
Summary of that exploration:

`;
const BRANCH_SUMMARY_PROMPT = `Create a structured summary of this conversation branch for context when returning later.

Use this EXACT format:

## Goal
[What was the user trying to accomplish?]

## Constraints & Preferences
- [Any constraints, preferences mentioned]
- [Or "(none)" if none]

## Progress
### Done
- [x] [Completed tasks]

### In Progress
- [ ] [Unfinished work]

### Blocked
- [Issues blocking progress]

## Key Decisions
- **[Decision]**: [Rationale]

## Next Steps
1. [Next actions to continue]

Keep each section concise. Preserve exact file paths, function names, error messages.`;
/**
 * Generate branch summary (stub implementation).
 * In production, this would call the LLM API.
 */
export async function generateBranchSummary(_entries, options) {
    const { signal, customInstructions, replaceInstructions, reserveTokens = 16384 } = options;
    if (signal.aborted) {
        return { aborted: true };
    }
    // Prepare entries
    const { fileOps } = prepareBranchEntries(_entries, reserveTokens);
    // Build stub summary
    const msgCount = _entries.filter((e) => e.type === "message" || e.type === "custom_message").length;
    const summaryParts = [
        BRANCH_SUMMARY_PREAMBLE.trim(),
        `\n## Goal\nUser explored ${msgCount} messages in this branch.`,
        `\n## Constraints & Preferences\n(none)`,
        `\n## Progress\n### In Progress\n- [ ] Branch exploration (incomplete)`,
        `\n## Key Decisions\n- [None recorded]`,
    ];
    if (customInstructions && !replaceInstructions) {
        summaryParts.push(`\n\nAdditional focus: ${customInstructions}`);
    }
    let summary = summaryParts.join("");
    // File lists
    const { readFiles, modifiedFiles } = computeFileLists(fileOps);
    summary += formatFileOperations(readFiles, modifiedFiles);
    return {
        summary,
        details: { readFiles, modifiedFiles },
    };
}
//# sourceMappingURL=branch-summarization.js.map