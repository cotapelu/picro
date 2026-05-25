/**
 * AgentSession - Core abstraction for agent lifecycle and session management.
 *
 * This class provides:
 * - Agent state access and event subscription
 * - Model and thinking level management
 * - Compaction (manual and auto)
 * - Queue management (steering/follow-up)
 * - Session persistence via SessionManager
 *
 * Designed as a clean-room implementation inspired by pi-agent-legacy
 * but with different internal architecture.
 */
import type { AgentRuntimeState, ThinkingLevel, ToolDefinition } from "../agent/types.js";
import { Agent } from "../agent/agent.js";
import type { Model } from "../llm/index.js";
import type { ModelRegistry } from "./model-registry.js";
import type { SessionManager, BranchSummaryEntry } from "../session/session-manager.js";
import type { SettingsManager } from "../runtime/settings-manager.js";
import type { ResourceLoader } from "../runtime/resource-loader.js";
export type { AgentSessionEventListener, AgentSessionConfig } from "./agent-session-types.js";
export type { AgentSessionEvent, QueueUpdateEvent, CompactionStartEvent, CompactionEndEvent, AutoRetryStartEvent, AutoRetryEndEvent, CompactionResult, PromptOptions, ModelCycleResult, SessionStats, ParsedSkillBlock } from "./agent-session-types.js";
/**
 * Session event listener type
 */
type SessionEventListener = (event: any) => void;
/**
 * AgentSession - High-level session management for the agent.
 *
 * Provides a clean API for:
 * - Sending prompts to the agent
 * - Managing model and thinking level
 * - Session persistence and branching
 * - Compaction and memory management
 * - Event subscription
 */
