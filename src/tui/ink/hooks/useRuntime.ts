/** @jsxImportSource react */
import { useEffect, useState, useCallback, useRef } from 'react';
import type { Message, ToolCall } from '../types.js';
import { agentMessageToUiMessage as convertAgentMessage } from '../utils/message-converter.js';
import type { AgentSessionRuntimeEvent } from '../../../runtime/index.js';

// Extend runtime with session methods we need
type ExtendedRuntime = import('../../../runtime/index.js').AgentSessionRuntimeInterface & {
  session: {
    messages: any[];
    isStreaming: boolean;
    thinkingLevel: string;
    // Event subscription
    subscribe(listener: (event: AgentSessionRuntimeEvent) => void): () => void;
    // Methods
    prompt(text: string, options?: any): Promise<void>;
    abort(): void;
    getSteeringMessages(): readonly string[];
    getFollowUpMessages(): readonly string[];
    clearQueue(): { steering: string[]; followUp: string[] };
    getToolDefinition(name: string): any;
    cycleThinkingLevel(): string | undefined;
    setModel(model: any): Promise<void>;
    cycleModel(direction?: 'next' | 'prev'): { model: any; thinkingLevel?: string } | undefined;
    setAutoCompactionEnabled(enabled: boolean): void;
    getContextUsage(): { tokens: number; contextWindow: number; percent: number } | undefined;
    getTree(): any[];
    getLeafId(): string | null;
    navigateTree(branchId: string, options?: { summarize?: boolean; customInstructions?: string }): Promise<{ cancelled: boolean; selectedText?: string }>;
    getSessionStats(): any;
    getUserMessagesForForking(): Array<{ entryId: string; text: string }>;
    getLastAssistantText(): string | undefined;
    compact(customInstructions?: { customInstructions?: string }): Promise<void>;
    abortCompaction(): void;
    abortRetry(): void;
    recordBashResult(command: string, output: string, exitCode: number, cancelled: boolean, truncated: boolean, fullOutputPath?: string, options?: { excludeFromContext?: boolean }): void;
    abortBash(): void;
    sessionManager: {
      getSessionName(): string | undefined;
      getEntries(): any[];
      getCwd(): string;
      setSessionName(name: string): void;
    };
    reload?(): Promise<void>;
    _extensionRunner?: any;
  };
  settings?: { get?(key: string): any; set?(key: string, value: any): void; save?(): Promise<void> };
};


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
  const streamingMessageIdRef = useRef<string | null>(null);

  // Load initial messages
  useEffect(() => {
    const sessionMsgs = runtime.session.messages;
    if (Array.isArray(sessionMsgs)) {
      const initial = sessionMsgs
        .map(convertAgentMessage)
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
          // Safety: clear any lingering streaming message
          if (streamingMessageIdRef.current) {
            streamingMessageIdRef.current = null;
          }
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
              .map(convertAgentMessage)
              .filter((msg): msg is Message => msg !== null);
            setMessages(allMessages);
          }
          break;
        // Streaming message handling
        case 'message_start': {
          const turn = event.message;
          if (!turn) break;
          const uiMsg = convertAgentMessage(turn);
          if (uiMsg) {
            const streamingMsg: Message = { ...uiMsg, streaming: true };
            setMessages(prev => [...prev, streamingMsg]);
            if (uiMsg.role === 'assistant') {
              streamingMessageIdRef.current = uiMsg.id;
            }
          }
          break;
        }
        case 'message_update': {
          const turn = event.message;
          if (!turn) break;
          const id = streamingMessageIdRef.current;
          if (!id) break;
          const uiMsg = convertAgentMessage({ ...turn, id });
          if (uiMsg) {
            setMessages(prev => prev.map(msg => msg.id === id ? { ...uiMsg, streaming: true } : msg));
          }
          break;
        }
        case 'message_end': {
          const turn = event.message;
          if (!turn) break;
          const role = turn.role as any;
          if (role === 'user') {
            // already added at start
            break;
          }
          const id = streamingMessageIdRef.current;
          if (!id) break;
          const uiMsg = convertAgentMessage(turn);
          if (uiMsg) {
            const stopReason = turn.stopReason;
            const isError = stopReason === 'error' || stopReason === 'aborted';
            setMessages(prev => prev.map(msg => msg.id === id ? { ...uiMsg, streaming: false, error: isError ? (stopReason || 'Error') : undefined } : msg));
          }
          streamingMessageIdRef.current = null;
          break;
        }
        case 'tool_execution_start': {
          const { toolCallId, toolName, args } = event;
          const id = streamingMessageIdRef.current;
          if (!id) break;
          setMessages(prev => prev.map(msg => {
            if (msg.id !== id) return msg;
            const existing = msg.toolCalls?.find(tc => tc.id === toolCallId);
            if (existing) {
              return {
                ...msg,
                toolCalls: msg.toolCalls?.map(tc => tc.id === toolCallId ? { ...tc, status: 'running' as const, arguments: args } : tc)
              };
            } else {
              const newTool: ToolCall = { id: toolCallId, name: toolName, arguments: args, status: 'running' };
              return { ...msg, toolCalls: [...(msg.toolCalls || []), newTool] };
            }
          }));
          break;
        }
        case 'tool_execution_end': {
          const { toolCallId, result, isError } = event;
          const id = streamingMessageIdRef.current;
          if (!id) break;
          setMessages(prev => prev.map(msg => {
            if (msg.id !== id) return msg;
            return {
              ...msg,
              toolCalls: (msg.toolCalls || []).map(tc => tc.id === toolCallId ? { ...tc, status: isError ? 'error' : 'done' as const, result } : tc),
            };
          }));
          break;
        }
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
    setMessages,

    runtime,
  };
}
