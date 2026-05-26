export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'bashExecution' | 'compactionSummary' | 'branchSummary' | 'custom';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  thinkingBlocks?: string[];
  error?: string;
  streaming?: boolean;
  // Optional fields for special message types
  bashCommand?: string;
  bashOutput?: string;
  bashExitCode?: number;
  bashCancelled?: boolean;
  bashTruncated?: boolean;
  // Compaction summary
  tokensBefore?: number;
  // Branch summary
  fromId?: string;
  // Custom message
  customType?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: 'pending' | 'running' | 'done' | 'error';
  result?: unknown;
}
