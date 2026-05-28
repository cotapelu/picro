/**
 * Convert an agent session message to a UI message for rendering.
 * Extracted logic from useRuntime hook for testability and reuse.
 */
import type { Message } from '../types.js';

export function agentMessageToUiMessage(msg: any): Message | null {
  if (!msg || typeof msg !== 'object') return null;

  let role: UIMessage['role'];
  let content = '';
  let toolCalls: UIMessage['toolCalls'];
  let thinkingBlocks: UIMessage['thinkingBlocks'];
  const base = {
    id: msg.id || `msg-${Date.now()}`,
    timestamp: msg.timestamp || Date.now(),
  };

  if (msg.role === 'user') {
    role = 'user';
    if (typeof msg.content === 'string') {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      const textBlocks = msg.content.filter((c: any) => c.type === 'text');
      content = textBlocks.map((c: any) => c.text).join('') || '';
    }
  } else if (msg.role === 'assistant') {
    role = 'assistant';
    if (Array.isArray(msg.content)) {
      const textBlocks: string[] = [];
      const thinking: string[] = [];
      for (const c of msg.content) {
        if (c.type === 'text') textBlocks.push(c.text);
        else if (c.type === 'thinking') thinking.push(c.thinking);
      }
      content = textBlocks.join('');
      if (thinking.length > 0) thinkingBlocks = thinking;
      const toolCallBlocks = msg.content.filter((c: any) => c.type === 'toolCall');
      toolCalls = toolCallBlocks.map((c: any) => ({
        id: c.id,
        name: c.name,
        arguments: c.arguments,
        status: 'pending' as const,
      }));
    } else if (typeof msg.content === 'string') {
      content = msg.content;
    }
  } else if (msg.role === 'tool') {
    role = 'tool';
    if (Array.isArray(msg.content)) {
      content = msg.content.map((c: any) => c.text).join('') || '';
    } else {
      content = String(msg.content || '');
    }
  } else if (msg.role === 'bashExecution') {
    role = 'bashExecution';
    const bashMsg: any = {
      bashCommand: msg.command,
      bashOutput: msg.output,
      bashExitCode: msg.exitCode,
      bashCancelled: msg.cancelled,
      bashTruncated: msg.truncated,
    };
    return { ...base, ...bashMsg, role, content: '' };
  } else if (msg.role === 'compactionSummary') {
    role = 'compactionSummary';
    content = (msg as any).summary?.toString() || msg.content?.toString() || '[Compaction Summary]';
    const result: any = { ...base, role, content };
    if (typeof (msg as any).tokensBefore === 'number') {
      result.tokensBefore = (msg as any).tokensBefore;
    }
    return result;
  } else if (msg.role === 'branchSummary') {
    role = 'branchSummary';
    content = (msg as any).summary?.toString() || msg.content?.toString() || '[Branch Summary]';
    const result: any = { ...base, role, content };
    if (typeof (msg as any).fromId === 'string') {
      result.fromId = (msg as any).fromId;
    }
    return result;
  } else if (msg.role === 'custom') {
    role = 'custom';
    const customType = msg.customType;
    const contentStr = (msg.content && typeof msg.content === 'object')
      ? JSON.stringify(msg.content)
      : msg.content?.toString() || '[Custom]';
    return { ...base, role, content: contentStr, customType } as any;
  } else {
    return null;
  }

  return {
    ...base,
    role,
    content,
    toolCalls,
    thinkingBlocks,
  };
}
