/**
 * Memory Types for Agent
 * Core type definitions for agent memory system
 */

// Action types for agent
export type AgentAction =
  // File & command actions
  | 'read_file'
  | 'edit_file'
  | 'create_file'
  | 'delete_file'
  | 'execute_command'
  // Agent internal events
  | 'user_input'
  | 'assistant_response'
  | 'tool_result'
  | 'final_answer'
  // Project & task context
  | 'ask_context'
  | 'project_info'
  | 'task_info';

// Memory metadata for agent
export interface AgentMemoryMetadata {
  action: AgentAction;
  filePath?: string;
  project?: string;
  taskId?: string;
  summary?: string;
  // Tool result specific
  toolName?: string;
  isError?: boolean;
}

// Memory entry interface
export interface MemoryEntry {
  id: string;
  content: string;
  metadata: AgentMemoryMetadata;
  hash: string;
  version: number;
  created_at: string;
  updated_at: string;
}

// Retrieval result
export interface RetrievalResult {
  memories: MemoryEntry[];
  scores: number[];
  query: string;
}

// Memory stats
export interface MemoryStats {
  total: number;
  byAction: Record<AgentAction, number>;
  byProject: Record<string, number>;
}

// Query options
export interface MemoryQueryOptions {
  project?: string;
  action?: AgentAction;
  filePath?: string;
  taskId?: string;
  limit?: number;
}