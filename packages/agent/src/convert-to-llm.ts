// SPDX-License-Identifier: Apache-2.0
/**
 * Convert session-specific message types to LLM-compatible Messages.
 *
 * This handles custom message types used in session persistence:
 * - BashExecutionMessage -> user message with formatted output
 * - BranchSummaryMessage -> user message with summary prefix
 * - CompactionSummaryMessage -> user message with summary prefix
 * - CustomMessage -> user message with content
 */

import type { Message, TextContent } from '@picro/llm';

// Session message types (import from session-manager would cause circular deps, so re-declare minimal shapes)
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

type SessionMessage = BashExecutionMessage | BranchSummaryMessage | CompactionSummaryMessage | CustomMessage;

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
function bashExecutionToText(msg: BashExecutionMessage): string {
  let text = `Ran \`${msg.command}\`\n`;
  if (msg.output) {
    text += `\`\`\`\n${msg.output}\n\`\`\``;
  } else {
    text += '(no output)';
  }
  if (msg.cancelled) {
    text += '\n\n(command cancelled)';
  } else if (msg.exitCode !== null && msg.exitCode !== undefined && msg.exitCode !== 0) {
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
export function convertSessionMessagesToLlm(messages: any[]): Message[] {
  return messages
    .map((m): Message | undefined => {
      // Standard LLM messages pass through
      if (m.role === 'user' || m.role === 'assistant' || m.role === 'toolResult') {
        return m as Message;
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
            content: [{ type: 'text' as const, text: bashExecutionToText(m) }],
            timestamp: m.timestamp,
          };

        case 'branchSummary':
          return {
            role: 'user',
            content: [
              { type: 'text' as const, text: BRANCH_SUMMARY_PREFIX + m.summary + BRANCH_SUMMARY_SUFFIX },
            ],
            timestamp: m.timestamp,
          };

        case 'compactionSummary':
          return {
            role: 'user',
            content: [
              { type: 'text' as const, text: COMPACTION_SUMMARY_PREFIX + m.summary + COMPACTION_SUMMARY_SUFFIX },
            ],
            timestamp: m.timestamp,
          };

        case 'custom':
          const content: TextContent[] = typeof m.content === 'string'
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
    .filter((m): m is Message => m !== undefined);
}
