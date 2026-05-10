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
} from "./types";
import { Agent } from "./agent";
import { formatNoApiKeyFoundMessage, formatNoModelSelectedMessage } from "./auth-guidance";
import type { AgentTool } from "./agent-types";
import { PerformanceTracker } from "./performance-tracker";
import type { Model } from "../llm";
import type { ModelEntry } from "./model-registry";
import type { ModelRegistry } from "./model-registry";

// Backward compatible alias
type ModelAny = ModelEntry;
import type { SessionManager, CompactionEntry, BranchSummaryEntry } from "../session/session-manager";
import type { SettingsManager } from "./settings-manager";
import type { ResourceLoader } from "./resource-loader";
import {
  estimateContextTokens,
  estimateContextUsage,
  shouldCompact,
  prepareCompaction,
  compact as performCompaction,
  calculateContextTokens,
  type CompactionPreparation,
  type FileOperations,
} from "../session/compaction";
import { isContextOverflow } from "./pi-ai-shim";
import { buildSystemPrompt } from "./system-prompt";
import { collectEntriesForBranchSummary, generateBranchSummary, type BranchSummaryDetails } from "../session/branch-summarization";

// Re-export types
export type { AgentSessionEventListener, AgentSessionConfig } from "./agent-session-types";
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
} from "./agent-session-types";

