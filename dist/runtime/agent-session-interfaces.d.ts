/**
 * Shared types for agent session interface
 * Used by both agent runtime and TUI components
 */
/**
 * Agent session interface - minimal interface for UI to interact with runtime
 */
export interface AgentSessionInterface {
    prompt(text: string, options?: {
        images?: unknown[];
    }): Promise<void>;
    subscribe(listener: (event: AgentSessionRuntimeEvent) => void): () => void;
    abort(): void;
    messages: unknown[];
    isStreaming: boolean;
    get thinkingLevel(): "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
    setThinkingLevel(level: "off" | "minimal" | "low" | "medium" | "high" | "xhigh"): void;
    getPerformanceStats?(): {
        sampleCount: number;
        timeSpanMS: number;
        avgCpuUserMS: number;
        avgCpuSystemMS: number;
        avgRSSMB: number;
        avgHeapUsedMB: number;
        peakRSSMB: number;
        peakHeapUsedMB: number;
    } | null;
}
/**
 * Agent session runtime interface for UI
 */
export interface AgentSessionRuntimeInterface {
    session: AgentSessionInterface;
    cwd: string;
    newSession(): Promise<{
        cancelled: boolean;
    }>;
    switchSession(path: string): Promise<{
        cancelled: boolean;
    }>;
    fork(entryId: string): Promise<{
        cancelled: boolean;
        selectedText?: string;
    }>;
    listSessions(): Promise<Array<{
        id: string;
        path: string;
        cwd: string;
        modified?: Date;
        name?: string;
        firstMessage?: string;
    }>>;
    setBeforeSessionInvalidate(handler: () => void): void;
    setRebindSession(handler: (sessionPath?: string) => Promise<void>): void;
    get settings(): any;
    get thinkingLevel(): "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
    setThinkingLevel(level: "off" | "minimal" | "low" | "medium" | "high" | "xhigh"): void;
    get authStorage(): {
        getProviders(): any[];
        setApiKey(provider: string, apiKey: string): Promise<void>;
        removeApiKey(provider: string): Promise<void>;
    };
    copyToClipboard(text: string): Promise<void>;
}
/**
 * Agent session event types (subset for UI handling)
 */
export type AgentSessionRuntimeEvent = {
    type: 'agent_start';
} | {
    type: 'agent_end';
} | {
    type: 'message_start';
    message: {
        role: string;
        id?: string;
    };
} | {
    type: 'message_update';
    message: {
        role: string;
        content?: unknown[];
    };
} | {
    type: 'message_end';
    message: {
        role: string;
        stopReason?: string;
    };
} | {
    type: 'tool_execution_start';
    toolCallId: string;
    toolName: string;
    args: unknown;
} | {
    type: 'tool_execution_update';
    toolCallId: string;
    partialResult?: unknown;
} | {
    type: 'tool_execution_end';
    toolCallId: string;
    result: unknown;
    isError?: boolean;
} | {
    type: 'queue_update';
    steering: readonly string[];
    followUp: readonly string[];
} | {
    type: 'error';
    error: string;
};
//# sourceMappingURL=agent-session-interfaces.d.ts.map