import type { Message } from '../types.js';
type ExtendedRuntime = import('../../../runtime/index.js').AgentSessionRuntimeInterface & {
    session: {
        messages: any[];
        isStreaming: boolean;
        thinkingLevel: string;
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
    settings?: {
        get?(key: string): any;
        set?(key: string, value: any): void;
        save?(): Promise<void>;
    };
};
export declare function useRuntime(runtime: ExtendedRuntime): {
    messages: Message[];
    status: string;
    isStreaming: boolean;
    isCompacting: boolean;
    retryAttempt: number;
    toolOutputExpanded: boolean;
    setToolOutputExpanded: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    hideThinkingBlock: boolean;
    setHideThinkingBlock: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    hiddenThinkingLabel: string;
    setHiddenThinkingLabel: import("react").Dispatch<import("react").SetStateAction<string>>;
    steeringMessages: string[];
    followUpMessages: string[];
    currentModel: any;
    thinkingLevel: any;
    sendMessage: (text: string) => Promise<void>;
    abort: () => void;
    setThinkingLevel: (level: any) => Promise<void>;
    runtime: ExtendedRuntime;
};
export {};
//# sourceMappingURL=useRuntime.d.ts.map