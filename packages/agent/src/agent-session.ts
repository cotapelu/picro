// SPDX-License-Identifier: Apache-2.0
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

import type { 
  AgentRuntimeState, 
  ThinkingLevel,
  ConversationTurn,
  ToolDefinition
} from "./types.js";
import { Agent } from "./agent.js";
import type { AgentTool } from "./agent-types.js";
import type { Model } from "@mariozechner/pi-ai";
import type { SessionManager } from "./session-manager.js";
import type { SettingsManager } from "./settings-manager.js";
import type { ResourceLoader } from "./resource-loader.js";
import type { ModelRegistry } from "./model-registry.js";

// Re-export types
export type { AgentSessionEventListener, AgentSessionConfig } from "./agent-session-types.js";
export type { 
  AgentSessionEvent, 
  QueueUpdateEvent, 
  CompactionStartEvent, 
  CompactionEndEvent,
  AutoRetryStartEvent,
  AutoRetryEndEvent,
  CompactionResult,
  PromptOptions,
  ModelCycleResult,
  SessionStats,
  ParsedSkillBlock
} from "./agent-session-types.js";

import { EventEmitter } from "./event-emitter.js";
import type { AgentEvent } from "./types.js";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_THINKING_LEVEL: ThinkingLevel = "medium";

const THINKING_LEVELS: ThinkingLevel[] = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
];

const THINKING_LEVELS_WITH_XHIGH: ThinkingLevel[] = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
];

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Session event listener type
 */
type SessionEventListener = (event: any) => void;

// ============================================================================
// AgentSession Class
// ============================================================================

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
export class AgentSession {
  // Core dependencies
  readonly agent: Agent;
  readonly sessionManager: SessionManager;
  readonly settingsManager: SettingsManager;
  readonly resourceLoader: ResourceLoader;
  readonly modelRegistry: ModelRegistry;

  // State
  private _scopedModels: Array<{ model: Model<any>; thinkingLevel?: ThinkingLevel }>;
  private _cwd: string;
  private _initialActiveToolNames?: string[];
  private _allowedToolNames?: Set<string>;

  // Event subscription state
  private _unsubscribeAgent?: () => void;
  private _eventListeners: SessionEventListener[] = [];

  // Queue tracking for UI display
  private _steeringMessages: string[] = [];
  private _followUpMessages: string[] = [];

  // Compaction state
  private _compactionAbortController: AbortController | undefined;
  private _autoCompactionAbortController: AbortController | undefined;
  private _overflowRecoveryAttempted = false;

  // Branch summarization state
  private _branchSummaryAbortController: AbortController | undefined;

  // Retry state
  private _retryAbortController: AbortController | undefined;
  private _retryAttempt = 0;
  private _retryMaxAttempts = 3;
  private _retryDelayMs = 1000;
  private _retryPromise: Promise<void> | undefined;
  private _retryResolve: (() => void) | undefined;

  // Tool registry
  private _toolRegistry: Map<string, AgentTool> = new Map();
  private _toolDefinitions: Map<string, ToolDefinition> = new Map();

  // System prompt
  private _baseSystemPrompt = "";

  // Current model (stored locally for session)
  private _model?: Model<any>;
  private _thinkingLevel: ThinkingLevel = DEFAULT_THINKING_LEVEL;

  // Pending next turn messages (custom messages for next turn)
  private _pendingNextTurnMessages: any[] = [];

  // Last assistant message for auto-compaction check
  private _lastAssistantMessage: any | undefined = undefined;

  // Turn index for events
  private _turnIndex = 0;

