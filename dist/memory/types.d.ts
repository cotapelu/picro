/**
 * Memory Types for Agent
 * Core type definitions for agent memory system
 */
export type AgentAction = 'read_file' | 'edit_file' | 'create_file' | 'delete_file' | 'execute_command' | 'user_input' | 'assistant_response' | 'tool_result' | 'final_answer' | 'ask_context' | 'project_info' | 'task_info';
export interface AgentMemoryMetadata {
    action: AgentAction;
    filePath?: string;
    project?: string;
    taskId?: string;
    summary?: string;
    toolName?: string;
    isError?: boolean;
}
export interface MemoryEntry {
    id: string;
    content: string;
    metadata: AgentMemoryMetadata;
    hash: string;
    version: number;
    created_at: string;
    updated_at: string;
}
export interface RetrievalResult {
    memories: MemoryEntry[];
    scores: number[];
    query: string;
}
export interface MemoryStats {
    total: number;
    byAction: Record<AgentAction, number>;
    byProject: Record<string, number>;
}
export interface MemoryQueryOptions {
    project?: string;
    action?: AgentAction;
    filePath?: string;
    taskId?: string;
    limit?: number;
}
//# sourceMappingURL=types.d.ts.map