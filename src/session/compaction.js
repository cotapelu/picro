// SPDX-License-Identifier: Apache-2.0
/**
 * Compaction - Session context compaction
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Token estimation từ usage và heuristic
 * - Cut point detection
 * - Compaction preparation
 * - Summarization (stub)
 */
import { complete } from "../llm/index.js";
const SUMMARIZATION_SYSTEM_PROMPT = `You are a summarization assistant. Your task is to create a concise summary of a conversation branch.
Include:
- Key decisions, conclusions, and outcomes
- Important code snippets, file paths, and data values
- Errors or issues encountered
- Current state and next steps (if any)
- Any context needed to continue the conversation without the full transcript.

Keep the summary under 4000 tokens. Be factual and succinct. Do not add commentary.`;
export const DEFAULT_COMPACTION_SETTINGS = {
    enabled: true,
    reserveTokens: 16384,
    keepRecentTokens: 20000,
};
export function createFileOps() {
    return {
        read: new Set(),
        written: new Set(),
        edited: new Set(),
    };
}
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
function extractTextContent(content) {
    return content
        .map((block) => {
        if (block.type === "text")
            return block.text;
        if (block.type === "thinking")
            return `[Thinking: ${block.thinking}]`;
        if (block.type === "toolCall")
            return `[Tool Call: ${block.name}(${JSON.stringify(block.arguments)})]`;
        return '';
    })
        .join(' ');
}
function serializeConversation(messages) {
    return messages.map((msg) => {
        const role = msg.role.toUpperCase();
        const text = extractTextContent(msg.content);
        return `[${role}]: ${text}`;
    }).join('\n\n');
}
export function computeFileLists(fileOps) {
    const modified = new Set([...fileOps.edited, ...fileOps.written]);
    const readOnly = [...fileOps.read].filter(f => !modified.has(f)).sort();
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
    let chars = 0;
    const role = message.role;
    if (role === 'user') {
        const content = message.content;
        if (typeof content === 'string') {
            chars = content.length;
        }
        else if (Array.isArray(content)) {
            for (const block of content) {
                if (block.type === 'text' && block.text) {
                    chars += block.text.length;
                }
            }
        }
        return Math.ceil(chars / 4);
    }
    if (role === 'assistant') {
        for (const block of message.content) {
            if (block.type === 'text') {
                chars += block.text.length;
            }
            else if (block.type === 'thinking') {
                chars += block.thinking.length;
            }
            else if (block.type === 'toolCall') {
                chars += block.name.length + JSON.stringify(block.arguments).length;
            }
        }
        return Math.ceil(chars / 4);
    }
    if (role === 'tool' || role === 'toolResult' || role === 'custom') {
        if (typeof message.content === 'string') {
            chars = message.content.length;
        }
        else {
            for (const block of message.content) {
                if (block.type === 'text' && block.text) {
                    chars += block.text.length;
                }
                if (block.type === 'image') {
                    chars += 4800;
                }
            }
        }
        return Math.ceil(chars / 4);
    }
    if (role === 'bashExecution') {
        chars = (message.command?.length || 0) + (message.output?.length || 0);
        return Math.ceil(chars / 4);
    }
    if (role === 'branchSummary' || role === 'compactionSummary') {
        chars = message.summary?.length || 0;
        return Math.ceil(chars / 4);
    }
    return 0;
}
/**
 * Simple total token estimation (sum of per-message estimates).
 */
export function estimateContextTokens(messages) {
    let total = 0;
    for (const msg of messages) {
        total += estimateTokens(msg);
    }
    return total;
}
export function findCutPoint(messages, keepRecentTokens) {
    let accumulatedTokens = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
        const msgTokens = estimateTokens(messages[i]);
        accumulatedTokens += msgTokens;
        if (accumulatedTokens >= keepRecentTokens) {
            // Found cut point
            const isUserMessage = messages[i].role === "user";
            return {
                firstKeptIndex: i,
                isSplitTurn: !isUserMessage,
            };
        }
    }
    return {
        firstKeptIndex: 0,
        isSplitTurn: false,
    };
}
// ============================================================================
// Compaction Check
// ============================================================================
export function calculateContextTokens(usage) {
    // usage can be from AgentMessage.usage or any compatible shape
    return (usage.total ??
        usage.totalTokens ??
        ((usage.input || 0) + (usage.output || 0) + (usage.cacheRead || 0) + (usage.cacheWrite || 0)));
}
/**
 * Get usage from an assistant message if available.
 * Skips aborted and error messages.
 */