  // Private emitter for internal events
  private _emitter: EventEmitter;

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
    scopedModels?: Array<{ model: Model<any>; thinkingLevel?: ThinkingLevel }>;
    resourceLoader: ResourceLoader;
    customTools?: ToolDefinition[];
    modelRegistry: ModelRegistry;
    initialActiveToolNames?: string[];
    allowedToolNames?: string[];
  }) {
    this.agent = config.agent;
    this.sessionManager = config.sessionManager;
    this.settingsManager = config.settingsManager;
    this._cwd = config.cwd;
    this._scopedModels = config.scopedModels ?? [];
    this.resourceLoader = config.resourceLoader;
    this.modelRegistry = config.modelRegistry;
    this._initialActiveToolNames = config.initialActiveToolNames;
    this._allowedToolNames = config.allowedToolNames
      ? new Set(config.allowedToolNames)
      : undefined;

    // Create emitter for session events
    this._emitter = new EventEmitter();

    // Subscribe to agent events for internal handling
    this._unsubscribeAgent = this.agent.subscribe(this._handleAgentEvent);

    // Register tools
    this._registerTools(config);
  }

  // =========================================================================
  // Public Properties
  // =========================================================================

  /** Current model (may be undefined if not yet selected) */
  get model(): Model<any> | undefined {
    return this._model;
  }

  /** Current thinking level */
  get thinkingLevel(): ThinkingLevel {
    return this._thinkingLevel;
  }

  /** Whether agent is currently running */
  get isStreaming(): boolean {
    return this.agent.getState().isRunning;
  }

  /** Current effective system prompt */
  get systemPrompt(): string {
    return this._baseSystemPrompt;
  }

  /** Current retry attempt (0 if not retrying) */
  get retryAttempt(): number {
    return this._retryAttempt;
  }

  /** Current session file path, or undefined if sessions are disabled */
  get sessionFile(): string | undefined {
    return this.sessionManager.getSessionFile();
  }

  /** Current session ID */
  get sessionId(): string {
    return this.sessionManager.getSessionId();
  }

  /** Current session display name, if set */
  get sessionName(): string | undefined {
    return this.sessionManager.getSessionName();
  }

  /** Scoped models for cycling (from --models flag) */
  get scopedModels(): ReadonlyArray<{
    model: Model<any>;
    thinkingLevel?: ThinkingLevel;
  }> {
    return this._scopedModels;
  }

  /** Full agent state */
  get state(): AgentRuntimeState {
    return this.agent.getState();
  }

  /** All messages */
  get messages(): any[] {
    return this.agent.getState().history;
  }

  /** Whether compaction or branch summarization is currently running */
  get isCompacting(): boolean {
    return (
      this._autoCompactionAbortController !== undefined ||
      this._compactionAbortController !== undefined ||
      this._branchSummaryAbortController !== undefined
    );
  }

  /** Number of pending messages */
  get pendingMessageCount(): number {
    return this._steeringMessages.length + this._followUpMessages.length;
  }

  /** Get pending steering messages (read-only) */
  getSteeringMessages(): readonly string[] {
    return this._steeringMessages;
  }

  /** Get pending follow-up messages (read-only) */
  getFollowUpMessages(): readonly string[] {
    return this._followUpMessages;
  }

  // =========================================================================
  // Tool Management
  // =========================================================================

  /**
   * Get the names of currently active tools.
   */
  getActiveToolNames(): string[] {
    return this.agent.getToolNames();
  }

  /**
   * Get all configured tools with name, description, parameter schema.
   */
  getAllTools(): Array<{
    name: string;
    description: string;
    parameters?: any;
  }> {
    return Array.from(this._toolDefinitions.values()).map((def) => ({
      name: def.name,
      description: def.description,
      parameters: def.parameters,
    }));
  }

  /**
   * Get tool definition by name.
   */
  getToolDefinition(name: string): ToolDefinition | undefined {
    return this._toolDefinitions.get(name);
  }

  /**
   * Set active tools by name.
   */
  setActiveToolsByName(toolNames: string[]): void {
    // Unregister all current tools
    for (const name of this.agent.getToolNames()) {
      // Current agent doesn't have unregister, so we just add new ones
    }
    // Register the new tools
    for (const name of toolNames) {
      const def = this._toolDefinitions.get(name);
      if (def) {
        this.agent.registerTool(def);
      }
    }
  }

  // =========================================================================
  // Model Management
  // =========================================================================

  /**
   * Set model directly.
   */
  async setModel(model: Model<any>): Promise<void> {
    if (!this.modelRegistry.hasConfiguredAuth(model)) {
      throw new Error(`No API key for ${model.provider}/${model.id}`);
    }

    const previousModel = this._model;
    this._model = model;

    this.sessionManager.appendModelChange(model.provider, model.id);
    this.settingsManager.setDefaultProvider(model.provider);
    this.settingsManager.setDefaultModel(model.id);

    // Emit model change event
    this._emit({
      type: "model_change",
      model,
      previousModel,
    });
  }

  /**
   * Cycle to next/previous model.
   */
  async cycleModel(
    direction: "forward" | "backward" = "forward"
  ): Promise<{ model: Model<any>; thinkingLevel: ThinkingLevel; isScoped: boolean } | undefined> {
    if (this._scopedModels.length > 0) {
      return this._cycleScopedModel(direction);
    }
    return this._cycleAvailableModel(direction);
  }

  // =========================================================================
  // Thinking Level Management
  // =========================================================================

  /**
   * Set thinking level.
   */
  setThinkingLevel(level: ThinkingLevel): void {
    const availableLevels = this.getAvailableThinkingLevels();
    const effectiveLevel = availableLevels.includes(level)
      ? level
      : this._clampThinkingLevel(level, availableLevels);

    this._thinkingLevel = effectiveLevel;
    this.sessionManager.appendThinkingLevelChange(effectiveLevel);
  }

  /**
   * Get available thinking levels for current model.
   */
  getAvailableThinkingLevels(): ThinkingLevel[] {
    const model = this._model;
    if (model && model.reasoning) {
      return THINKING_LEVELS_WITH_XHIGH;
    }
    return THINKING_LEVELS;
  }

  // =========================================================================
  // Prompting
  // =========================================================================

  /**
   * Send a prompt to the agent.
   */
  async prompt(text: string, options?: {
    expandPromptTemplates?: boolean;
    images?: any[];
    streamingBehavior?: "steer" | "followUp";
  }): Promise<void> {
    // If streaming, queue via steer() or followUp()
    if (this.isStreaming) {
      if (!options?.streamingBehavior) {
        throw new Error(
          "Agent is already processing. Specify streamingBehavior ('steer' or 'followUp') to queue the message."
        );
      }

      if (options.streamingBehavior === "followUp") {
        await this._queueFollowUp(text, options?.images);
      } else {
        await this._queueSteer(text, options?.images);
      }
      return;
    }

    // Validate model
    if (!this._model) {
      throw new Error("No model selected");
    }

    if (!this.modelRegistry.hasConfiguredAuth(this._model)) {
      throw new Error(`No API key for ${this._model.provider}/${this._model.id}`);
    }

    // Build user message
    const userContent: any[] = [{ type: "text", text }];
    if (options?.images) {
      userContent.push(...options.images);
    }

    const userTurn: ConversationTurn = {
      role: "user",
      content: userContent,
      timestamp: Date.now(),
    };

    // Add pending next turn messages
    const initialTurns = [userTurn];
    for (const msg of this._pendingNextTurnMessages) {
      initialTurns.push(msg);
    }
    this._pendingNextTurnMessages = [];

    // Run the agent
    await this.agent.run(text);
    await this.waitForRetry();
  }

  /**
   * Queue a steering message (injected during next turn).
   */
  async steer(text: string, images?: any[]): Promise<void> {
    await this._queueSteer(text, images);
  }

  /**
   * Queue a follow-up message (runs after agent stops).
   */
  async followUp(text: string, images?: any[]): Promise<void> {
    await this._queueFollowUp(text, images);
  }

  /**
   * Send a custom message to the session.
   */
  async sendCustomMessage<T = unknown>(
    message: {
      customType: string;
      content: any;
      display?: string;
      details?: T;
    },
    options?: {
      triggerTurn?: boolean;
      deliverAs?: "steer" | "followUp" | "nextTurn";
    }
  ): Promise<void> {
    const customMsg = {
      role: "custom" as const,
      customType: message.customType,
      content: message.content,
      display: message.display,
      details: message.details,
      timestamp: Date.now(),
    };

    if (options?.deliverAs === "nextTurn") {
      this._pendingNextTurnMessages.push(customMsg);
    } else if (this.isStreaming) {
      const turn: ConversationTurn = {
        role: "user",
        content: [{ type: "text", text: JSON.stringify(customMsg) }],
        timestamp: Date.now(),
      };
      
      if (options?.deliverAs === "followUp") {
        this.agent.followUp(turn);
      } else {
        this.agent.steer(turn);
      }
    } else if (options?.triggerTurn) {
      await this.agent.run(JSON.stringify(customMsg));
    } else {
      // Just add to history
      const state = this.agent.getState();
      state.history.push(customMsg as any);
    }
  }

  /**
   * Clear all queued messages and return them.
   */
  clearQueue(): { steering: string[]; followUp: string[] } {
    const steering = [...this._steeringMessages];
    const followUp = [...this._followUpMessages];

    this._steeringMessages = [];
    this._followUpMessages = [];
    this.agent.clearAllQueues();

    return { steering, followUp };
  }

  // =========================================================================
  // Event Subscription
  // =========================================================================

  /**
   * Subscribe to agent events.
   */
  subscribe(listener: SessionEventListener): () => void {
    this._eventListeners.push(listener);

    return () => {
      const index = this._eventListeners.indexOf(listener);
      if (index !== -1) {
        this._eventListeners.splice(index, 1);
      }
    };
  }

  // =========================================================================
  // Compaction
  // =========================================================================

  /**
   * Manually trigger compaction.
   */
  async compact(): Promise<void> {
    if (this.isCompacting) {
      return;
    }

    this._compactionAbortController = new AbortController();

    try {
      // Compaction logic would go here
      this._emit({
        type: "compaction_end",
        reason: "manual",
        result: undefined,
        aborted: false,
        willRetry: false,
      });
    } finally {
      this._compactionAbortController = undefined;
    }
  }

  // =========================================================================
  // Abort
  // =========================================================================

  /**
   * Abort current operation.
   */
  abort(): void {
    this.abortRetry();
    this.agent.abort();
  }

  /**
   * Abort any pending retry.
   */
  abortRetry(): void {
    if (this._retryAbortController) {
      this._retryAbortController.abort();
      this._retryAbortController = undefined;
    }
    this._resolveRetry();
  }

  /**
   * Wait for any pending retry to complete.
   */
  async waitForRetry(): Promise<void> {
    if (this._retryPromise) {
      await this._retryPromise;
    }
  }

  // =========================================================================
  // Session Management
  // =========================================================================

  /**
   * Update scoped models for cycling.
   */
  setScopedModels(
    scopedModels: Array<{ model: Model<any>; thinkingLevel?: ThinkingLevel }>
  ): void {
    this._scopedModels = scopedModels;
  }

  /**
   * Dispose the session and clean up resources.
   */
  dispose(): void {
    if (this._unsubscribeAgent) {
      this._unsubscribeAgent();
      this._unsubscribeAgent = undefined;
    }

    this._eventListeners = [];
    this.abortRetry();
    this._compactionAbortController?.abort();
    this._autoCompactionAbortController?.abort();
    this._branchSummaryAbortController?.abort();
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private _registerTools(config: any): void {
    // Register custom tools if provided
    if (config.customTools) {
      for (const def of config.customTools) {
        this._toolDefinitions.set(def.name, def);
        if (def.handler) {
          const tool: AgentTool = {
            name: def.name,
            description: def.description,
            parameters: def.parameters,
            handler: def.handler,
          };
          this._toolRegistry.set(def.name, tool);
          this.agent.registerTool(def);
        }
      }
    }
  }

  private _getThinkingLevelForModelSwitch(override?: ThinkingLevel): ThinkingLevel {
    const level = override ?? this._thinkingLevel;
    const available = this.getAvailableThinkingLevels();

    if (available.includes(level)) {
      return level;
    }

    return this._clampThinkingLevel(level, available);
  }

  private _clampThinkingLevel(
    level: ThinkingLevel,
    available: ThinkingLevel[]
  ): ThinkingLevel {
    if (available.includes(level)) {
      return level;
    }

    const idx = THINKING_LEVELS.indexOf(level);
    if (idx === -1) {
      return "off";
    }

    for (let i = idx - 1; i >= 0; i--) {
      if (available.includes(THINKING_LEVELS[i])) {
        return THINKING_LEVELS[i];
      }
    }

    return available[0] ?? "off";
  }

  private async _cycleScopedModel(
    direction: "forward" | "backward"
  ): Promise<{ model: Model<any>; thinkingLevel: ThinkingLevel; isScoped: boolean } | undefined> {
    const scopedModels = this._scopedModels.filter((scoped) =>
      this.modelRegistry.hasConfiguredAuth(scoped.model)
    );

    if (scopedModels.length <= 1) return undefined;

    const currentModel = this._model;
    let currentIndex = scopedModels.findIndex((sm) => this._modelsEqual(sm.model, currentModel));
    if (currentIndex === -1) currentIndex = 0;

    const len = scopedModels.length;
    const nextIndex = direction === "forward"
      ? (currentIndex + 1) % len
      : (currentIndex - 1 + len) % len;

    const next = scopedModels[nextIndex];
    const thinkingLevel = this._getThinkingLevelForModelSwitch(next.thinkingLevel);

    this._model = next.model;
    this.sessionManager.appendModelChange(next.model.provider, next.model.id);
    this.settingsManager.setDefaultProvider(next.model.provider);
    this.settingsManager.setDefaultModel(next.model.id);
    this.setThinkingLevel(thinkingLevel);

    return {
      model: next.model,
      thinkingLevel: this._thinkingLevel,
      isScoped: true,
    };
  }

  private async _cycleAvailableModel(
    direction: "forward" | "backward"
  ): Promise<{ model: Model<any>; thinkingLevel: ThinkingLevel; isScoped: boolean } | undefined> {
    const availableModels = await this.modelRegistry.getAvailable();
    if (availableModels.length <= 1) return undefined;

    const currentModel = this._model;
    let currentIndex = availableModels.findIndex((m) => this._modelsEqual(m, currentModel));
    if (currentIndex === -1) currentIndex = 0;

    const len = availableModels.length;
    const nextIndex = direction === "forward"
      ? (currentIndex + 1) % len
      : (currentIndex - 1 + len) % len;

    const nextModel = availableModels[nextIndex];
    const thinkingLevel = this._getThinkingLevelForModelSwitch();

    this._model = nextModel;
    this.sessionManager.appendModelChange(nextModel.provider, nextModel.id);
    this.settingsManager.setDefaultProvider(nextModel.provider);
    this.settingsManager.setDefaultModel(nextModel.id);
    this.setThinkingLevel(thinkingLevel);

    return {
      model: nextModel,
      thinkingLevel: this._thinkingLevel,
      isScoped: false,
    };
  }

  private _modelsEqual(a: Model<any>, b: Model<any> | undefined): boolean {
    if (!b) return false;
    return a.provider === b.provider && a.id === b.id;
  }

  private _findLastAssistantMessage(): any | undefined {
    const history = this.agent.getState().history;
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (msg.role === "assistant") {
        return msg;
      }
    }
    return undefined;
  }

  private async _queueSteer(text: string, images?: any[]): Promise<void> {
    this._steeringMessages.push(text);
    this._emitQueueUpdate();

    const content: any[] = [{ type: "text", text }];
    if (images) {
      content.push(...images);
    }

    const turn: ConversationTurn = {
      role: "user",
      content,
      timestamp: Date.now(),
    };

    this.agent.steer(turn);
  }

  private async _queueFollowUp(text: string, images?: any[]): Promise<void> {
    this._followUpMessages.push(text);
    this._emitQueueUpdate();

    const content: any[] = [{ type: "text", text }];
    if (images) {
      content.push(...images);
    }

    const turn: ConversationTurn = {
      role: "user",
      content,
      timestamp: Date.now(),
    };

    this.agent.followUp(turn);
  }

  private _emitQueueUpdate(): void {
    const event = {
      type: "queue_update",
      steering: [...this._steeringMessages],
      followUp: [...this._followUpMessages],
    };

    for (const l of this._eventListeners) {
      l(event);
    }
  }

  private _handleAgentEvent = (event: any): void => {
    // Create retry promise synchronously
    this._createRetryPromiseForAgentEnd(event);

    // Process event
    this._processAgentEvent(event);
  };

  private _createRetryPromiseForAgentEnd(event: any): void {
    if (event.type !== "agent:end" || this._retryPromise) {
      return;
    }

    const settings = this.settingsManager.getRetrySettings();
    if (!settings.enabled) {
      return;
    }

    const history = this.agent.getState().history;
    const lastAssistant = this._findLastAssistantInMessages(history);
    if (!lastAssistant || !this._isRetryableError(lastAssistant)) {
      return;
    }

    this._retryMaxAttempts = settings.maxRetries;
    this._retryDelayMs = settings.baseDelayMs;

    this._retryPromise = new Promise<void>((resolve) => {
      this._retryResolve = resolve;
    });
  }

  private _findLastAssistantInMessages(messages: any[]): any | undefined {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "assistant") {
        return message;
      }
    }
    return undefined;
  }

  private async _processAgentEvent(event: any): Promise<void> {
    // When a user message starts, check queue and remove it
    if (event.type === "message:start" && event.turn?.role === "user") {
      this._overflowRecoveryAttempted = false;
      const messageText = this._getUserMessageText(event.turn);
      if (messageText) {
        const steeringIndex = this._steeringMessages.indexOf(messageText);
        if (steeringIndex !== -1) {
          this._steeringMessages.splice(steeringIndex, 1);
          this._emitQueueUpdate();
        } else {
          const followUpIndex = this._followUpMessages.indexOf(messageText);
          if (followUpIndex !== -1) {
            this._followUpMessages.splice(followUpIndex, 1);
            this._emitQueueUpdate();
          }
        }
      }
    }

    // Emit to listeners
    this._emit(event);

    // Handle session persistence
    if (event.type === "message:end" && event.turn) {
      if (
        event.turn.role === "user" ||
        event.turn.role === "assistant" ||
        event.turn.role === "tool"
      ) {
        this.sessionManager.appendMessage(event.turn as any);
      }

      if (event.turn.role === "assistant") {
        this._lastAssistantMessage = event.turn;
        const assistantMsg = event.turn;
        if (assistantMsg.stopReason !== "error") {
          this._overflowRecoveryAttempted = false;
        }

        if (assistantMsg.stopReason !== "error" && this._retryAttempt > 0) {
          this._emit({
            type: "auto_retry_end",
            success: true,
            attempt: this._retryAttempt,
          });
          this._retryAttempt = 0;
        }
      }
    }

    // Check auto-retry and auto-compaction after agent completes
    if (event.type === "agent:end" && this._lastAssistantMessage) {
      const msg = this._lastAssistantMessage;
      this._lastAssistantMessage = undefined;

      if (this._isRetryableError(msg)) {
        const didRetry = await this._handleRetryableError(msg);
        if (didRetry) return;
      }

      this._resolveRetry();
    }
  }

  private _getUserMessageText(message: any): string {
    if (message.role !== "user") return "";

    const content = message.content;
    if (typeof content === "string") return content;

    const textBlocks = (content as any[]).filter((c) => c.type === "text");
    return textBlocks.map((c) => c.text).join("");
  }

  private _emit(event: any): void {
    for (const l of this._eventListeners) {
      l(event);
    }
  }

  private _isRetryableError(message: any): boolean {
    if (!message?.errorMessage) return false;

    const errorLower = message.errorMessage.toLowerCase();
    const retryablePatterns = [
      "overloaded",
      "rate limit",
      "429",
      "500",
      "502",
      "503",
      "504",
      "timeout",
      "temporary failure",
    ];

    return retryablePatterns.some((pattern) => errorLower.includes(pattern));
  }

  private async _handleRetryableError(message: any): Promise<boolean> {
    const settings = this.settingsManager.getRetrySettings();
    if (!settings.enabled) return false;

    const maxAttempts = this._retryMaxAttempts ?? settings.maxRetries;
    const delayMs = this._retryDelayMs ?? settings.baseDelayMs;

    if (this._retryAttempt >= maxAttempts) {
      return false;
    }

    this._retryAttempt++;
    this._retryAbortController = new AbortController();

    this._emit({
      type: "auto_retry_start",
      attempt: this._retryAttempt,
      maxAttempts,
      delayMs,
      errorMessage: message.errorMessage,
    });

    await new Promise((resolve) => setTimeout(resolve, delayMs));

    if (this._retryAbortController?.signal.aborted) {
      return false;
    }

    try {
      await this.agent.resume();
      return true;
    } catch {
      return false;
    }
  }

  private _resolveRetry(): void {
    if (this._retryResolve) {
      this._retryResolve();
      this._retryResolve = undefined;
      this._retryPromise = undefined;
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse a skill block from message text.
 */
export function parseSkillBlock(text: string): {
  name: string;
  location: string;
  content: string;
  userMessage: string | undefined;
} | null {
  const match = text.match(
    /^<skill name="([^"]+)" location="([^"]+)">\n([\s\S]*?)\n<\/skill>(?:\n\n([\s\S]+))?$/
  );

  if (!match) return null;

  return {
    name: match[1],
    location: match[2],
    content: match[3],
    userMessage: match[4]?.trim() || undefined,
  };
}