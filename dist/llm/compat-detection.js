"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectCompat = detectCompat;
exports.mergeCompat = mergeCompat;
/**
 * Tự động nhận diện cấu hình tương thích dựa trên provider và base URL.
 */
function detectCompat(provider, apiBaseUrl, modelId) {
    const normalizedUrl = apiBaseUrl.toLowerCase();
    const normalizedProvider = provider.toLowerCase();
    // Nhận diện các provider đặc biệt
    const isZaiProvider = normalizedProvider === 'zai' || normalizedUrl.includes('api.z.ai');
    const isNonStandardEndpoint = [
        'cerebras.ai', 'api.x.ai', 'chutes.ai', 'deepseek.com', 'opencode.ai'
    ].some(domain => normalizedUrl.includes(domain)) || ['cerebras', 'xai', 'opencode'].includes(normalizedProvider);
    const isChutesEndpoint = normalizedUrl.includes('chutes.ai');
    const isGrokProvider = normalizedProvider === 'xai' || normalizedUrl.includes('api.x.ai');
    const isGroqProvider = normalizedProvider === 'groq' || normalizedUrl.includes('groq.com');
    const isOpenRouter = normalizedUrl.includes('openrouter.ai');
    // Qwen trên Groq
    const isQwenOnGroq = isGroqProvider && modelId?.includes('qwen');
    return {
        supportsStore: !isNonStandardEndpoint,
        supportsDeveloperRole: !isNonStandardEndpoint,
        supportsReasoningEffort: !isGrokProvider && !isZaiProvider,
        reasoningEffortMap: isQwenOnGroq ? {
            minimal: 'default', low: 'default', medium: 'default', high: 'default', xhigh: 'default'
        } : {},
        reportUsageInStream: true,
        maxTokensParam: isChutesEndpoint ? 'max_tokens' : 'max_completion_tokens',
        needToolResultName: false,
        insertAssistantBetweenToolAndUser: false,
        requiresThinkingAsText: false,
        thinkingFormat: isZaiProvider ? 'zai' : isOpenRouter ? 'openrouter' : 'openai',
        enableToolStreaming: false,
        openRouterSettings: {},
        vercelGatewaySettings: {},
        strictModeAvailable: true,
    };
}
/**
 * Gộp cấu hình người dùng với cấu hình tự động nhận diện.
 */
function mergeCompat(detected, userProvided) {
    if (!userProvided)
        return detected;
    return {
        supportsStore: userProvided.supportsStore ?? detected.supportsStore,
        supportsDeveloperRole: userProvided.supportsDeveloperRole ?? detected.supportsDeveloperRole,
        supportsReasoningEffort: userProvided.supportsReasoningEffort ?? detected.supportsReasoningEffort,
        reasoningEffortMap: { ...detected.reasoningEffortMap, ...userProvided.reasoningEffortMap },
        reportUsageInStream: userProvided.reportUsageInStream ?? detected.reportUsageInStream,
        maxTokensParam: userProvided.maxTokensParam ?? detected.maxTokensParam,
        needToolResultName: userProvided.needToolResultName ?? detected.needToolResultName,
        insertAssistantBetweenToolAndUser: userProvided.insertAssistantBetweenToolAndUser ?? detected.insertAssistantBetweenToolAndUser,
        requiresThinkingAsText: userProvided.requiresThinkingAsText ?? detected.requiresThinkingAsText,
        thinkingFormat: userProvided.thinkingFormat ?? detected.thinkingFormat,
        enableToolStreaming: userProvided.enableToolStreaming ?? detected.enableToolStreaming,
        openRouterSettings: { ...detected.openRouterSettings, ...userProvided.openRouterSettings },
        vercelGatewaySettings: { ...detected.vercelGatewaySettings, ...userProvided.vercelGatewaySettings },
        strictModeAvailable: userProvided.strictModeAvailable ?? detected.strictModeAvailable,
    };
}
//# sourceMappingURL=compat-detection.js.map