import { EventEmitter } from "./event-emitter";
import type { AgentEvent } from "./types";

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

  // Config (subset of AgentSessionConfig)
  private _config: any;
  // Extension runner
  private _extensionRunner?: any;
  // Queue size limits
  private _maxSteeringQueueSize?: number;
  private _maxFollowUpQueueSize?: number;
  // Performance tracking
  private _performanceTracker?: any;
  private _enablePerformanceTracking = false;

  // State
  private _scopedModels: Array<{ model: Model; thinkingLevel?: ThinkingLevel }>;
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

  // Bash execution state
  private _bashAbortController: AbortController | undefined;
  private _pendingBashMessages: any[] = [];

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
  private _toolPromptSnippets: Map<string, string> = new Map();
  private _toolPromptGuidelines: Map<string, string[]> = new Map();

  // System prompt
  private _baseSystemPrompt = "";

  // Current model (stored locally for session)
  private _model?: Model;
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
    scopedModels?: Array<{ model: Model; thinkingLevel?: ThinkingLevel }>;
    resourceLoader: ResourceLoader;
    customTools?: ToolDefinition[];
    modelRegistry: ModelRegistry;
    initialActiveToolNames?: string[];
    allowedToolNames?: string[];
    extensionRunner?: any;
    maxSteeringQueueSize?: number;
    maxFollowUpQueueSize?: number;
    enablePerformanceTracking?: boolean;
  }) {
    this.agent = config.agent;
    this.sessionManager = config.sessionManager;
    this.settingsManager = config.settingsManager;
    this._cwd = config.cwd;
    this._scopedModels = config.scopedModels ?? [];
    this._config = config;
    this.resourceLoader = config.resourceLoader;
    this.modelRegistry = config.modelRegistry;
    this._initialActiveToolNames = config.initialActiveToolNames;
    this._allowedToolNames = config.allowedToolNames
      ? new Set(config.allowedToolNames)
      : undefined;
    this._extensionRunner = config.extensionRunner;
    this._maxSteeringQueueSize = config.maxSteeringQueueSize;
    this._maxFollowUpQueueSize = config.maxFollowUpQueueSize;
    this._enablePerformanceTracking = config.enablePerformanceTracking ?? false;
    if (this._enablePerformanceTracking) {
      this._performanceTracker = new PerformanceTracker({ autoStart: true });
    }

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
  get model(): Model | undefined {
    return this._model;
  }

  /** Current thinking level */
  get thinkingLevel(): ThinkingLevel {
    return this._thinkingLevel;
  }

  /** Whether agent is currently running */
  get isStreaming(): boolean {
    return this._agentState.isRunning;
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
    model: Model;
    thinkingLevel?: ThinkingLevel;
  }> {
    return this._scopedModels;
  }

  /** Full agent state */
  get state(): AgentRuntimeState {
    return this._agentState;
  }

  /** All messages */
  get messages(): any[] {
    return this._agentState.history;
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

  /** Build system prompt from current tool snippets and guidelines */
  private _buildSystemPrompt(): string {
    return buildSystemPrompt({
      selectedTools: this.getActiveToolNames(),
      toolSnippets: Object.fromEntries(this._toolPromptSnippets),
      promptGuidelines: Array.from(this._toolPromptGuidelines.values()).flat(),
      cwd: this._cwd,
      contextFiles: this.resourceLoader.getAgentsFiles()?.agentsFiles,
      skills: this.resourceLoader.getSkills()?.skills,
      appendSystemPrompt: this.resourceLoader.getAppendSystemPrompt()?.join("\n\n"),
    });
  }

  /**
   * Set active tools by name.
   */
  setActiveToolsByName(toolNames: string[]): void {
    // Register the new tools
    for (const name of toolNames) {
      const def = this._toolDefinitions.get(name);
      if (def) {
        this.agent.registerTool(def);
      }
    }
    // Rebuild system prompt with updated tool set
    this._baseSystemPrompt = this._buildSystemPrompt();
    this._agentState.systemPrompt = this._baseSystemPrompt;
  }

  // =========================================================================
  // Model Management
  // =========================================================================

  /**
   * Set model directly.
   */
  async setModel(model: Model): Promise<void> {
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

    // Adjust thinking level if new model doesn't support it
    const availableLevels = this.getAvailableThinkingLevels();
    if (!availableLevels.includes(this._thinkingLevel)) {
      const clamped = this._clampThinkingLevel(this._thinkingLevel, availableLevels);
      this._thinkingLevel = clamped;
      this.sessionManager.appendThinkingLevelChange(clamped);
    }
  }

  /**
   * Cycle to next/previous model.
   */
  async cycleModel(
    direction: "forward" | "backward" = "forward"
  ): Promise<{ model: Model; thinkingLevel: ThinkingLevel; isScoped: boolean } | undefined> {
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
  // Extension Flag Support
  // =========================================================================

  /**
   * Get extension flag value.
   */
  getExtensionFlag(name: string): string | boolean | undefined {
    return this._extensionRunner?.getFlag(name);
  }

  /**
   * Set extension flag value.
   */
  setExtensionFlag(name: string, value: string | boolean): void {
    this._extensionRunner?.setFlag(name, value);
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
      throw new Error(formatNoModelSelectedMessage());
    }

    if (!this.modelRegistry.hasConfiguredAuth(this._model)) {
      throw new Error(formatNoApiKeyFoundMessage(this._model.provider));
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

    // Flush any pending bash messages before starting new turn
    this._flushPendingBashMessages();

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
      const state = this._agentState;
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
   * Summarizes older conversation entries to keep context within limits.
   */
  async compact(): Promise<void> {
    if (this.isCompacting) return;

    const compactionConfig = this._config.compaction ?? {};
    const enabled = compactionConfig.enabled !== false;
    if (!enabled) return;

    this._disconnectFromAgent();
    await this.abort();
    this._compactionAbortController = new AbortController();
    this._emit({ type: 'compaction_start', reason: 'manual' });

    try {
      const model = this._model;
      if (!model) throw new Error('No model selected for compaction');

      const auth = await this.modelRegistry.getApiKeyAndHeaders(model);
      if (!auth.ok || !auth.apiKey) throw new Error(`No API key for ${model.provider}/${model.id}`);

      const entries = this.sessionManager.getBranch();
      const settings = this.settingsManager.getCompactionSettings();

      const preparation = prepareCompaction(entries, settings);
      if (!preparation) {
        this._emit({ type: 'compaction_end', reason: 'manual', result: undefined, aborted: false, willRetry: false });
        return;
      }

      const result = await performCompaction(
        preparation,
        model,
        auth.apiKey,
        auth.headers,
        undefined,
        this._compactionAbortController.signal,
        this.thinkingLevel
      );

      this.sessionManager.appendCompaction(
        result.summary,
        result.firstKeptEntryId,
        result.tokensBefore,
        result.details,
        false
      );

      const sessionContext = this.sessionManager.buildSessionContext();
      this._agentState.messages = sessionContext.messages;

      this._emit({
        type: 'compaction_end',
        reason: 'manual',
        result: { summary: result.summary, tokensBefore: result.tokensBefore, entriesAdded: 1 },
        aborted: false,
        willRetry: false,
      });
    } catch (error: any) {
      if (this._compactionAbortController?.signal.aborted) {
        this._emit({ type: 'compaction_end', reason: 'manual', result: undefined, aborted: true, willRetry: false });
      } else {
        this._emit({ type: 'compaction_end', reason: 'manual', result: undefined, aborted: false, willRetry: false, errorMessage: error.message });
        throw error;
      }
    } finally {
      this._compactionAbortController = undefined;
      this._reconnectToAgent();
    }
  }

  /**
   * Extract plain text from content blocks.
   */
  private _extractTextFromTurn(content: any[]): string {
    return content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join(' ');
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
  // Bash Execution
  // =========================================================================

  /**
   * Record a bash execution result in session history.
   * Used by executeBash and by extensions.
   */
  recordBashResult(command: string, output: string, exitCode: number, cancelled: boolean, truncated: boolean, fullOutputPath?: string, options?: { excludeFromContext?: boolean }): void {
    const bashMessage = {
      role: "bashExecution" as const,
      command,
      output,
      exitCode,
      cancelled,
      truncated,
      fullOutputPath,
      timestamp: Date.now(),
      excludeFromContext: options?.excludeFromContext,
    };

    if (this._agentState.isStreaming) {
      this._pendingBashMessages.push(bashMessage);
    } else {
      this._agentState.messages.push(bashMessage);
      this.sessionManager.appendMessage(bashMessage as any);
    }
  }

  /**
   * Cancel running bash command.
   */
  abortBash(): void {
    this._bashAbortController?.abort();
  }

  /** Whether a bash command is currently running */
  get isBashRunning(): boolean {
    return this._bashAbortController !== undefined;
  }

  /** Whether there are pending bash messages waiting to be flushed */
  get hasPendingBashMessages(): boolean {
    return this._pendingBashMessages.length > 0;
  }

  /**
   * Flush pending bash messages to agent state and session.
   * Called after agent turn completes to maintain proper message ordering.
   */
  private _flushPendingBashMessages(): void {
    if (this._pendingBashMessages.length === 0) return;

    for (const bashMessage of this._pendingBashMessages) {
      this._agentState.messages.push(bashMessage);
      this.sessionManager.appendMessage(bashMessage as any);
    }

    this._pendingBashMessages = [];
  }

  // =========================================================================
  // Session Management
  // =========================================================================
  
  /**
   * Update scoped models for cycling.
   */
  setScopedModels(
    scopedModels: Array<{ model: Model; thinkingLevel?: ThinkingLevel }>
  ): void {
    this._scopedModels = scopedModels;
  }

  // =========================================================================
  // Tree Navigation
  // =========================================================================

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
  async navigateTree(
    targetId: string,
    options: {
      summarize?: boolean;
      customInstructions?: string;
      replaceInstructions?: boolean;
      label?: string;
    } = {}
  ): Promise<{ editorText?: string; cancelled: boolean; aborted?: boolean; summaryEntry?: BranchSummaryEntry }> {
    const oldLeafId = this.sessionManager.getLeafId();

    if (targetId === oldLeafId) {
      return { cancelled: false };
    }

    const targetEntry = this.sessionManager.getEntry(targetId);
    if (!targetEntry) {
      throw new Error(`Entry ${targetId} not found`);
    }

    if (options.summarize && !this._model) {
      throw new Error('No model available for summarization');
    }

    const { entries: entriesToSummarize, commonAncestorId } = collectEntriesForBranchSummary(
      this.sessionManager,
      oldLeafId,
      targetId
    );

    let customInstructions = options.customInstructions;
    let replaceInstructions = options.replaceInstructions;
    let label = options.label;

    // Extension hook: session_before_tree
    if (this._extensionRunner?.hasHandlers('session_before_tree')) {
      const preparation = {
        targetId,
        oldLeafId,
        commonAncestorId,
        entriesToSummarize,
        userWantsSummary: options.summarize ?? false,
        customInstructions,
        replaceInstructions,
        label,
      };

      try {
        const result = await this._extensionRunner.emit({
          type: 'session_before_tree',
          preparation,
        });

        if (result?.cancel) {
          return { cancelled: true };
        }
        if (result?.summary && options.summarize) {
          const summaryEntryId = this.sessionManager.branchWithSummary(
            commonAncestorId,
            result.summary,
            result.details,
            true
          );
          if (label) {
            this.sessionManager.appendLabelChange(summaryEntryId, label);
          }
          const summaryEntry = this.sessionManager.getEntry(summaryEntryId) as BranchSummaryEntry;
          return { cancelled: false, summaryEntry };
        }
        if (result?.customInstructions !== undefined) customInstructions = result.customInstructions;
        if (result?.replaceInstructions !== undefined) replaceInstructions = result.replaceInstructions;
        if (result?.label !== undefined) label = result.label;
      } catch (err) {
        // Extension error - continue with default
      }
    }

    let summaryText: string | undefined;
    let summaryDetails: any;

    if (options.summarize && entriesToSummarize.length > 0) {
      const model = this._model!;
      const auth = await this.modelRegistry.getApiKeyAndHeaders(model);
      if (!auth.ok || !auth.apiKey) {
        throw new Error(`No API key for ${model.provider}/${model.id}`);
      }

      const result = await generateBranchSummary(entriesToSummarize, {
        model,
        apiKey: auth.apiKey,
        headers: auth.headers,
        signal: new AbortController().signal,
        customInstructions,
        replaceInstructions,
        reserveTokens: 16384,
      });

      if (result.aborted) {
        return { cancelled: true, aborted: true };
      }
      if (result.error) {
        throw new Error(result.error);
      }
      summaryText = result.summary;
      summaryDetails = result.details;
    }

    let newLeafId: string | null;
    let editorText: string | undefined;

    if (targetEntry.type === 'message' && targetEntry.message.role === 'user') {
      newLeafId = targetEntry.parentId;
      // Extract text from message content
      const msg = targetEntry.message as any;
      if (typeof msg.content === 'string') {
        editorText = msg.content;
      } else if (Array.isArray(msg.content)) {
        const textBlocks = msg.content.filter((c: any) => c.type === 'text');
        editorText = textBlocks.map((c: any) => c.text).join('');
      }
    } else if (targetEntry.type === 'custom_message') {
      newLeafId = targetEntry.parentId;
      editorText =
        typeof targetEntry.content === 'string'
          ? targetEntry.content
          : (targetEntry.content as any[])
              .filter(c => c.type === 'text')
              .map(c => c.text)
              .join('');
    } else {
      newLeafId = targetId;
    }

    if (summaryText) {
      const summaryEntryId = this.sessionManager.branchWithSummary(
        newLeafId,
        summaryText,
        summaryDetails,
        false
      );
      if (label) {
        this.sessionManager.appendLabelChange(summaryEntryId, label);
      }
      const summaryEntry = this.sessionManager.getEntry(summaryEntryId) as BranchSummaryEntry;
    } else if (newLeafId === null) {
      this.sessionManager.resetLeaf();
    } else {
      this.sessionManager.branch(newLeafId);
    }

    const sessionContext = this.sessionManager.buildSessionContext();
    this._agentState.messages = sessionContext.messages;

    this._emit({
      type: 'session_tree',
      newLeafId: this.sessionManager.getLeafId(),
      oldLeafId,
      summaryEntry: summaryText ? undefined : undefined,
      fromExtension: false,
    });

    return { cancelled: false, editorText };
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
  ): Promise<{ model: Model; thinkingLevel: ThinkingLevel; isScoped: boolean } | undefined> {
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
  ): Promise<{ model: Model; thinkingLevel: ThinkingLevel; isScoped: boolean } | undefined> {
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

  private _modelsEqual(a: Model, b: Model | undefined): boolean {
    if (!b) return false;
    return a.provider === b.provider && a.id === b.id;
  }

  private _findLastAssistantMessage(): any | undefined {
    const messages = this._agentState.messages;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant") {
        return msg;
      }
    }
    return undefined;
  }

  private async _queueSteer(text: string, images?: any[]): Promise<void> {
    // Congestion control: evict oldest if exceeding max size
    if (this._maxSteeringQueueSize && this._maxSteeringQueueSize > 0) {
      while (this._steeringMessages.length >= this._maxSteeringQueueSize) {
        this._steeringMessages.shift();
      }
    }
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
    // Congestion control: evict oldest if exceeding max size
    if (this._maxFollowUpQueueSize && this._maxFollowUpQueueSize > 0) {
      while (this._followUpMessages.length >= this._maxFollowUpQueueSize) {
        this._followUpMessages.shift();
      }
    }
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

    // Emit to extension runner if available
    if (this._extensionRunner) {
      const extEvent = this._convertAgentEventToExtensionEvent(event);
      if (extEvent) {
        this._extensionRunner.emit(extEvent).catch(() => {});
      }
    }

    // Process event
    this._processAgentEvent(event);
  };

  // =========================================================================
  // Agent Connection Management
  // =========================================================================

  private _disconnectFromAgent(): void {
    if (this._unsubscribeAgent) {
      this._unsubscribeAgent();
      this._unsubscribeAgent = undefined;
    }
  }

  private _reconnectToAgent(): void {
    if (this._unsubscribeAgent) return; // Already connected
    this._unsubscribeAgent = this.agent.subscribe(this._handleAgentEvent);
  }

  private _createRetryPromiseForAgentEnd(event: any): void {
    if (event.type !== "agent:end" || this._retryPromise) {
      return;
    }

    const settings = this.settingsManager.getRetrySettings();
    if (!settings.enabled) {
      return;
    }

    const messages = this._agentState.messages;
    const lastAssistant = this._findLastAssistantInMessages(messages);
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
    // messages is already an array of messages
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

      // Flush any pending bash messages from streaming
      this._flushPendingBashMessages();

      // Record performance metrics if tracking enabled
      if (this._enablePerformanceTracking && this._performanceTracker) {
        this._performanceTracker.record();
      }

      // Auto-compaction if enabled (handles both overflow and threshold)
      const compactionConfig = this._config.compaction ?? {};
      const autoCompact = compactionConfig.autoCompact !== false; // default true
      if (autoCompact && this._lastAssistantMessage) {
        await this._checkCompaction(this._lastAssistantMessage, false);
      }
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
      "timed out",
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
      this._resolveRetry();
      return true;
    } catch {
      this._resolveRetry();
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

  // =========================================================================
  // Agent state accessors (circumvent strict typing)
  // =========================================================================

  private get _agentState(): any {
    return (this.agent as any).state || (this.agent as any).runner?.state || this._agentState;
  }

  private set _agentState(val: any) {
    (this.agent as any).state = val;
  }

  // =========================================================================
  // Compaction Logic
  // =========================================================================

  /**
   * Check if auto-compaction should run based on context usage or overflow.
   * Called after agent_end.
   */
  private async _checkCompaction(assistantMessage: any, skipAbortedCheck = true): Promise<void> {
    const settings = this.settingsManager.getCompactionSettings();
    if (!settings.enabled) return;

    // Skip if aborted (user cancelled) unless explicitly checking
    if (skipAbortedCheck && assistantMessage.stopReason === 'aborted') return;

    const contextWindow = this._model?.contextWindow ?? 0;

    // Skip overflow check if message from different model
    const sameModel = this._model && assistantMessage.provider === this._model.provider && assistantMessage.model === this._model.id;

    // Skip if this assistant message is older than the latest compaction boundary
    const compactionEntry = this.sessionManager.getLatestCompactionEntry(this.sessionManager.getBranch());
    const assistantIsFromBeforeCompaction = compactionEntry && assistantMessage.timestamp <= new Date(compactionEntry.timestamp).getTime();
    if (assistantIsFromBeforeCompaction) return;

    // Case 1: Overflow - LLM returned context overflow error
    if (sameModel && isContextOverflow(assistantMessage, contextWindow)) {
      if (this._overflowRecoveryAttempted) {
        this._emit({
          type: 'compaction_end',
          reason: 'overflow',
          result: undefined,
          aborted: false,
          willRetry: false,
          errorMessage: 'Context overflow recovery failed after one compact-and-retry attempt. Try reducing context or switching to a larger-context model.',
        });
        return;
      }

      this._overflowRecoveryAttempted = true;
      // Remove error message from agent state (it remains in session history)
      const messages = this._agentState.messages;
      if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
        this._agentState.messages = messages.slice(0, -1);
      }

      await this._runAutoCompaction('overflow', true);
      return;
    }

    // Case 2: Threshold - context size approaching limit
    let contextTokens: number;
    if (assistantMessage.stopReason === 'error') {
      // Estimate from all messages since no usage data
      const estimate = estimateContextUsage(this._agentState.messages);
      if (estimate.lastUsageIndex === null) return; // No usage at all
      // Verify usage is after latest compaction
      if (compactionEntry && estimate.lastUsageIndex !== null) {
        const usageMsg = this._agentState.messages[estimate.lastUsageIndex];
        if (usageMsg.role === 'assistant' && usageMsg.timestamp <= new Date(compactionEntry.timestamp).getTime()) {
          return; // Usage is stale (pre-compaction)
        }
      }
      contextTokens = estimate.tokens;
    } else {
      contextTokens = calculateContextTokens(assistantMessage.usage);
    }

    if (shouldCompact(contextTokens, contextWindow, settings)) {
      await this._runAutoCompaction('threshold', false);
    }
  }

  /**
   * Run auto-compaction with given reason.
   * @param reason 'overflow' | 'threshold'
   * @param willRetry If true, calls agent.continue() after compaction
   */
  private async _runAutoCompaction(reason: 'overflow' | 'threshold', willRetry: boolean): Promise<void> {
    if (this.isCompacting) return;

    const entries = this.sessionManager.getBranch();
    const settings = this.settingsManager.getCompactionSettings();

    this._emit({ type: 'compaction_start', reason });
    this._autoCompactionAbortController = new AbortController();

    try {
      const model = this._model;
      if (!model) {
        this._emit({ type: 'compaction_end', reason, result: undefined, aborted: false, willRetry });
        return;
      }

      const auth = await this.modelRegistry.getApiKeyAndHeaders(model);
      if (!auth.ok || !auth.apiKey) {
        this._emit({ type: 'compaction_end', reason, result: undefined, aborted: false, willRetry });
        return;
      }

      const preparation = prepareCompaction(entries, settings);
      if (!preparation) {
        this._emit({ type: 'compaction_end', reason, result: undefined, aborted: false, willRetry });
        return;
      }

      // Call compact (stub for now)
      const compactResult = await performCompaction(
        preparation,
        model,
        auth.apiKey,
        auth.headers,
        undefined,
        this._autoCompactionAbortController.signal,
        this.thinkingLevel
      );

      // Append compaction entry to session
      this.sessionManager.appendCompaction(
        compactResult.summary,
        compactResult.firstKeptEntryId,
        compactResult.tokensBefore,
        compactResult.details,
        false // fromExtension
      );

      // Rebuild agent state messages from session
      const sessionContext = this.sessionManager.buildSessionContext();
      this._agentState.messages = sessionContext.messages;

      this._emit({
        type: 'compaction_end',
        reason,
        result: {
          summary: compactResult.summary,
          tokensBefore: compactResult.tokensBefore,
          entriesAdded: 1,
        },
        aborted: false,
        willRetry,
      });

      if (willRetry) {
        // Remove any error message that triggered overflow (already done above, but double-check)
        setTimeout(() => {
          this.agent.resume().catch(() => {});
        }, 0);
      } else if (this._agentState.isStreaming) {
        // Kick the loop if queued messages exist
        setTimeout(() => {
          this.agent.resume().catch(() => {});
        }, 0);
      }
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'compaction failed';
      this._emit({
        type: 'compaction_end',
        reason,
        result: undefined,
        aborted: false,
        willRetry,
        errorMessage: reason === 'overflow' ? `Context overflow recovery failed: ${errorMessage}` : `Auto-compaction failed: ${errorMessage}`,
      });
    } finally {
      this._autoCompactionAbortController = undefined;
    }
  }

  /**
   * Convert AgentEvent to ExtensionEvent for extension consumption.
   * Returns undefined if event should not be forwarded.
   */
  private _convertAgentEventToExtensionEvent(event: any): any {
    // Map event types
    switch (event.type) {
      case 'agent:start':
        return { type: 'agent_start', prompt: event.initialPrompt, model: this._model };
      case 'agent:end':
        return { type: 'agent_end', messages: this._agentState.messages, success: event.result?.success };
      case 'turn:start':
        return { type: 'turn_start', round: event.round, promptLength: event.promptLength };
      case 'turn:end':
        return { type: 'turn_end', round: event.round, toolCallsExecuted: event.toolCallsExecuted };
      case 'message:start':
        return { type: 'message_start', turn: event.turn };
      case 'message:end':
        return { type: 'message_end', turn: event.turn };
      case 'tool:call:start':
        return { type: 'tool_call', toolName: event.toolName, toolCallId: event.toolCallId, input: event.arguments };
      case 'tool:call:end':
        const result = event.result;
        return { type: 'tool_result', toolName: result.toolName, toolCallId: result.toolCallId, result: result.result || result.error, isError: result.isError };
      case 'memory:retrieve':
        return { type: 'memory_retrieve', query: event.query, memoriesRetrieved: event.memoriesRetrieved };
      default:
        return undefined;
    }
  }



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
  } | null {
    if (!this._performanceTracker) return null;
    return this._performanceTracker.getStats();
  }

  /**
   * Stop performance tracking and destroy internal tracker
   */
  stopPerformanceTracking(): void {
    this._performanceTracker?.stop();
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