export function getAssistantUsage(msg) {
    if (msg.role === "assistant" && "usage" in msg) {
        const assistantMsg = msg;
        if (assistantMsg.stopReason !== "aborted" && assistantMsg.stopReason !== "error" && assistantMsg.usage) {
            return assistantMsg.usage;
        }
    }
    return undefined;
}
/**
 * Estimate context tokens from messages, using last assistant usage when available.
 * Returns total tokens, tokens from usage, trailing tokens after usage, and index of last usage.
 */
export function estimateContextUsage(messages) {
    let lastUsageIndex = null;
    let usageTokens = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
        const usage = getAssistantUsage(messages[i]);
        if (usage) {
            lastUsageIndex = i;
            usageTokens = calculateContextTokens(usage);
            break;
        }
    }
    let trailingTokens = 0;
    if (lastUsageIndex !== null) {
        for (let i = lastUsageIndex + 1; i < messages.length; i++) {
            trailingTokens += estimateTokens(messages[i]);
        }
    }
    else {
        // No usage data, estimate all
        for (const msg of messages) {
            trailingTokens += estimateTokens(msg);
        }
    }
    return {
        tokens: usageTokens + trailingTokens,
        usageTokens,
        trailingTokens,
        lastUsageIndex,
    };
}
/**
 * Check if compaction should trigger based on context usage.
 */
export function shouldCompact(contextTokens, contextWindow, settings) {
    if (!settings.enabled)
        return false;
    return contextTokens > contextWindow - settings.reserveTokens;
}
export async function compactSession(messages, settings = DEFAULT_COMPACTION_SETTINGS, _llmSummarize) {
    const totalTokens = estimateContextTokens(messages);
    if (!shouldCompact(totalTokens, 128000, settings)) {
        return {
            summary: "",
            keptMessages: messages,
            discardedMessages: [],
        };
    }
    const cutPoint = findCutPoint(messages, settings.keepRecentTokens);
    const keptMessages = messages.slice(cutPoint.firstKeptIndex);
    const discardedMessages = messages.slice(0, cutPoint.firstKeptIndex);
    // For now, return simple placeholder summary
    // In real implementation, this would call LLM to summarize
    const summary = `[Compacted ${discardedMessages.length} messages, kept ${keptMessages.length} recent messages]`;
    return {
        summary,
        keptMessages,
        discardedMessages,
    };
}
/**
 * Extract AgentMessage from a SessionEntry.
 * Returns undefined for entries that don't contribute to LLM context.
 */
export function getMessageFromEntry(entry) {
    if (entry.type === "message") {
        return entry.message;
    }
    // Note: custom_message, branch_summary, compaction could be converted to AgentMessage
    // but for compaction prep we skip them (handled separately)
    return undefined;
}
/**
 * Find indices of valid cut points in entries array.
 * Returns array of indices that are valid cut positions (user, assistant, custom, bashExecution).
 */
export function findValidCutPoints(entries) {
    const cutPoints = [];
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.type === "message") {
            const role = entry.message.role;
            if (role === "user" || role === "assistant") {
                cutPoints.push(i);
            }
        }
        // Note: could add custom_message, bashExecution if they become AgentMessage
    }
    return cutPoints;
}
/**
 * Prepare compaction: determine what to summarize, token counts, file ops.
 * This is the core logic before LLM summarization.
 */
