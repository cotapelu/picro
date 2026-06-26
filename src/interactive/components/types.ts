// Common types for interactive components

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // ms, default 3000
  createdAt: number;
}

export interface ModalState {
  type: 'none' | 'login' | 'help' | 'thinking' | 'confirmation' |
        'session-selector' | 'model-selector' | 'settings' | 'custom';
  props?: Record<string, any>;
  onConfirm?: (result?: any) => void;
  onCancel?: () => void;
}

export interface InputState {
  value: string;
  placeholder?: string;
  history: string[];
  historyIndex: number;
  disabled?: boolean;
  multiline?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface StatusBarState {
  left: string;
  right: string;
  color?: string;
}

export interface InteractiveState {
  toasts: Toast[];
  modal: ModalState;
  input: InputState;
  messages: Message[];
  statusBar: StatusBarState;
  isProcessing: boolean;
  cwd: string;
}

// Event types from runtime
export type RuntimeEventType =
  | 'agent_start'
  | 'agent_end'
  | 'auto_retry_start'
  | 'auto_retry_end'
  | 'compaction_start'
  | 'compaction_end'
  | 'message_start'
  | 'message_update'
  | 'message_end'
  | 'tool_execution_start'
  | 'tool_execution_end';

export interface RuntimeEvent {
  type: RuntimeEventType;
  data?: any;
}
