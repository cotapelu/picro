// Event handlers for runtime session events
// Pure logic for compaction queue, retry handling

import type { AgentSessionRuntimeInterface } from '../runtime/index.js';
import type { InputState } from './components/types.js';

export interface AppEventHandlers {
  onCompactionStart?: (event: any) => void;
  onCompactionEnd?: (event: any) => void;
  onAutoRetryStart?: (event: any) => void;
  onAutoRetryEnd?: (event: any) => void;
  onAgentStart?: (event: any) => void;
  onAgentEnd?: (event: any) => void;
  onMessageStart?: (event: any) => void;
  onMessageUpdate?: (event: any) => void;
  onMessageEnd?: (event: any) => void;
  onToolExecutionStart?: (event: any) => void;
  onToolExecutionEnd?: (event: any) => void;
  addToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  setInputValue: (value: string | ((prev: InputState) => InputState)) => void;
  setMessages: (updater: (prev: any[]) => any[]) => void;
  sendMessage: (text: string) => Promise<void>;
}

/**
 * Create event handlers for runtime subscription
 * Returns unsubscribe function
 */
export function subscribeToRuntimeEvents(
  runtime: AgentSessionRuntimeInterface,
  handlers: AppEventHandlers
): () => void {
  const session = runtime.session as any;

  const unsubscribe = session?.subscribe?.((event: any) => {
    switch (event.type) {
      case 'agent_start':
        handlers.onAgentStart?.(event);
        break;
      case 'agent_end':
        handlers.onAgentEnd?.(event);
        break;
      case 'auto_retry_start':
        handlers.onAutoRetryStart?.(event);
        break;
      case 'auto_retry_end':
        handlers.onAutoRetryEnd?.(event);
        break;
      case 'compaction_start':
        handlers.onCompactionStart?.(event);
        break;
      case 'compaction_end':
        handlers.onCompactionEnd?.(event);
        break;
      case 'message_start':
        handlers.onMessageStart?.(event);
        break;
      case 'message_update':
        handlers.onMessageUpdate?.(event);
        break;
      case 'message_end':
        handlers.onMessageEnd?.(event);
        break;
      case 'tool_execution_start':
        handlers.onToolExecutionStart?.(event);
        break;
      case 'tool_execution_end':
        handlers.onToolExecutionEnd?.(event);
        break;
      default:
        break;
    }
  });

  return unsubscribe || (() => {});
}

/**
 * Handle compaction queued messages - flush after compaction/retry completes
 */
export async function flushCompactionQueue(
  queuedMessages: Array<{ text: string }>,
  sendMessage: (text: string) => Promise<void>,
  setInputValue: (value: string | ((prev: string) => string)) => void,
  addToast: (message: string, type?: 'info' | 'success' | 'error') => void
): Promise<void> {
  if (queuedMessages.length === 0) return;

  const queued = [...queuedMessages];
  // Clear queue before sending
  setInputValue('');

  for (const msg of queued) {
    try {
      await sendMessage(msg.text);
    } catch (err) {
      console.error('Flush after event failed:', err);
      const idx = queued.indexOf(msg);
      const remaining = queued.slice(idx).map(m => m.text);
      setInputValue(prev => prev ? `${prev}\n\n${remaining.join('\n\n')}` : remaining.join('\n\n'));
      addToast(`Failed to send queued message: ${(err as Error).message}`, 'error');
      break;
    }
  }
}