export function prepareCompaction(entries, settings) {
    // Convert entries to messages for token estimation
    const messages = [];
    const entryIndices = []; // track which entries correspond to which message
    for (let i = 0; i < entries.length; i++) {
        const msg = getMessageFromEntry(entries[i]);
        if (msg) {
            messages.push(msg);
            entryIndices.push(i);
        }
    }
    if (messages.length === 0)
        return null;
    // Estimate total tokens
    const estimate = estimateContextUsage(messages);
    // Don't check shouldCompact here; caller decides
    // Find cut point based on keepRecentTokens
    const cutPoint = findCutPoint(messages, settings.keepRecentTokens);
    const firstKeptMessageIndex = cutPoint.firstKeptIndex;
    const firstKeptEntryIndex = entryIndices[firstKeptMessageIndex];
    const firstKeptEntry = entries[firstKeptEntryIndex];
    const firstKeptEntryId = firstKeptEntry.id;
    // Messages to summarize = all before first kept
    const messagesToSummarize = messages.slice(0, firstKeptMessageIndex);
    // Turn prefix: if cut splits a turn, include the first kept message's earlier parts
    const turnPrefixMessages = [];
    if (cutPoint.isSplitTurn && firstKeptMessageIndex > 0) {
        // In a split turn, we keep the current message but need to summarize its preceding content
        // This is a simplification: in a real implementation, we would split the turn's content
        // For now, we treat it as: summarize the previous assistant turn fully
        // and keep the user message intact
        // TODO: implement proper turn splitting
    }
    // Previous summary: find last compaction before firstKeptEntry
    let previousSummary;
    for (let i = firstKeptEntryIndex - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry.type === "compaction") {
            previousSummary = entry.summary;
            break;
        }
    }
    // File operations extraction
    const fileOps = createFileOps();
    // From previous compaction entries before the cut point
    for (let i = 0; i < firstKeptEntryIndex; i++) {
        const entry = entries[i];
        if (entry.type === "compaction" && entry.details) {
            const details = entry.details;
            if (details.readFiles?.length) {
                for (const f of details.readFiles)
                    fileOps.read.add(f);
            }
            if (details.modifiedFiles?.length) {
                for (const f of details.modifiedFiles) {
                    fileOps.written.add(f);
                    fileOps.edited.add(f);
                }
            }
        }
    }
    // From messages (all messages)
    for (const msg of messages) {
        extractFileOpsFromMessage(msg, fileOps);
    }
    return {
        firstKeptEntryId,
        messagesToSummarize,
        turnPrefixMessages,
        isSplitTurn: cutPoint.isSplitTurn,
        tokensBefore: estimate.tokens,
        previousSummary,
        fileOps,
        settings,
    };
}
// TODO: Implement generateSummary() that calls LLM with proper prompts
// This requires LLM API access, model, apiKey, etc.
/**
 * Core compaction function that generates summary via LLM.
 * This is a stub - should call LLM API.
 */
export async function compact(preparation, _model, _apiKey, _headers, _customInstructions, _signal, _thinkingLevel) {
    const { messagesToSummarize, turnPrefixMessages, isSplitTurn, previousSummary, fileOps, firstKeptEntryId, tokensBefore } = preparation;
    // Compute file lists for details and prompt
    const { readFiles, modifiedFiles } = computeFileLists(fileOps);
    const fileOpsText = formatFileOperations(readFiles, modifiedFiles);
    // Build LLM prompt
    let systemPrompt = previousSummary
        ? `${SUMMARIZATION_SYSTEM_PROMPT}\n\nPrevious summary (for continuity):\n${previousSummary}`
        : SUMMARIZATION_SYSTEM_PROMPT;
    if (_customInstructions) {
        systemPrompt += `\n\nAdditional instructions:\n${_customInstructions}`;
    }
    const fullSystemPrompt = fileOpsText
        ? `${systemPrompt}\n\nFiles accessed during this branch:${fileOpsText}`
        : systemPrompt;
    const userPrompt = `Please summarize the following conversation:\n\n${serializeConversation(messagesToSummarize)}`;
    let summary;
    try {
        const model = _model;
        const context = {
            systemPrompt: fullSystemPrompt,
            messages: [
                { role: 'user', content: userPrompt, timestamp: Date.now() }
            ]
        };
        const llmResult = await complete(model, context, {
            maxTokens: 2000,
            temperature: 0.3,
            signal: _signal,
            apiKey: _apiKey,
            headers: _headers,
            reasoningEffort: _thinkingLevel,
        });
        const content = llmResult.content;
        if (Array.isArray(content)) {
            summary = content.map((c) => c.text || '').join('').trim();
        }
        else if (typeof content === 'string') {
            summary = content.trim();
        }
        else {
            summary = '';
        }
        if (!summary) {
            throw new Error('LLM returned empty summary');
        }
    }
    catch (err) {
        console.warn('Compaction LLM call failed, using stub summary:', err);
        // Fallback to a simple stub summary
        if (messagesToSummarize.length > 0) {
            summary = `[Stub] Summarized ${messagesToSummarize.length} messages`;
        }
        else {
            summary = '[No messages to summarize]';
        }
    }
    return {
        summary,
        firstKeptEntryId,
        tokensBefore,
        details: { readFiles, modifiedFiles },
    };
}
