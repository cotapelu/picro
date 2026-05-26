"use strict";
// SPDX-License-Identifier: Apache-2.0
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertSessionMessagesToLlm = convertSessionMessagesToLlm;
const COMPACTION_SUMMARY_PREFIX = `The conversation history before this point was compacted into the following summary:

<summary>
`;
const COMPACTION_SUMMARY_SUFFIX = `
</summary>`;
const BRANCH_SUMMARY_PREFIX = `The following is a summary of a branch that this conversation came back from:

<summary>
`;
const BRANCH_SUMMARY_SUFFIX = `</summary>`;
/**
 * Convert a BashExecutionMessage to user message text.
 */
function bashExecutionToText(msg) {
    let text = `Ran \`${msg.command}\`\n`;
    if (msg.output) {
        text += `\`\`\`\n${msg.output}\n\`\`\``;
    }
    else {
        text += '(no output)';
    }
    if (msg.cancelled) {
        text += '\n\n(command cancelled)';
    }
    else if (msg.exitCode !== null && msg.exitCode !== undefined && msg.exitCode !== 0) {
        text += `\n\nCommand exited with code ${msg.exitCode}`;
    }
    if (msg.truncated && msg.fullOutputPath) {
        text += `\n\n[Output truncated. Full output: ${msg.fullOutputPath}]`;
    }
    return text;
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
function convertSessionMessagesToLlm(messages) {
    return messages
        .map((m) => {
        // Standard LLM messages pass through
        if (m.role === 'user' || m.role === 'assistant' || m.role === 'toolResult') {
            return m;
        }
        // Session-specific types
        switch (m.role) {
            case 'bashExecution':
                // Skip if excluded from context (e.g., ! command with double bang)
                if (m.excludeFromContext) {
                    return undefined;
                }
                return {
                    role: 'user',
                    content: [{ type: 'text', text: bashExecutionToText(m) }],
                    timestamp: m.timestamp,
                };
            case 'branchSummary':
                return {
                    role: 'user',
                    content: [
                        { type: 'text', text: BRANCH_SUMMARY_PREFIX + m.summary + BRANCH_SUMMARY_SUFFIX },
                    ],
                    timestamp: m.timestamp,
                };
            case 'compactionSummary':
                return {
                    role: 'user',
                    content: [
                        { type: 'text', text: COMPACTION_SUMMARY_PREFIX + m.summary + COMPACTION_SUMMARY_SUFFIX },
                    ],
                    timestamp: m.timestamp,
                };
            case 'custom':
                const content = typeof m.content === 'string'
                    ? [{ type: 'text', text: m.content }]
                    : m.content;
                return {
                    role: 'user',
                    content,
                    timestamp: m.timestamp,
                };
            default:
                // Unknown type - skip
                return undefined;
        }
    })
        .filter((m) => m !== undefined);
}
//# sourceMappingURL=convert-to-llm.js.map