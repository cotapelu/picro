/** @jsxImportSource react */
import { useEffect, useState, useCallback } from 'react';
import type { Message, ToolCall } from '../types.js';
import type { AgentSessionRuntimeEvent } from '../../../runtime/index.js';

// Extend runtime with session methods we need
type ExtendedRuntime = import('../../../runtime/index.js').AgentSessionRuntimeInterface & {
  session: {
    messages: any[];
    isStreaming: boolean;
    thinkingLevel: string;
    // Methods
    prompt(text: string, options?: any): Promise<void>;
    abort(): void;
    getSteeringMessages(): readonly string[];
    getFollowUpMessages(): readonly string[];
    getToolDefinition(name: string): any;
    cycleThinkingLevel(): string | undefined;
    setModel(model: any): Promise<void>;
    sessionManager: {
      getSessionName(): string | undefined;
      getEntries(): any[];
      getCwd(): string;
    };
  };
  settings?: { get?(key: string): any; set?(key: string, value: any): void; save?(): Promise<void> };
};

function agentMessageToUiMessage(msg: any): Message | null {
  if (!msg || typeof msg !== 'object') return null;
  let role: any; // 'user' | 'assistant' | 'tool' | 'bashExecution' | 'compactionSummary' | 'branchSummary' | 'custom'
  let content = '';
  let toolCalls: ToolCall[] | undefined;
  let thinkingBlocks: string[] | undefined;

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
        else if (c.type === 'toolCall') {
          // toolCalls handled below
        }
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
    // Preserve bash fields in the returned Message
    const bashMsg: any = {
      bashCommand: msg.command,
      bashOutput: msg.output,
      bashExitCode: msg.exitCode,
      bashCancelled: msg.cancelled,
      bashTruncated: msg.truncated,
    };
    return { ...bashMsg, id: msg.id || `msg-${Date.now()}`, role, timestamp: msg.timestamp || Date.now(), content: '', streaming: false } as Message;
  } else if (msg.role === 'compactionSummary') {
    role = 'compactionSummary';
    content = (msg as any).summary?.toString() || msg.content?.toString() || '[Compaction Summary]';
    const result: Message = { ...base, role: 'compactionSummary' as const, content };
    if (typeof (msg as any).tokensBefore === 'number') {
      (result as any).tokensBefore = (msg as any).tokensBefore;
    }
    return result;
  } else if (msg.role === 'branchSummary') {
    role = 'branchSummary';
    content = (msg as any).summary?.toString() || msg.content?.toString() || '[Branch Summary]';
    const result: Message = { ...base, role: 'branchSummary' as const, content };
    if (typeof (msg as any).fromId === 'string') {
      (result as any).fromId = (msg as any).fromId;
    }
    return result;
  } else if (msg.role === 'custom') {
    role = 'custom';
    const customType = msg.customType;
    const contentStr = (msg.content && typeof msg.content === 'object')
      ? JSON.stringify(msg.content)
      : msg.content?.toString() || '[Custom]';
    const result: Message = { ...base, role: 'custom' as const, content: contentStr, customType };
    return result;
  }

  return {
    id: msg.id || `msg-${Date.now()}`,
    role,
    content,
    timestamp: msg.timestamp || Date.now(),
    toolCalls,
    thinkingBlocks,
    streaming: false,
  };
}

export function useRuntime(runtime: ExtendedRuntime) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState('Ready');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCompacting, setIsCompacting] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [toolOutputExpanded, setToolOutputExpanded] = useState(false);
  const [hideThinkingBlock, setHideThinkingBlock] = useState(false);
  const [hiddenThinkingLabel, setHiddenThinkingLabel] = useState('Thinking...');
  const [currentModel, setCurrentModel] = useState<any>(null);
  const [thinkingLevel, setThinkingLevelState] = useState<any>(() => {
    try { return runtime.thinkingLevel ?? 'medium'; } catch { return 'medium'; }
  });

  const [steeringMessages, setSteeringMessages] = useState<string[]>([]);
  const [followUpMessages, setFollowUpMessages] = useState<string[]>([]);

  // Load initial messages
  useEffect(() => {
    const sessionMsgs = runtime.session.messages;
    if (Array.isArray(sessionMsgs)) {
      const initial = sessionMsgs
        .map(agentMessageToUiMessage)
        .filter((msg): msg is Message => msg !== null);
      setMessages(initial);
    }
  }, [runtime]);

  // Subscribe to events
  useEffect(() => {
    const session = runtime.session as any;
    const unsubscribe = session.subscribe((event: any) => {
      switch (event.type) {
        case 'agent_start':
          setIsStreaming(true);
          setStatus('Running...');
          break;
        case 'agent_end':
          setIsStreaming(false);
          setStatus('Ready');
          break;
        case 'queue_update':
          setSteeringMessages(Array.isArray(event.steering) ? event.steering : []);
          setFollowUpMessages(Array.isArray(event.followUp) ? event.followUp : []);
          break;
        case 'compaction_start':
          setIsCompacting(true);
          break;
        case 'compaction_end':
          setIsCompacting(false);
          break;
        case 'auto_retry_start':
          setRetryAttempt(event.attempt ?? 0);
          break;
        case 'auto_retry_end':
          setRetryAttempt(0);
          break;
        case 'model_change':
          setCurrentModel(event.model ?? null);
          setThinkingLevelState(runtime.thinkingLevel ?? thinkingLevel);
          break;
        case 'error':
          setStatus(`Error: ${event.error}`);
          break;
        case 'session_tree':
          // Rebuild full message list from session after branch navigation
          const sessionMsgs = (runtime.session as any).messages;
          if (Array.isArray(sessionMsgs)) {
            const allMessages = sessionMsgs
              .map(agentMessageToUiMessage)
              .filter((msg): msg is Message => msg !== null);
            setMessages(allMessages);
          }
          break;
        default:
          break;
      }
    });

    // Set initial model
    try {
      setCurrentModel(session.model);
    } catch {
      setCurrentModel(null);
    }

    return unsubscribe;
  }, [runtime, thinkingLevel]);

  const sendMessage = useCallback(async (text: string) => {
    await runtime.session.prompt(text);
  }, [runtime]);

  const abort = useCallback(() => {
    runtime.session.abort();
    setIsStreaming(false);
    setStatus('Aborted');
  }, [runtime]);

  const setThinkingLevel = useCallback(async (level: any) => {
    runtime.setThinkingLevel(level as any);
    setThinkingLevelState(level);
    try {
      if (runtime.settings?.set) {
        runtime.settings.set('defaultThinkingLevel', level);
        await runtime.settings.save?.();
      }
    } catch {
      // ignore
    }
  }, [runtime]);

  return {
    messages,
    status,
    isStreaming,
    isCompacting,
    retryAttempt,
    toolOutputExpanded,
    setToolOutputExpanded,
    hideThinkingBlock,
    setHideThinkingBlock,
    hiddenThinkingLabel,
    setHiddenThinkingLabel,
    steeringMessages,
    followUpMessages,
    currentModel,
    thinkingLevel,

    sendMessage,
    abort,
    setThinkingLevel,

    runtime,
  };
}
