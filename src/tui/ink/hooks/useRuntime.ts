/** @jsxImportSource react */
import { useEffect, useState, useCallback } from 'react';
import type { Message } from '../types';

// Minimal types for agent session events
type AgentSessionEvent =
  | { type: 'agent_start' }
  | { type: 'agent_end' }
  | { type: 'message_start'; message: { role: string; id?: string } }
  | { type: 'message_update'; message: { role: string; id?: string; content?: any[] } }
  | { type: 'message_end'; message: { role: string; id?: string; stopReason?: string } }
  | { type: 'tool_execution_start'; toolCallId: string; toolName: string; args: any }
  | { type: 'tool_execution_update'; toolCallId: string; partialResult?: any }
  | { type: 'tool_execution_end'; toolCallId: string; result: any; isError?: boolean }
  | { type: 'queue_update' }
  | { type: 'error'; error: string };

// Minimal runtime interface
interface AgentSessionInterface {
  prompt(text: string, options?: { images?: unknown[] }): Promise<void>;
  subscribe(listener: (event: AgentSessionEvent) => void): () => void;
  abort(): void;
  messages: any[];
  isStreaming: boolean;
}

interface AgentSessionRuntimeInterface {
  session: AgentSessionInterface;
  // Thinking level (delegated to session)
  thinkingLevel: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  setThinkingLevel(level: "off" | "minimal" | "low" | "medium" | "high" | "xhigh"): void;
  // Settings
  settings?: { get(key: string): any; set(key: string, value: any): void; save?(): Promise<void> };
  // Auth
  authStorage?: { setApiKey(provider: string, apiKey: string): Promise<void>; removeApiKey(provider: string): Promise<void>; };
  // Clipboard
  copyToClipboard?(text: string): Promise<void>;
}

// Convert from ConversationTurn to Message UI type
function turnToMessage(turn: any): Message {
  let role: 'user' | 'assistant' | 'tool' = 'user';
  let content = '';
  let toolCalls: any[] | undefined;

  if (turn.role === 'user') {
    role = 'user';
    content = turn.content?.map((c: any) => c.type === 'text' ? c.text : '').join('') || '';
  } else if (turn.role === 'assistant') {
    role = 'assistant';
    content = turn.content?.map((c: any) => {
      if (c.type === 'text') return c.text;
      if (c.type === 'thinking') return `[Thinking: ${c.thinking}]`;
      return '';
    }).join('') || '';
    toolCalls = turn.content
      ?.filter((c: any) => c.type === 'toolCall')
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        arguments: c.arguments,
        status: 'pending' as const,
      }));
  } else if (turn.role === 'tool') {
    role = 'tool';
    content = turn.content?.map((c: any) => c.text).join('') || '';
  }

  return {
    id: turn.id || `msg-${Date.now()}`,
    role,
    content,
    timestamp: turn.timestamp || Date.now(),
    toolCalls,
    streaming: false,
  };
}

