// SPDX-License-Identifier: Apache-2.0
/**
 * Branch Summarization for Tree Navigation
 *
 * Generates summaries of abandoned branches when navigating session tree.
 */
import type { AgentMessage } from "./agent-types.js";
import type { SessionEntry, SessionManager } from "../session/session-manager.js";
import { complete } from "../llm/index.js";

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// File Operations
// ============================================================================

export interface FileOperations {
  read: Set<string>;
  written: Set<string>;
  edited: Set<string>;
}

export function createFileOps(): FileOperations {
  return { read: new Set(), written: new Set(), edited: new Set() };
}

/**
 * Extract file operations from assistant message tool calls.
 */
export function extractFileOpsFromMessage(message: AgentMessage, fileOps: FileOperations): void {
  if (message.role !== "assistant") return;
  const content = message.content as any[];
  for (const block of content) {
    if (block.type === "toolCall") {
      const args = block.arguments as Record<string, unknown> | undefined;
      if (!args) continue;
      const path = typeof args.path === "string" ? args.path : undefined;
      if (!path) continue;
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

export function computeFileLists(fileOps: FileOperations): { readFiles: string[]; modifiedFiles: string[] } {
  const modified = new Set([...fileOps.edited, ...fileOps.written]);
  const readOnly = [...fileOps.read].filter((f) => !modified.has(f)).sort();
  const modifiedFiles = [...modified].sort();
  return { readFiles: readOnly, modifiedFiles };
}

export function formatFileOperations(readFiles: string[], modifiedFiles: string[]): string {
  const sections: string[] = [];
  if (readFiles.length > 0) sections.push(`<read-files>\n${readFiles.join("\n")}\n</read-files>`);
  if (modifiedFiles.length > 0) sections.push(`<modified-files>\n${modifiedFiles.join("\n")}\n</modified-files>`);
  return sections.length ? `\n\n${sections.join("\n\n")}` : "";
}

// ============================================================================
// Token Estimation
// ============================================================================

export function estimateTokens(message: AgentMessage): number {
  return 0; // stub - would use from compaction module
}

/**
 * Serialize branch messages into a prompt-friendly transcript.
 */
export function serializeBranchMessages(messages: AgentMessage[]): string {
  return messages.map((msg) => {
    const role = msg.role.toUpperCase();
    const content = msg.content as any[];
    const parts = content.map((block) => {
      if (block.type === 'text') return block.text;
      if (block.type === 'thinking') return `[Thinking: ${block.thinking}]`;
      if (block.type === 'toolCall')
        return `[Tool Call: ${block.name}(${JSON.stringify(block.arguments ?? {})})]`;
      if (block.type === 'toolResult')
        return `[Tool Result: ${block.isError ? 'error' : 'ok'}] ${block.text ?? ''}`;
      return '';
    });
    return `[${role}]: ${parts.join(' ')}`;
  }).join('\n\n');
}

// ============================================================================
// Entry Collection
// ============================================================================

/**
 * Collect entries to summarize when navigating from oldLeafId to targetId.
 */
export function collectEntriesForBranchSummary(
  session: SessionManager,
  oldLeafId: string | null,
  targetId: string
): CollectEntriesResult {
  if (!oldLeafId) {
    return { entries: [], commonAncestorId: null };
  }

  const oldBranch = session.getBranch(oldLeafId) as SessionEntry[];
  const oldPath = new Set(oldBranch.map(e => e.id));
  const targetPath = session.getBranch(targetId) as SessionEntry[];

  let commonAncestorId: string | null = null;
  for (let i = targetPath.length - 1; i >= 0; i--) {
    if (oldPath.has(targetPath[i].id)) {
      commonAncestorId = targetPath[i].id;
      break;
    }
  }

  const entries: SessionEntry[] = [];
  let current: string | null = oldLeafId;
  while (current && current !== commonAncestorId) {
    const entry = session.getEntry(current);
    if (!entry) break;
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
export function getMessageFromEntry(entry: SessionEntry): AgentMessage | undefined {
  if (entry.type === "message") {
    return entry.message;
  }
  // custom_message, branch_summary, compaction could be converted
  return undefined;
}

/**
 * Prepare branch entries for summarization with token budget.
 */
export function prepareBranchEntries(entries: SessionEntry[], tokenBudget: number = 0): BranchPreparation {
  const messages: AgentMessage[] = [];
  const fileOps = createFileOps();
  let totalTokens = 0;

  // Collect file ops from all entries (including previous summaries)
  for (const entry of entries) {
    if (entry.type === "branch_summary" && entry.details) {
      const details = entry.details as BranchSummaryDetails;
      for (const f of details.readFiles) fileOps.read.add(f);
      for (const f of details.modifiedFiles) fileOps.edited.add(f);
    }
  }

  // Walk from newest to oldest
  for (let i = entries.length - 1; i >= 0; i--) {
    const message = getMessageFromEntry(entries[i]);
    if (!message) continue;

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

export async function generateBranchSummary(
  entries: SessionEntry[],
  options: GenerateBranchSummaryOptions
): Promise<BranchSummaryResult> {
  const { signal, customInstructions, replaceInstructions, reserveTokens = 16384 } = options;

  if (signal.aborted) {
    return { aborted: true };
  }

  // Prepare entries (file ops + messages)
  const { fileOps, messages } = prepareBranchEntries(entries, reserveTokens);

  // Build system prompt for the LLM summarization
  let systemPrompt = BRANCH_SUMMARY_PROMPT;
  if (customInstructions && !replaceInstructions) {
    systemPrompt += `\n\nAdditional focus: ${customInstructions}`;
  }

  const readFiles = [...fileOps.read].sort();
  const modifiedFiles = [...new Set([...fileOps.edited, ...fileOps.written])].sort();
  const fileOpsText = formatFileOperations(readFiles, modifiedFiles);
  if (fileOpsText) {
    systemPrompt += `\n\nFiles accessed during this branch:\n${fileOpsText}`;
  }

  const userPrompt = `Summarize this abandoned conversation branch:\n\n${serializeBranchMessages(messages)}`;

  try {
    const context = {
      systemPrompt,
      messages: [
        { role: 'user' as const, content: userPrompt, timestamp: Date.now() },
      ],
    };

    const llmResult = await complete(options.model, context, {
      maxTokens: 2000,
      temperature: 0.3,
      signal: options.signal,
      apiKey: options.apiKey,
      headers: options.headers,
    });

    const content = llmResult.content;
    let summary: string;
    if (Array.isArray(content)) {
      summary = content.map((c: any) => c.text || '').join('').trim();
    } else if (typeof content === 'string') {
      summary = content.trim();
    } else {
      summary = '';
    }

    if (!summary) {
      throw new Error('LLM returned empty summary');
    }

    // Prepend preamble so readers know this is a branch exploration summary
    const fullSummary = `${BRANCH_SUMMARY_PREAMBLE.trim()}\n\n${summary}`;

    // Append file operations list (matches stub format used by tests)
    const finalFileOpsText = formatFileOperations(readFiles, modifiedFiles);
    const finalSummary = finalFileOpsText ? `${fullSummary}${finalFileOpsText}` : fullSummary;

    return {
      summary: finalSummary,
      details: { readFiles, modifiedFiles },
    };
  } catch (err) {
    if (options.signal.aborted) {
      return { aborted: true };
    }
    // Fallback to structured stub summary on failure
    const msgCount = entries.filter(
      (e) => e.type === "message" || e.type === "custom_message"
    ).length;
    const summaryParts: string[] = [
      BRANCH_SUMMARY_PREAMBLE.trim(),
      `\n## Goal\nUser explored ${msgCount} messages in this branch.`,
      `\n## Constraints & Preferences\n(none)`,
      `\n## Progress\n### In Progress\n- [ ] Branch exploration (incomplete)`,
      `\n## Key Decisions\n- [None recorded]`,
    ];
    if (customInstructions && !replaceInstructions) {
      summaryParts.push(`\n\nAdditional focus: ${customInstructions}`);
    }
    const summary = summaryParts.join("");
    const finalFileOpsText = formatFileOperations(readFiles, modifiedFiles);
    const finalSummary = finalFileOpsText ? `${summary}${finalFileOpsText}` : summary;
    return {
      summary: finalSummary,
      details: { readFiles, modifiedFiles },
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