export declare class AgentSession {
    readonly agent: Agent;
    readonly sessionManager: SessionManager;
    readonly settingsManager: SettingsManager;
    readonly resourceLoader: ResourceLoader;
    readonly modelRegistry: ModelRegistry;
    private _config;
    private _extensionRunner?;
    private _extensionUIContext?;
    private _extensionCommandContextActions?;
    private _extensionShutdownHandler?;
    private _extensionErrorListener?;
    private _sessionStartEvent?;
    private _maxSteeringQueueSize?;
    private _maxFollowUpQueueSize?;
    private _performanceTracker?;
    private _enablePerformanceTracking;
    private _scopedModels;
    private _cwd;
    private _initialActiveToolNames?;
    private _allowedToolNames?;
    private _unsubscribeAgent?;
    private _eventListeners;
    private _steeringMessages;
    private _followUpMessages;
    private _compactionAbortController;
    private _autoCompactionAbortController;
    private _overflowRecoveryAttempted;
    private _bashAbortController;
    private _pendingBashMessages;
    private _branchSummaryAbortController;
    private _retryAbortController;
    private _retryAttempt;
    private _retryMaxAttempts;
    private _retryDelayMs;
    private _retryPromise;
    private _retryResolve;
    private _toolRegistry;
    private _toolDefinitions;
    private _toolPromptSnippets;
    private _toolPromptGuidelines;
    private _baseSystemPrompt;
    private _model?;
    private _thinkingLevel;
    private _pendingNextTurnMessages;
    private _lastAssistantMessage;
    private _turnIndex;
    private _emitter;
    /**
     * Create a new AgentSession.
     *
     * @param config - Configuration for the session
     */
    constructor(config: {
        agent: Agent;
        sessionManager: SessionManager;
        settingsManager: SettingsManager;
        cwd: string;
        scopedModels?: Array<{
            model: Model;
            thinkingLevel?: ThinkingLevel;
        }>;
        resourceLoader: ResourceLoader;
        customTools?: ToolDefinition[];
        modelRegistry: ModelRegistry;
        initialActiveToolNames?: string[];
        allowedToolNames?: string[];
        extensionRunner?: any;
        maxSteeringQueueSize?: number;
        maxFollowUpQueueSize?: number;
        enablePerformanceTracking?: boolean;
    });
    /** Current model (may be undefined if not yet selected) */
    get model(): Model | undefined;
    /** Current thinking level */
    get thinkingLevel(): ThinkingLevel;
    /** Whether agent is currently running */
    get isStreaming(): boolean;
    /** Current effective system prompt */
    get systemPrompt(): string;
    /** Current retry attempt (0 if not retrying) */
    get retryAttempt(): number;
    /** Current session file path, or undefined if sessions are disabled */
    get sessionFile(): string | undefined;
    /** Current session ID */
    get sessionId(): string;
    /** Current session display name, if set */
    get sessionName(): string | undefined;
    /** Scoped models for cycling (from --models flag) */
    get scopedModels(): ReadonlyArray<{
        model: Model;
        thinkingLevel?: ThinkingLevel;
    }>;
    /** Full agent state */
    get state(): AgentRuntimeState;
    /** All messages */
    get messages(): any[];
    /** Whether compaction or branch summarization is currently running */
    get isCompacting(): boolean;
    /** Number of pending messages */
    get pendingMessageCount(): number;
    /** Get pending steering messages (read-only) */
    getSteeringMessages(): readonly string[];
    /** Get pending follow-up messages (read-only) */
    getFollowUpMessages(): readonly string[];
    /**
     * Get the names of currently active tools.
     */
    getActiveToolNames(): string[];
    /**
     * Get all configured tools with name, description, parameter schema.
     */
    getAllTools(): Array<{
        name: string;
        description: string;
        parameters?: any;
    }>;
    /**
     * Get tool definition by name.
     */
    getToolDefinition(name: string): ToolDefinition | undefined;
    /** Build system prompt from current tool snippets and guidelines */
    private _buildSystemPrompt;
    /**
     * Set active tools by name.
     */
    setActiveToolsByName(toolNames: string[]): void;
    /**
     * Set model directly.
     */
    setModel(model: Model): Promise<void>;
    /**
     * Cycle to next/previous model.
     */
    cycleModel(direction?: "forward" | "backward"): Promise<{
        model: Model;
        thinkingLevel: ThinkingLevel;
        isScoped: boolean;
    } | undefined>;
    /**
     * Set thinking level.
     */
    setThinkingLevel(level: ThinkingLevel): void;
    /**
     * Get available thinking levels for current model.
     */
    getAvailableThinkingLevels(): ThinkingLevel[];
    /**
     * Get extension flag value.
     */
    getExtensionFlag(name: string): string | boolean | undefined;
    /**
     * Set extension flag value.
     */
    setExtensionFlag(name: string, value: string | boolean): void;
    /**
     * Send a prompt to the agent.
     */
    prompt(text: string, options?: {
        expandPromptTemplates?: boolean;
        images?: any[];
        streamingBehavior?: "steer" | "followUp";
    }): Promise<void>;
    /**
     * Queue a steering message (injected during next turn).
     */
    steer(text: string, images?: any[]): Promise<void>;
    /**
     * Queue a follow-up message (runs after agent stops).
     */
    followUp(text: string, images?: any[]): Promise<void>;
    /**
     * Send a custom message to the session.
     */
    sendCustomMessage<T = unknown>(message: {
        customType: string;
        content: any;
        display?: string;
        details?: T;
    }, options?: {
        triggerTurn?: boolean;
        deliverAs?: "steer" | "followUp" | "nextTurn";
    }): Promise<void>;
    /**
     * Clear all queued messages and return them.
     */
    clearQueue(): {
        steering: string[];
        followUp: string[];
    };
    /**
     * Subscribe to agent events.
     */
    subscribe(listener: SessionEventListener): () => void;
    /**
     * Manually trigger compaction.
     * Summarizes older conversation entries to keep context within limits.
     */
    compact(): Promise<void>;
    /**
     * Extract plain text from content blocks.
     */
    private _extractTextFromTurn;
    /**
     * Abort current operation.
     */
    abort(): void;
    /**
     * Abort any pending retry.
     */
    abortRetry(): void;
    /**
     * Wait for any pending retry to complete.
     */
    waitForRetry(): Promise<void>;
    /**
     * Record a bash execution result in session history.
     * Used by executeBash and by extensions.
     */
    recordBashResult(command: string, output: string, exitCode: number, cancelled: boolean, truncated: boolean, fullOutputPath?: string, options?: {
        excludeFromContext?: boolean;
    }): void;
    /**
     * Cancel running bash command.
     */
    abortBash(): void;
    /** Whether a bash command is currently running */
    get isBashRunning(): boolean;
    /** Whether there are pending bash messages waiting to be flushed */
    get hasPendingBashMessages(): boolean;
    /**
     * Flush pending bash messages to agent state and session.
     * Called after agent turn completes to maintain proper message ordering.
     */
    private _flushPendingBashMessages;
    /**
     * Update scoped models for cycling.
     */
    setScopedModels(scopedModels: Array<{
        model: Model;
        thinkingLevel?: ThinkingLevel;
    }>): void;
    /**
     * Navigate to a different node in the session tree.
     * Unlike fork() which creates a new session file, this stays in the same file.
     *
     * @param targetId The entry ID to navigate to
     * @param options.summarize Whether to summarize abandoned branch
     * @param options.customInstructions Custom instructions for summarizer
     * @param options.replaceInstructions If true, customInstructions replaces default prompt
     * @param options.label Label to attach to the branch summary entry
     * @returns Object with editorText (if user message) and cancelled status
     */
    navigateTree(targetId: string, options?: {
        summarize?: boolean;
        customInstructions?: string;
        replaceInstructions?: boolean;
        label?: string;
    }): Promise<{
        editorText?: string;
        cancelled: boolean;
        aborted?: boolean;
        summaryEntry?: BranchSummaryEntry;
    }>;
    /**
     * Dispose the session and clean up resources.
     */
    dispose(): void;
    private _registerTools;
    bindExtensions(bindings: {
        uiContext?: any;
        commandContextActions?: any;
        shutdownHandler?: () => void;
        onError?: (error: any) => void;
    }): Promise<void>;
    private _applyExtensionBindings;
    private _getThinkingLevelForModelSwitch;
    private _clampThinkingLevel;
    private _cycleScopedModel;
    private _cycleAvailableModel;
    private _modelsEqual;
    private _findLastAssistantMessage;
    private _queueSteer;
    private _queueFollowUp;
    private _emitQueueUpdate;
    private _handleAgentEvent;
    private _disconnectFromAgent;
    private _reconnectToAgent;
    private _createRetryPromiseForAgentEnd;
    private _findLastAssistantInMessages;
    private _processAgentEvent;
    private _getUserMessageText;
    private _emit;
    private _isRetryableError;
    private _handleRetryableError;
    private _resolveRetry;
    private get _agentState();
    private set _agentState(value);
    /**
     * Check if auto-compaction should run based on context usage or overflow.
     * Called after agent_end.
     */
    private _checkCompaction;
    /**
     * Run auto-compaction with given reason.
     * @param reason 'overflow' | 'threshold'
     * @param willRetry If true, calls agent.continue() after compaction
     */
    private _runAutoCompaction;
    /**
     * Convert AgentEvent to ExtensionEvent for extension consumption.
     * Returns undefined if event should not be forwarded.
     */
    private _convertAgentEventToExtensionEvent;
    /**
     * Get performance tracking statistics (if enabled)
     */
    getPerformanceStats(): {
        sampleCount: number;
        timeSpanMS: number;
        avgCpuUserMS: number;
        avgCpuSystemMS: number;
        avgRSSMB: number;
        avgHeapUsedMB: number;
        peakRSSMB: number;
        peakHeapUsedMB: number;
    } | null;
    /**
     * Stop performance tracking and destroy internal tracker
     */
    stopPerformanceTracking(): void;
}
/**
 * Parse a skill block from message text.
 */
export declare function parseSkillBlock(text: string): {
    name: string;
    location: string;
    content: string;
    userMessage: string | undefined;
} | null;
//# sourceMappingURL=agent-session.d.ts.map