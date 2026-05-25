/**
 * Cấu hình tương thích cho OpenAI-compatible providers.
 */
export interface CompatSettings {
    supportsStore: boolean;
    supportsDeveloperRole: boolean;
    supportsReasoningEffort: boolean;
    reasoningEffortMap: Record<string, string>;
    reportUsageInStream: boolean;
    maxTokensParam: 'max_tokens' | 'max_completion_tokens';
    strictModeAvailable: boolean;
    needToolResultName: boolean;
    insertAssistantBetweenToolAndUser: boolean;
    requiresThinkingAsText: boolean;
    thinkingFormat: 'openai' | 'zai' | 'qwen' | 'openrouter';
    enableToolStreaming: boolean;
    openRouterSettings: Record<string, any>;
    vercelGatewaySettings: {
        allowed?: string[];
        preferredOrder?: string[];
    };
}
/**
 * Tự động nhận diện cấu hình tương thích dựa trên provider và base URL.
 */
export declare function detectCompat(provider: string, apiBaseUrl: string, modelId?: string): Required<CompatSettings>;
/**
 * Gộp cấu hình người dùng với cấu hình tự động nhận diện.
 */
export declare function mergeCompat(detected: Required<CompatSettings>, userProvided?: Partial<CompatSettings>): Required<CompatSettings>;
//# sourceMappingURL=compat-detection.d.ts.map