export function useRuntime(runtime: AgentSessionRuntimeInterface) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState('Ready');
  const [thinkingLevel, setThinkingLevel] = useState('medium');
  const [isStreaming, setIsStreaming] = useState(false);

  // Sync thinking level from runtime
  useEffect(() => {
    const level = runtime.thinkingLevel as any;
    if (level) setThinkingLevel(level);
  }, [runtime.thinkingLevel]);

  // Load initial messages on mount
  useEffect(() => {
    if (runtime.session.messages) {
      const initial = runtime.session.messages
        .map(turnToMessage)
        .filter((msg): msg is Message => msg !== null);
      setMessages(initial);
    }
  }, [runtime]);

  // Subscribe to events
  useEffect(() => {
    const unsubscribe = runtime.session.subscribe((event: AgentSessionEvent) => {
      switch (event.type) {
        case 'agent_start':
          setIsStreaming(true);
          setStatus('Running...');
          break;
        case 'agent_end':
          setIsStreaming(false);
          setStatus('Ready');
          break;
        case 'message_start':
          setMessages((prev) => {
            const newMsg: Message = {
              id: event.message.id || `stream-${Date.now()}`,
              role: event.message.role as any,
              content: '',
              timestamp: Date.now(),
              streaming: true,
            };
            return [...prev, newMsg];
          });
          break;
        case 'message_update':
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.streaming && msg.id === event.message.id) {
                const newContent = event.message.content
                  ?.map((c: any) => {
                    if (c.type === 'text') return c.text;
                    if (c.type === 'thinking') return `[Thinking: ${c.thinking}]`;
                    if (c.type === 'toolCall') return `[Tool: ${c.name}]`;
                    return '';
                  })
                  .join('') || msg.content;
                return { ...msg, content: newContent };
              }
              return msg;
            })
          );
          break;
        case 'message_end':
          setMessages((prev) =>
            prev.map((msg) =>
              msg.streaming && msg.id === event.message.id
                ? { ...msg, streaming: false }
                : msg
            )
          );
          setIsStreaming(false);
          setStatus('Ready');
          break;
        case 'tool_execution_start':
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.streaming && msg.role === 'assistant') {
                const toolCall = {
                  id: event.toolCallId,
                  name: event.toolName,
                  arguments: event.args,
                  status: 'running' as const,
                };
                return {
                  ...msg,
                  toolCalls: [...(msg.toolCalls || []), toolCall],
                };
              }
              return msg;
            })
          );
          break;
        case 'tool_execution_end':
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.role === 'assistant' && msg.toolCalls) {
                return {
                  ...msg,
                  toolCalls: msg.toolCalls.map((tc) =>
                    tc.id === event.toolCallId
                      ? { ...tc, status: 'done' as const, result: event.result }
                      : tc
                  ),
                };
              }
              return msg;
            })
          );
          break;
        case 'error':
          setStatus(`Error: ${event.error}`);
          break;
        default:
          break;
      }
    });

    return unsubscribe;
  }, [runtime]);

  const sendMessage = useCallback(
    async (text: string) => {
      await runtime.session.prompt(text);
    },
    [runtime]
  );

  const abort = useCallback(() => {
    runtime.session.abort();
    setIsStreaming(false);
    setStatus('Aborted');
  }, [runtime]);

  const setThinkingLevelPersist = useCallback(async (level: "off" | "minimal" | "low" | "medium" | "high" | "xhigh") => {
    runtime.setThinkingLevel(level);
    setThinkingLevel(level);
    // Also persist to settings if possible
    try {
      if (runtime.settings) {
        runtime.settings.set('defaultThinkingLevel', level);
        await runtime.settings.save?.();
      }
    } catch {
      // ignore settings errors
    }
  }, [runtime]);

  const login = useCallback(async (provider: string, apiKey: string) => {
    if (!runtime.authStorage) throw new Error('Auth not available');
    await runtime.authStorage.setApiKey(provider, apiKey);
  }, [runtime]);

  const logout = useCallback(async (provider: string) => {
    if (!runtime.authStorage) throw new Error('Auth not available');
    await runtime.authStorage.removeApiKey(provider);
  }, [runtime]);

  const copyToClipboard = useCallback(async (text: string) => {
    if (runtime.copyToClipboard) {
      await runtime.copyToClipboard(text);
    } else {
      // Fallback: just log
      console.log('[clipboard]', text);
    }
  }, [runtime]);

  const clearMessages = useCallback(() => {
    // Not directly supported; we could create a new session or fork
    // For now, no-op or could call runtime.newSession()
  }, [runtime]);

  return {
    messages,
    status,
    thinkingLevel,
    isStreaming,
    sendMessage,
    abort,
    setThinkingLevel: setThinkingLevelPersist,
    login,
    logout,
    copyToClipboard,
    clearMessages,
    runtime: runtime as any, // expose full runtime for advanced use
  };
}
