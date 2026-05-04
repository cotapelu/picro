import type { Message, AssistantMessage, ToolCall, ToolResultMessage } from './types';

/**
 * Chuẩn hóa tool call ID để tương thích với provider yêu cầu định dạng ID đặc biệt.
 */
function normalizeToolId(rawId: string): string {
  const baseId = rawId.split('|')[0];
  return baseId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

/**
 * Kiểm tra xem assistant message có nên bỏ qua (lỗi hoặc bị hủy)
 */
function shouldSkipMessage(msg: Message): boolean {
  if (msg.role !== 'assistant') return false;
  const assistant = msg as AssistantMessage;
  return assistant.stopReason === 'error' || assistant.stopReason === 'aborted';
}

/**
 * Biến đổi lịch sử tin nhắn để tương thích provider.
 */
export function transformMessages(messages: Message[]): Message[] {
  const transformed: Message[] = [];
  let pendingToolCalls: ToolCall[] = [];
  const seenToolResultIds = new Set<string>();

  for (const msg of messages) {
    if (shouldSkipMessage(msg)) {
      pendingToolCalls = [];
      continue;
    }

    if (msg.role === 'assistant') {
      const assistant = msg as AssistantMessage;

      // Chèn synthetic tool results cho pending tool calls chưa có kết quả
      for (const tc of pendingToolCalls) {
        if (!seenToolResultIds.has(tc.id)) {
          transformed.push({
            role: 'toolResult',
            toolCallId: tc.id,
            toolName: tc.name,
            content: [{ type: 'text', text: 'No result provided' }],
            isError: true,
            timestamp: Date.now(),
          } as ToolResultMessage);
        }
      }
      pendingToolCalls = [];
      seenToolResultIds.clear();

      // Theo dõi tool calls từ assistant message hiện tại
      const currentToolCalls = assistant.content.filter((b): b is ToolCall => b.type === 'toolCall');
      pendingToolCalls = currentToolCalls;

      // Biến đổi content blocks
      const updatedContent = assistant.content.map(block => {
        if (block.type === 'toolCall' && block.id.includes('|')) {
          return { ...block, id: normalizeToolId(block.id) };
        }
        if (block.type === 'thinking') {
          return { type: 'text' as const, text: `[Thinking: ${block.thinking.slice(0, 200)}...]` };
        }
        return block;
      });

      transformed.push({ ...assistant, content: updatedContent });
    } else if (msg.role === 'toolResult') {
      seenToolResultIds.add(msg.toolCallId);
      transformed.push(msg);
    } else if (msg.role === 'user') {
      // Chèn synthetic results cho pending tool calls trước tin nhắn user
      for (const tc of pendingToolCalls) {
        if (!seenToolResultIds.has(tc.id)) {
          transformed.push({
            role: 'toolResult',
            toolCallId: tc.id,
            toolName: tc.name,
            content: [{ type: 'text', text: 'No result provided' }],
            isError: true,
            timestamp: Date.now(),
          } as ToolResultMessage);
        }
      }
      pendingToolCalls = [];
      seenToolResultIds.clear();
      transformed.push(msg);
    } else {
      transformed.push(msg);
    }
  }

  // Xử lý các pending tool calls còn lại sau vòng lặp
  for (const tc of pendingToolCalls) {
    if (!seenToolResultIds.has(tc.id)) {
      transformed.push({
        role: 'toolResult',
        toolCallId: tc.id,
        toolName: tc.name,
        content: [{ type: 'text', text: 'No result provided' }],
        isError: true,
        timestamp: Date.now(),
      } as ToolResultMessage);
    }
  }

  return transformed;
}

/**
 * Loại bỏ các assistant message rỗng khỏi lịch sử.
 */
export function transformAssistantMessages(messages: Message[]): Message[] {
  return messages.filter(msg => {
    if (msg.role !== 'assistant') return true;
    return msg.content.some(block => {
      if (block.type === 'text') return (block as any).text?.trim().length > 0;
      if (block.type === 'thinking') return (block as any).thinking?.trim().length > 0;
      return true;
    });
  });
}
