import type { Message, AssistantMessage, ImageContent, TextContent, ToolCall, ToolResultMessage, Tool } from './types.js';
import type { Model } from './types.js';

const NON_VISION_USER_IMAGE_PLACEHOLDER = "(image omitted: model does not support images)";
const NON_VISION_TOOL_IMAGE_PLACEHOLDER = "(tool image omitted: model does not support images)";

function replaceImagesWithPlaceholder(content: any[], placeholder: string): any[] {
  const result: TextContent[] = [];
  let previousWasPlaceholder = false;

  for (const block of content) {
    if (block.type === "image") {
      if (!previousWasPlaceholder) {
        result.push({ type: "text", text: placeholder });
      }
      previousWasPlaceholder = true;
      continue;
    }

    result.push(block);
    previousWasPlaceholder = block.text === placeholder;
  }

  return result;
}

function downgradeUnsupportedImages(messages: Message[], model: Model): Message[] {
  if (model.input.includes("image")) {
    return messages;
  }

  return messages.map((msg) => {
    if (msg.role === "user" && Array.isArray(msg.content)) {
      const hasImage = msg.content.some((block: any) => block.type === "image");
      if (!hasImage) return msg;
      return {
        ...msg,
        content: replaceImagesWithPlaceholder(msg.content, NON_VISION_USER_IMAGE_PLACEHOLDER),
      } as any;
    }

    if (msg.role === "toolResult" && Array.isArray(msg.content)) {
      const hasImage = msg.content.some((block: any) => block.type === "image");
      if (!hasImage) return msg;
      return {
        ...msg,
        content: replaceImagesWithPlaceholder(msg.content, NON_VISION_TOOL_IMAGE_PLACEHOLDER),
      } as any;
    }

    return msg;
  });
}

function normalizeToolId(rawId: string): string {
  const baseId = rawId.split('|')[0];
  return baseId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

/**
 * Chuẩn hóa tin nhắn cho provider OpenAI-compatible.
 * - Downgrade images nếu provider không hỗ trợ
 * - Normalize tool call IDs (dài quá, có ký tự đặc biệt)
 * - Xử lý thinking blocks (giữ nguyên cho cùng model, chuyển sang text cho khác model)
 * - Chèn synthetic tool results cho tool calls không có kết quả
 */
export function transformMessages(messages: Message[], model?: Model): Message[] {
  if (!model) {
    model = {
      id: '',
      name: '',
      api: 'openai' as any,
      provider: 'openai' as any,
      baseUrl: '',
      reasoning: false,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 0,
      maxTokens: 0,
    } as Model;
  };
  const toolCallIdMap = new Map<string, string>();
  const imageAwareMessages = downgradeUnsupportedImages(messages, model);

  // First pass: transform messages
  const transformed = imageAwareMessages.map((msg) => {
    if (msg.role === "user") {
      return msg;
    }

    if (msg.role === "toolResult") {
      const normalizedId = toolCallIdMap.get(msg.toolCallId);
      if (normalizedId && normalizedId !== msg.toolCallId) {
        return { ...msg, toolCallId: normalizedId } as any;
      }
      return msg;
    }

    if (msg.role === "assistant") {
      const assistantMsg = msg as AssistantMessage;
      const isSameModel =
        assistantMsg.provider === model.provider &&
        assistantMsg.api === model.api &&
        assistantMsg.model === model.id;

      const transformedContent = assistantMsg.content.flatMap((block) => {
        if (block.type === "thinking") {
          // Redacted thinking (encrypted) only valid for same model; drop for cross-model
          if ((block as any).redacted) {
            return isSameModel ? block : [];
          }
          // For same model: keep thinking blocks with signatures (needed for replay)
          if (isSameModel && (block as any).thinkingSignature) return block;
          // Skip empty thinking blocks, convert others to plain text
          const thinking = (block as any).thinking;
          if (!thinking || thinking.trim() === "") return [];
          if (isSameModel) return block;
          const maxPreview = 200;
          const preview = thinking.length > maxPreview ? thinking.slice(0, maxPreview) + '...' : thinking;
          return { type: "text" as const, text: `[Thinking: ${preview}]` };
        }

        if (block.type === "text") {
          if (isSameModel) return block;
          return { type: "text" as const, text: (block as any).text };
        }

        if (block.type === "toolCall") {
          const toolCall = block as ToolCall;
          let normalizedToolCall: ToolCall = toolCall;

          // Remove thoughtSignature for cross-model
          if (!isSameModel && (toolCall as any).thoughtSignature) {
            normalizedToolCall = { ...toolCall };
            delete (normalizedToolCall as any).thoughtSignature;
          }

          // Normalize tool call ID
          if (!isSameModel && (toolCall.id.includes('|') || toolCall.id.length > 64)) {
            const normalizedId = normalizeToolId(toolCall.id);
            if (normalizedId !== toolCall.id) {
              toolCallIdMap.set(toolCall.id, normalizedId);
              normalizedToolCall = { ...normalizedToolCall, id: normalizedId };
            }
          }

          return normalizedToolCall;
        }

        return block;
      });

      return {
        ...assistantMsg,
        content: transformedContent,
      } as AssistantMessage;
    }

    return msg;
  });

  // Second pass: insert synthetic empty tool results for orphaned tool calls
  const result: Message[] = [];
  let pendingToolCalls: ToolCall[] = [];
  let existingToolResultIds = new Set<string>();

  const insertSyntheticToolResults = () => {
    if (pendingToolCalls.length > 0) {
      for (const tc of pendingToolCalls) {
        if (!existingToolResultIds.has(tc.id)) {
          result.push({
            role: "toolResult",
            toolCallId: tc.id,
            toolName: tc.name,
            content: [{ type: "text", text: "No result provided" }],
            isError: true,
            timestamp: Date.now(),
          } as ToolResultMessage);
        }
      }
      pendingToolCalls = [];
      existingToolResultIds = new Set();
    }
  };

  for (let i = 0; i < transformed.length; i++) {
    const msg = transformed[i];

    if (msg.role === "assistant") {
      insertSyntheticToolResults();

      const assistantMsg = msg as AssistantMessage;
      // Skip errored/aborted assistant messages
      if (assistantMsg.stopReason === "error" || assistantMsg.stopReason === "aborted") {
        continue;
      }

      const toolCalls = assistantMsg.content.filter((b) => b.type === "toolCall") as ToolCall[];
      if (toolCalls.length > 0) {
        pendingToolCalls = toolCalls;
        existingToolResultIds = new Set();
      }

      result.push(msg);
    } else if (msg.role === "toolResult") {
      existingToolResultIds.add(msg.toolCallId);
      result.push(msg);
    } else if (msg.role === "user") {
      insertSyntheticToolResults();
      result.push(msg);
    } else {
      result.push(msg);
    }
  }

  insertSyntheticToolResults();

  return result;
}

/**
 * Loại bỏ assistant message rỗng (không có content nào có nghĩa)
 */
export function transformAssistantMessages(messages: Message[]): Message[] {
  return messages.filter(msg => {
    if (msg.role !== 'assistant') return true;
    return msg.content.some(block => {
      if (block.type === 'text') return (block as any).text?.trim().length > 0;
      if (block.type === 'thinking') return (block as any).thinking?.trim().length > 0;
      return true; // toolCall
    });
  });
}
