/** @jsxImportSource react */
import { useEffect, useState, useCallback } from 'react';
import type { Message, ToolCall } from '../types.js';
import { agentMessageToUiMessage as convertAgentMessage } from '../utils/message-converter.js';
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
