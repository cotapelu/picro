// SPDX-License-Identifier: Apache-2.0
/**
 * AgentLoop: core loop execution.
 * Different from pi-agent-legacy: class-based, simpler flow.
 */

import { randomUUID } from "node:crypto";
import type {
  ConversationTurn,
  AgentRuntimeState,
  AgentConfig,
  AgentRunResult,
  LLMResponse,
  ToolCallData,
  ToolResult,
  ToolContext,
  LLMStreamEvent,
  LoopStrategy,
  AgentTool,
  ConvertToLlmFn,
  StopReason,
  ToolTurn,
  AssistantTurn,
  PrepareNextTurnContext,
  PrepareNextTurnOverride,
  TextBlock,
  ImageBlock,
  ThinkingBlock,
  ToolCallBlock,
  ContentBlock,
  SuccessfulToolResult,
  FailedToolResult,
  SessionMetrics,
} from "./types.js";
import { createSessionMetrics } from "./types.js";
import type {
  Context,
  Message as LlmMessage,
  Tool as LlmTool,
} from "../llm/index.js";
import type { AgentEvent } from "../events/events.js";
import { EventEmitter } from "../events/event-emitter.js";
import { ToolExecutor } from "./tool-executor.js";
import { ContextBuilder } from "./context-manager.js";
import { MessageQueue } from "./message-queue.js";
import { FollowUpManager } from "./follow-up-manager.js";

/**
 * Manages the agent execution loop.
 * Separated from Agent class for cleaner architecture.
 */
export class AgentLoop {
  private state: AgentRuntimeState;
  private config: AgentConfig;
  private emitter: EventEmitter;
  private toolExecutor: ToolExecutor;
  private contextBuilder?: ContextBuilder | null;
  private strategy: LoopStrategy;
  private abortController: AbortController | null = null;
  private tools: AgentTool[];
  private llmComplete: (
    context: Context,
    options?: any,
  ) => Promise<LLMResponse>;
  private llmStream: (
    context: Context,
    options?: any,
  ) => Promise<AsyncIterable<any>>;
  // State for prepareNextTurn hook
  private lastTurnAssistant: AssistantTurn | null = null;
  private lastTurnToolResults: ToolResult[] = [];
  private lastTurnNewMessages: ConversationTurn[] = [];

  private followUpManager = new FollowUpManager();
  private metrics: SessionMetrics = createSessionMetrics();
  // Memory safeguards to prevent OOM from accumulating too many tool outputs
  private readonly MAX_TOOL_TURNS = 1000; // keep at most 1000 tool role turns
  private readonly MAX_TOOL_RESULTS = 1000; // keep at most 1000 tool results

  constructor(
    config: AgentConfig,
    emitter: EventEmitter,
    toolExecutor: ToolExecutor,
    contextBuilder: ContextBuilder | null,
    strategy: LoopStrategy,
    llmComplete: (context: Context, options?: any) => Promise<LLMResponse>,
    llmStream: (context: Context, options?: any) => Promise<AsyncIterable<any>>,
    tools: AgentTool[] = [],
  ) {
    this.config = config;
    this.emitter = emitter;
    this.toolExecutor = toolExecutor;
    this.contextBuilder = contextBuilder;
    this.strategy = strategy;
    this.tools = tools;
    this.llmComplete = llmComplete;
    this.llmStream = llmStream;
    this.state = this.createInitialState();
  }

  /** Abort current execution */
  public abort(): void {
    this.state.isCancelled = true;
    this.abortController?.abort();
  }

  /** Get current state snapshot */
  getState(): Readonly<AgentRuntimeState> {
    return { ...this.state };
  }

  /** Reset state for new run */
  public reset(): void {
    this.state = this.createInitialState();
  }

  private createInitialState(): AgentRuntimeState {
    const state: AgentRuntimeState = {
      round: 0,
      totalToolCalls: 0,
      totalTokens: 0,
      promptLength: 0,
      lastTokenCount: 0,
      isRunning: false,
      isCancelled: false,
      toolResults: [],
      history: [],
      metadata: {},
    };
    // Alias messages to history for backward compatibility
    (state as any).messages = state.history;
    return state;
  }

  // Convert ConversationTurn[] to any[] (compatible with llm Message)
  private convertTurnsToMessages(turns: ConversationTurn[]): any[] {
    return turns
      .filter((turn) => turn.role !== "system")
      .map((turn) => {
        if (turn.role === "user") {
          return {
            role: "user",
            content: turn.content
              .map((c) => {
                if (c.type === "text") return { type: "text", text: c.text };
                if (c.type === "image")
                  return {
                    type: "image_url",
                    image_url: { url: `data:${c.mimeType};base64,${c.data}` },
                  };
                return null;
              })
              .filter(Boolean),
          };
        } else if (turn.role === "assistant") {
          return {
            role: "assistant",
            content: turn.content
              .map((c) => {
                if (c.type === "text") return { type: "text", text: c.text };
                if (c.type === "thinking")
                  return { type: "thinking", thinking: c.thinking };
                if (c.type === "toolCall")
                  return {
                    type: "toolCall",
                    id: c.id,
                    name: c.name,
                    arguments: c.arguments,
                  };
                return null;
              })
              .filter(Boolean),
            stopReason: turn.stopReason,
            usage: turn.usage,
          };
        } else if (turn.role === "tool") {
          const textContent = turn.content
            .filter((c) => c.type === "text")
            .map((c) => (c as TextBlock).text)
            .join("");
          return {
            role: "toolResult",
            content: [{ type: "text", text: textContent }],
            toolCallId: turn.toolCallId,
            toolName: turn.toolName,
            isError: turn.isError,
            timestamp: turn.timestamp,
          } as any;
        }
        return null;
      })
      .filter(Boolean);
  }

  // Build LLM Context from turns
  private async buildLlmContext(
    turns: ConversationTurn[],
    signal?: AbortSignal,
  ): Promise<Context> {
    // If custom transformContext is provided, use legacy path (respects transformContext)
    if (this.config.transformContext) {
      return this._buildContextLegacy(turns, signal);
    }
    // Use ContextBuilder if available and no custom convertToLlm
    if (this.contextBuilder && !this.config.convertToLlm) {
      return this._buildContextWithContextBuilder(turns);
    }
    // Fallback to legacy path
    return this._buildContextLegacy(turns, signal);
  }

  /** Build context using ContextBuilder (with tokenCount) */
  private async _runPreRoundHooks(): Promise<void> {
    if (!this.config.prepareNextTurn || !this.lastTurnAssistant) return;
    try {
      const overrides = await this.config.prepareNextTurn({
        lastAssistantMessage: this.lastTurnAssistant,
        toolResults: this.lastTurnToolResults,
        newMessages: this.lastTurnNewMessages,
        round: this.state.round - 1,
        state: { ...this.state } as any,
      });
      if (overrides?.reasoningLevel !== undefined) {
        this.config.reasoningLevel = overrides.reasoningLevel;
      }
      if (overrides?.model) {
        if (this.config.setModel) {
          this.config.setModel(overrides.model);
        } else {
          this.state.metadata.nextModel = overrides.model;
        }
      }
      if (overrides?.context) {
        this.state.history = overrides.context;
      }
    } catch (e) {
      if (this.config.debug) console.error("prepareNextTurn hook error:", e);
    } finally {
      this.lastTurnAssistant = null;
      this.lastTurnToolResults = [];
      this.lastTurnNewMessages = [];
    }
  }

  /** Retrieve memories for current round if enabled */


  private async _buildContextWithContextBuilder(
    turns: ConversationTurn[],
  ): Promise<Context> {
    const systemPrompt = this.config.systemPrompt || this._extractSystemPromptFromTurns(turns);
    const result = this.contextBuilder!.build(
      systemPrompt || "",
      turns
    );
    const llmMessages = this.convertTurnsToMessages(turns);
    return {
      messages: llmMessages as any,
      systemPrompt,
      tools: this.tools as any,
      tokenCount: result.tokenCount,
    };
  }

  /** Build context via legacy path (no tokenCount) */
  private async _buildContextLegacy(
    turns: ConversationTurn[],
    signal?: AbortSignal,
  ): Promise<Context> {
    let processed = turns;
    if (this.config.transformContext) {
      processed = await this.config.transformContext(turns, signal);
    }

    const llmMessages = this.config.convertToLlm
      ? await this.config.convertToLlm(processed)
      : this.convertTurnsToMessages(processed);

    const systemPrompt = this.config.systemPrompt || this._extractSystemPromptFromTurns(processed);

    return {
      messages: llmMessages as any,
      systemPrompt,
      tools: this.tools as any,
    };
  }

  /** Extract system prompt from a turn array */
  private _extractSystemPromptFromTurns(turns: ConversationTurn[]): string {
    const systemTurn = turns.find((t) => t.role === "system");
    if (!systemTurn) return "";
    return systemTurn.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");
  }

  /**
   * Run agent to completion (non-streaming).
   */
  async run(
    initialPrompt: string,
    steeringQueue: MessageQueue,
    followUpQueue: MessageQueue,
    signal?: AbortSignal,
    initialTurns: ConversationTurn[] = [],
  ): Promise<AgentRunResult> {
    const iterator = this.executeLoop(
      initialPrompt,
      steeringQueue,
      followUpQueue,
      false,
      signal,
      initialTurns,
    )[Symbol.asyncIterator]();

    while (true) {
      const { value, done } = await iterator.next();
      if (done) {
        return value;
      }
    }
  }

  /**
   * Stream agent execution with delta events.
   * Yields LLMStreamEvent during streaming and returns final AgentRunResult.
   */
  async *stream(
    initialPrompt: string,
    steeringQueue: MessageQueue,
    followUpQueue: MessageQueue,
    signal?: AbortSignal,
    initialTurns: ConversationTurn[] = [],
  ): AsyncGenerator<any, AgentRunResult> {
    const iterator = this.executeLoop(
      initialPrompt,
      steeringQueue,
      followUpQueue,
      true,
      signal,
      initialTurns,
    )[Symbol.asyncIterator]();

    while (true) {
      const { value, done } = await iterator.next();
      if (done) {
        return value;
      } else {
        yield value;
      }
    }
  }

  /**
   * Resume execution from the current state (without resetting).
   * Used for continuing after steering/follow-up messages have been queued.
   */
  public async resume(
    initialTurns: ConversationTurn[],
    steeringQueue: MessageQueue,
    followUpQueue: MessageQueue,
    signal?: AbortSignal,
  ): Promise<AgentRunResult> {
    const iterator = this.executeLoop(
      "",
      steeringQueue,
      followUpQueue,
      false,
      signal,
      initialTurns,
      false, // resetState = false
    )[Symbol.asyncIterator]();

    // Consume the generator to get the final result
    while (true) {
      const { value, done } = await iterator.next();
      if (done) {
        return value as AgentRunResult;
      }
    }
  }

  /**
   * Core execution loop used by both run and stream.
   * @param isStreaming - true for streaming, false for non-streaming
   */
  private _initializeExecution(
    initialPrompt: string,
    initialTurns: ConversationTurn[],
    resetState: boolean,
    signal?: AbortSignal,
  ): AbortSignal {
    this.abortController = new AbortController();
    const combinedSignal = signal
      ? this.combineSignals(signal, this.abortController.signal)
      : this.abortController.signal;

    if (resetState) {
      this.state = this.createInitialState();
    }
    // Support legacy: if initialTurns empty but initialPrompt provided, create a user turn
    if (initialTurns.length === 0 && initialPrompt) {
      initialTurns = [
        {
          role: "user",
          content: [{ type: "text", text: initialPrompt }],
          timestamp: Date.now(),
        },
      ];
    }
    if (initialTurns.length > 0) {
      this.state.history.push(...initialTurns);
    }
    // Set running state before emitting events
    this.state.isRunning = true;
    // Fire-and-forget user message events
    for (const turn of initialTurns) {
      if (turn.role === 'user') {
        this.emitter.emit({
          type: 'user_message',
          message: turn,
          timestamp: Date.now(),
          round: 0,
        } as any).catch(() => {});
      }
    }
    return combinedSignal;
  }

  private async *executeLoop(
    initialPrompt: string,
    steeringQueue: MessageQueue,
    followUpQueue: MessageQueue,
    isStreaming: boolean,
    signal?: AbortSignal,
    initialTurns: ConversationTurn[] = [],
    resetState: boolean = true,
  ): AsyncGenerator<any, AgentRunResult> {
    const combinedSignal = this._initializeExecution(initialPrompt, initialTurns, resetState, signal);

    const runStartTime = Date.now();
    let totalContextBuildingTime = 0;
    let totalLLMRequestTime = 0;
    let totalToolExecutionTime = 0;
    // No pendingTurns needed - steering messages directly pushed to history

    try {
      await this.emitter.emit({
        type: "agent:start",
        timestamp: Date.now(),
        round: 0,
        initialPrompt,
      } as any);

      const maxRounds = this.config.maxRounds;

      while (this.state.round < maxRounds && !this.state.isCancelled) {
        const roundStartTime = Date.now();
        this.state.round++;

        await this._runPreRoundHooks();
        let turnEnded = false;
        let finalResultCandidate: AgentRunResult | null = null;

        // Note: Streaming mode uses message:* events from LLM stream processing.
        // Non-streaming mode emits message:start/message:end below.

        // Get steering turns via hook (if provided) or drain queue and push directly to history
        const steeringTurns = await this._collectSteeringTurns(steeringQueue);
        if (steeringTurns.length > 0) {
          this.state.history.push(...steeringTurns);
          // Fire-and-forget user message events
          for (const turn of steeringTurns) {
            if (turn.role === 'user') {
              this.emitter.emit({
                type: 'user_message',
                message: turn,
                timestamp: Date.now(),
                round: this.state.round,
              } as any).catch(() => {});
            }
          }
        }

        // Build LLM context from current history (includes steering if any)
        const llmContext = await this.buildLlmContext(
          this.state.history,
          combinedSignal,
        );
        // Record token count for this request
        if (llmContext.tokenCount !== undefined) {
          this.state.lastTokenCount = llmContext.tokenCount;
        }

        // LLM request timing
        const llmStartTime = await this._emitLlmRequest(llmContext);

        let llmRequestTime = 0;
        let response: LLMResponse | null = null;
        let finalMessage: any = null;
        // Set streaming flag in state

        if (isStreaming) {
          const streamOptions: any = {
            signal: combinedSignal,
            sessionId: this.config.sessionId,
            reasoning: this.config.reasoningLevel,
            thinkingBudget:
              this.config.thinkingBudgets?.[
                this.config.reasoningLevel ?? "off"
              ],
          };

          let partialMessage: any = null;
          let streamError: string | null = null;

          try {
            const rawStream = await this.llmStream(llmContext, streamOptions);
            for await (const event of rawStream) {
              yield event;

              switch (event.type) {
                case "start":
                  partialMessage = event.partial;
                  await this.emitter.emit({
                    type: "message:start",
                    timestamp: Date.now(),
                    round: this.state.round,
                    message: { ...partialMessage },
                  } as any);
                  break;

                case "text_start":
                case "thinking_start":
                case "toolcall_start":
                  if (partialMessage) {
                    await this.emitter.emit({
                      type: "message:update",
                      timestamp: Date.now(),
                      round: this.state.round,
                      message: { ...partialMessage },
                    } as any);
                  }
                  break;

                case "text_delta":
                case "thinking_delta":
                case "toolcall_delta":
                  if (partialMessage) {
                    await this.emitter.emit({
                      type: "message:update",
                      timestamp: Date.now(),
                      round: this.state.round,
                      message: { ...partialMessage },
                      delta: event.delta,
                    } as any);
                  }
                  break;

                case "text_end":
                case "thinking_end":
                case "toolcall_end":
                  // no special handling
                  break;

                case "done":
                  finalMessage = event.message;
                  await this.emitter.emit({
                    type: "message:end",
                    timestamp: Date.now(),
                    round: this.state.round,
                    message: finalMessage,
                  } as any);
                  break;

                case "error":
                  streamError = event.error?.errorMessage || "Stream error";
                  this.state.isCancelled = true;
                  await this.emitter.emit({
                    type: "error",
                    timestamp: Date.now(),
                    round: this.state.round,
                    message: streamError,
                  } as any);
                  break;
              }
            }

            if (!finalMessage && !streamError) {
              streamError = "Stream ended without completion";
            }
          } catch (err: any) {
            streamError = err.message || String(err);
            this.state.isCancelled = true;
            await this.emitter.emit({
              type: "error",
              timestamp: Date.now(),
              round: this.state.round,
              message: streamError,
              stack: err.stack,
            } as any);
          }

          const llmEndTime = Date.now();
          llmRequestTime = llmEndTime - llmStartTime;
          totalLLMRequestTime += llmRequestTime;

          await this.emitter.emit({
            type: "llm:response",
            timestamp: Date.now(),
            round: this.state.round,
            tokensUsed: finalMessage?.usage?.totalTokens ?? 0,
            toolCallsCount:
              finalMessage?.content.filter((c: any) => c.type === "toolCall")
                .length || 0,
          } as any);

          if (streamError) {
            if (this.config.debug) {
              const runEndTime = Date.now();
              const totalRunTime = runEndTime - runStartTime;
              await this.emitter.emit({
                type: "debug:run:timing",
                timestamp: Date.now(),
                totalRunTime,
                totalContextBuildingTime,
                totalLLMRequestTime,
                totalToolExecutionTime,
              } as any);
            }
            const errorResult: AgentRunResult = {
              finalAnswer: "",
              totalRounds: this.state.round,
              totalToolCalls: this.state.totalToolCalls,
              totalTokens: this.state.totalTokens,
              toolResults: this.state.toolResults,
              success: false,
              stopReason: "error",
              error: streamError,
              finalState: { ...this.state },
            };
            await this.emitter.emit({
              type: "agent:end",
              timestamp: Date.now(),
              round: this.state.round,
              result: errorResult,
            } as any);
            return errorResult;
          }

          if (!finalMessage) {
            const err = "No final message from LLM";
            if (this.config.debug) {
              const runEndTime = Date.now();
              const totalRunTime = runEndTime - runStartTime;
              await this.emitter.emit({
                type: "debug:run:timing",
                timestamp: Date.now(),
                totalRunTime,
                totalContextBuildingTime,
                totalLLMRequestTime,
                totalToolExecutionTime,
              } as any);
            }
            const errorResult: AgentRunResult = {
              finalAnswer: "",
              totalRounds: this.state.round,
              totalToolCalls: this.state.totalToolCalls,
              totalTokens: this.state.totalTokens,
              toolResults: this.state.toolResults,
              success: false,
              stopReason: "error",
              error: err,
              finalState: { ...this.state },
            };
            await this.emitter.emit({
              type: "agent:end",
              timestamp: Date.now(),
              round: this.state.round,
              result: errorResult,
            } as any);
            return errorResult;
          }

          const assistantTurn = this._finalizeAssistantTurn(finalMessage);
        } else {
          const llmResponse = await this.llmComplete(llmContext, {
            signal: combinedSignal,
            sessionId: this.config.sessionId,
            reasoning: this.config.reasoningLevel,
            thinkingBudget:
              this.config.thinkingBudgets?.[
                this.config.reasoningLevel ?? "off"
              ],
          });
          response = llmResponse as any;
          const llmEndTime = Date.now();
          llmRequestTime = llmEndTime - llmStartTime;
          totalLLMRequestTime += llmRequestTime;
          // Update LLM metrics
          this.metrics.llmCalls++;
          if (response?.usage) {
            this.metrics.llmTokensInput += response.usage.input || 0;
            this.metrics.llmTokensOutput += response.usage.output || 0;
          }
          this.metrics.llmTotalLatencyMs += llmRequestTime;

          await this.emitter.emit({
            type: "llm:response",
            timestamp: Date.now(),
            round: this.state.round,
            tokensUsed: response!.usage?.totalTokens ?? 0,
            toolCallsCount: response!.toolCalls?.length ?? 0,
          } as any);

          const assistantTurn = this._finalizeAssistantTurn(response!);
          // Emit message:start and message:end for non-streaming
          this.emitter.emit({
            type: "message:start",
            timestamp: Date.now(),
            round: this.state.round,
            turn: assistantTurn,
          } as any);
          this.emitter.emit({
            type: "message:end",
            timestamp: Date.now(),
            round: this.state.round,
            turn: assistantTurn,
          } as any);
        }

        // Clear streaming flag after response
        // Determine tool calls and response for strategy
        let toolCalls: ToolCallData[] = [];
        let shouldContinueResponse: any = null;

        if (isStreaming) {
          // finalMessage is guaranteed to be set at this point (errors handled above)
          toolCalls = (finalMessage.content || []).filter(
            (c: any) => c.type === "toolCall",
          ) as ToolCallData[];
          shouldContinueResponse = {
            content: "",
            toolCalls,
            stopReason: finalMessage.stopReason,
            usage: finalMessage.usage,
            errorMessage: finalMessage.errorMessage,
          };
        } else {
          // Non-streaming: toolCalls are extracted by _llmComplete
          toolCalls = response!.toolCalls || [];
          shouldContinueResponse = response!;
        }

        if (toolCalls.length > 0) {
          const result = await this._processTurnWithTools(
            toolCalls,
            isStreaming,
            finalMessage,
            response,
            combinedSignal,
            followUpQueue,
            roundStartTime,
          );
          totalToolExecutionTime += result.toolExecutionTime || 0;
          if (result.finalResult) {
            turnEnded = true;
            finalResultCandidate = result.finalResult;
          }
        } else {
          const result = await this._processTurnWithoutTools(
            isStreaming,
            finalMessage,
            response,
            followUpQueue,
          );
          if (result.finalResult) {
            turnEnded = true;
            finalResultCandidate = result.finalResult;
          }
        }

        if (turnEnded) {
          // Follow-up đã được xử lý ở trên; chỉ cần return kết quả nếu có
          if (finalResultCandidate) {
            if (this.config.debug) {
              const runEndTime = Date.now();
              const totalRunTime = runEndTime - roundStartTime;
              await this.emitter.emit({
                type: "debug:run:timing",
                timestamp: Date.now(),
                totalRunTime,
                totalContextBuildingTime,
                totalLLMRequestTime,
                totalToolExecutionTime,
              } as any);
            }
            // Debug: log termination reason
            if (this.config.debug) {
              console.info(`[AgentLoop] Terminated after ${this.state.round} rounds. stopReason=${finalResultCandidate.stopReason} success=${finalResultCandidate.success} totalToolCalls=${this.state.totalToolCalls} totalTokens=${this.state.totalTokens}`);
            }
            await this.emitter.emit({
              type: "agent:end",
              timestamp: Date.now(),
              round: this.state.round,
              result: finalResultCandidate,
            } as any);
            return finalResultCandidate;
          } else {
            // Không có finalResultCandidate, thoát vòng lặp
            break;
          }
        }
      } // while

      // Exited while: either max rounds or cancelled
      let finalResult: AgentRunResult;
      if (this.state.isCancelled) {
        finalResult = this.createAbortedResult();
      } else {
        finalResult = {
          finalAnswer: "Max rounds reached without final answer",
          totalRounds: this.state.round,
          totalToolCalls: this.state.totalToolCalls,
          totalTokens: this.state.totalTokens,
          toolResults: this.state.toolResults,
          success: false,
          stopReason: "max_rounds",
          error: "Max rounds reached",
          finalState: { ...this.state },
        };
      }

      // Emit run timing if debug mode is enabled
      if (this.config.debug) {
        const runEndTime = Date.now();
        const totalRunTime = runEndTime - runStartTime;
        await this.emitter.emit({
          type: "debug:run:timing",
          timestamp: Date.now(),
          totalRunTime,
          totalContextBuildingTime,
          totalLLMRequestTime,
          totalToolExecutionTime,
        } as any);
      }

      await this.emitter.emit({
        type: "agent:end",
        timestamp: Date.now(),
        round: this.state.round,
        result: finalResult,
      } as any);

      return finalResult;
    } catch (error: any) {
      await this.emitter.emit({
        type: "error",
        timestamp: Date.now(),
        round: this.state.round,
        message: error.message || String(error),
        stack: error.stack,
      } as any);
      const errorResult: AgentRunResult = {
        finalAnswer: "",
        totalRounds: this.state.round,
        totalToolCalls: this.state.totalToolCalls,
        totalTokens: this.state.totalTokens,
        toolResults: this.state.toolResults,
        success: false,
        stopReason: "error",
        error: error.message || String(error),
        finalState: { ...this.state },
      };
      if (this.config.debug) {
        const runEndTime = Date.now();
        const totalRunTime = runEndTime - runStartTime;
        await this.emitter.emit({
          type: "debug:run:timing",
          timestamp: Date.now(),
          totalRunTime,
          totalContextBuildingTime,
          totalLLMRequestTime,
          totalToolExecutionTime,
        } as any);
      }
      // Debug: log termination reason (error)
      if (this.config.debug) {
        console.info(`[AgentLoop] Terminated with error after ${this.state.round} rounds. error=${errorResult.error} totalToolCalls=${this.state.totalToolCalls} totalTokens=${this.state.totalTokens}`);
      }
      await this.emitter.emit({
        type: "agent:end",
        timestamp: Date.now(),
        round: this.state.round,
        result: errorResult,
      } as any);
      return errorResult;
    } finally {
      this.state.isRunning = false;
      if (isStreaming) {
        this.state.isCancelled = false;
      }
    }
  }

  private drainQueue(queue: MessageQueue): ConversationTurn[] {
    return queue.drainAll();
  }

  private async _collectSteeringTurns(
    steeringQueue: MessageQueue,
  ): Promise<ConversationTurn[]> {
    if (this.config.getSteeringMessages) {
      try {
        return await this.config.getSteeringMessages();
      } catch (e) {
        if (this.config.debug)
          console.error("getSteeringMessages hook error:", e);
        return [];
      }
    } else if (steeringQueue.hasPending) {
      return this.drainQueue(steeringQueue);
    }
    return [];
  }







  private _buildAssistantContent(response: LLMResponse): ContentBlock[] {
    const contentBlocks: ContentBlock[] = [];
    if (response.content) {
      contentBlocks.push({ type: 'text', text: response.content });
    }
    if (response.toolCalls && Array.isArray(response.toolCalls)) {
      for (const tc of response.toolCalls) {
        contentBlocks.push({
          type: 'toolCall',
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
        } as ToolCallBlock);
      }
    }
    return contentBlocks;
  }

  private createAssistantTurn(response: LLMResponse): ConversationTurn {
    return {
      id: randomUUID(),
      role: "assistant",
      content: this._buildAssistantContent(response),
      timestamp: Date.now(),
      stopReason: response.stopReason,
      errorMessage: response.errorMessage,
      usage: response.usage,
    } as any;
  }

  private _buildToolContent(result: ToolResult): (TextBlock | ImageBlock)[] {
    const isError = "error" in result;
    if (isError) {
      return [{ type: "text", text: (result as FailedToolResult).error }];
    }
    const successful = result as SuccessfulToolResult;
    if (typeof successful.content === "string") {
      return [{ type: "text", text: successful.content }];
    } else if (Array.isArray(successful.content)) {
      return successful.content;
    } else {
      const json = JSON.stringify(successful.content, null, 2);
      return [{ type: "text", text: json }];
    }
  }

  private createToolTurn(result: ToolResult): ToolTurn {
    const isError = "error" in result;
    return {
      role: "tool",
      toolCallId: result.toolCallId,
      toolName: result.toolName,
      content: this._buildToolContent(result),
      isError,
      details: (result as any).metadata?.details,
      timestamp: Date.now(),
    } as any;
  }

  private createAbortedResult(): AgentRunResult {
    return {
      finalAnswer: "",
      totalRounds: this.state.round,
      totalToolCalls: this.state.totalToolCalls,
      totalTokens: this.state.totalTokens,
      toolResults: this.state.toolResults,
      success: false,
      stopReason: "aborted",
      error: "Cancelled by user",
      finalState: { ...this.state },
    };
  }

  private combineSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
    const controller = new AbortController();
    let abortCount = 0;
    const needed = signals.filter(Boolean).length;
    const checkAbort = () => {
      abortCount++;
      if (abortCount >= needed) controller.abort();
    };
    for (const signal of signals) {
      if (signal) {
        if (signal.aborted) {
          controller.abort();
        } else {
          signal.addEventListener("abort", checkAbort, { once: true });
        }
      }
    }
    return controller.signal;
  }

  /** Get accumulated session metrics */
  public async getMetrics(): Promise<SessionMetrics> {
    return this.metrics;
  }

  /** Record a successful compaction and tokens saved */
  public recordCompaction(tokensSaved: number): void {
    this.metrics.compactions++;
    this.metrics.compactionTokensSaved += tokensSaved;
  }

  private getResultText(result: ToolResult): string {
    if ("error" in result) return result.error;
    const successful = result as SuccessfulToolResult;
    if (typeof successful.content === "string") return successful.content;
    return successful.content
      .filter((b) => b.type === "text")
      .map((b) => (b as TextBlock).text)
      .join("\n");
  }

  /**
   * Collect follow-up turns from queue (can be extended with config hook)
   */

  /**
   * Convert turns to plain text for currentPrompt
   */
  private turnsToText(turns: ConversationTurn[]): string {
    const parts: string[] = [];
    for (const turn of turns) {
      for (const block of turn.content) {
        if (block.type === "text") {
          parts.push(block.text);
        }
      }
    }
    return parts.join("\n");
  }



  private _allToolsTerminate(toolResults: ToolResult[]): boolean {
    return toolResults.length > 0 && toolResults.every((r: any) => r.terminate === true);
  }

  private async _emitDebugRoundTiming(
    roundStartTime: number,
    toolExecutionTime: number,
    isStreaming: boolean,
  ): Promise<void> {
    if (this.config.debug && !isStreaming) {
      const roundEndTime = Date.now();
      const totalRoundTime = roundEndTime - roundStartTime;
      await this.emitter.emit({
        type: "debug:round:timing",
        timestamp: Date.now(),
        round: this.state.round,
        contextBuildingTime: 0,
        memoryRetrievalTime: 0,
        llmRequestTime: 0,
        toolExecutionTime,
        totalRoundTime,
      } as any);
    }
  }

  private _createTerminatedResult(
    toolExecutionTime: number,
  ): { needNextTurn: false; finalResult: AgentRunResult; toolExecutionTime: number } {
    return {
      needNextTurn: false,
      finalResult: {
        finalAnswer: "",
        totalRounds: this.state.round,
        totalToolCalls: this.state.totalToolCalls,
        totalTokens: this.state.totalTokens,
        toolResults: this.state.toolResults,
        success: true,
        stopReason: "stop",
        error: undefined,
        finalState: { ...this.state },
      },
      toolExecutionTime,
    };
  }

  private async _handleFollowUpAfterTools(
    followUpQueue: MessageQueue,
    toolExecutionTime: number,
  ): Promise<{ handled: true; needNextTurn: boolean; toolExecutionTime: number } | { handled: false }> {
    const followUpTurns = await this.followUpManager.collect(
      followUpQueue,
      this.config.getFollowUpMessages,
      this.config.debug,
    );
    if (followUpTurns.length > 0) {
      this.state.history.push(...followUpTurns);
      this.lastTurnNewMessages.push(...followUpTurns);
      return { handled: true, needNextTurn: true, toolExecutionTime };
    }
    return { handled: false };
  }

  private async _emitLlmRequest(llmContext: Context): Promise<number> {
    const llmStartTime = Date.now();
    await this.emitter.emit({
      type: "llm:request",
      timestamp: Date.now(),
      round: this.state.round,
      promptLength: llmContext.messages.length,
      toolsAvailable: this.tools.length,
    } as any);
    return llmStartTime;
  }

  private _finalizeAssistantTurn(message: any): AssistantTurn {
    const assistantTurn = this.createAssistantTurn(message);
    this.state.history.push(assistantTurn);
    this.lastTurnAssistant = assistantTurn as AssistantTurn;
    this.lastTurnNewMessages = [assistantTurn];
    this.lastTurnToolResults = [];
    this._enforceHistoryLimits();
    return assistantTurn as AssistantTurn;
  }

  private _enforceHistoryLimits(): void {
    // Count tool turns
    const toolTurns = this.state.history.filter(t => t.role === 'tool');
    if (toolTurns.length > this.MAX_TOOL_TURNS) {
      const excess = toolTurns.length - this.MAX_TOOL_TURNS;
      // Remove oldest tool turns
      const toRemove = new Set<number>();
      let removed = 0;
      for (let i = 0; i < this.state.history.length && removed < excess; i++) {
        if (this.state.history[i].role === 'tool') {
          toRemove.add(i);
          removed++;
        }
      }
      this.state.history = this.state.history.filter((_, idx) => !toRemove.has(idx));
      this.metrics.historyEvictions += removed;
      if (this.config.debug) {
        console.warn(`[AgentLoop] History limit: removed ${removed} old tool turns (kept ${this.MAX_TOOL_TURNS})`);
      }
    }
  }

  private _enforceToolResultsLimit(): void {
    if (this.state.toolResults.length > this.MAX_TOOL_RESULTS) {
      const excess = this.state.toolResults.length - this.MAX_TOOL_RESULTS;
      this.state.toolResults = this.state.toolResults.slice(excess);
      this.metrics.toolResultsEvictions += excess;
      if (this.config.debug) {
        console.warn(`[AgentLoop] toolResults limit: removed ${excess} old results (kept ${this.MAX_TOOL_RESULTS})`);
      }
    }
  }

  private async _processTurnWithTools(
    toolCalls: ToolCallData[],
    isStreaming: boolean,
    finalMessage: any,
    response: LLMResponse | null,
    combinedSignal: AbortSignal,
    followUpQueue: MessageQueue,
    roundStartTime: number,
  ): Promise<{ needNextTurn: boolean; finalResult?: AgentRunResult; toolExecutionTime: number }> {
    this.state.totalToolCalls += toolCalls.length;
    const toolContext: ToolContext = {
      round: this.state.round,
      runtimeState: this.state,
      signal: combinedSignal,
    };

    const toolExecStartTime = Date.now();
    const toolResults = await this.toolExecutor.executeAll(
      toolCalls,
      toolContext,
      combinedSignal,
    );
    const toolExecutionTime = Date.now() - toolExecStartTime;

    this.state.totalToolCalls += toolCalls.length;
    this.metrics.toolCalls += toolResults.length;
    this.metrics.toolSuccesses += toolResults.filter(r => !r.isError).length;
    this.metrics.toolFailures += toolResults.filter(r => r.isError).length;
    this.metrics.toolTotalLatencyMs += toolExecutionTime;
    this.state.toolResults.push(...toolResults);
    this._enforceToolResultsLimit();

    const toolTurns: ToolTurn[] = [];
    for (const result of toolResults) {
      const toolTurn = this.createToolTurn(result);
      this.state.history.push(toolTurn);
      toolTurns.push(toolTurn);
      this.lastTurnNewMessages.push(toolTurn);
    }
    this.lastTurnToolResults = toolResults;

    await this._emitDebugRoundTiming(roundStartTime, toolExecutionTime, isStreaming);

    const followUpResult = await this._handleFollowUpAfterTools(followUpQueue, toolExecutionTime);
    if (followUpResult.handled) {
      return { needNextTurn: followUpResult.needNextTurn, toolExecutionTime: followUpResult.toolExecutionTime };
    }

    if (this._allToolsTerminate(toolResults)) {
      return this._createTerminatedResult(toolExecutionTime);
    }

    return { needNextTurn: true, toolExecutionTime };
  }

  private async _processTurnWithoutTools(
    isStreaming: boolean,
    finalMessage: any,
    response: LLMResponse | null,
    followUpQueue: MessageQueue,
  ): Promise<{ needNextTurn: boolean; finalResult?: AgentRunResult; toolExecutionTime?: number }> {
    const followUpTurns = await this.followUpManager.collect(
      followUpQueue,
      this.config.getFollowUpMessages,
      this.config.debug,
    );
    if (followUpTurns.length > 0) {
      this.state.history.push(...followUpTurns);
      this.lastTurnNewMessages.push(...followUpTurns);
      return { needNextTurn: true };
    }

    let finalAnswer: string;
    let stopReason: StopReason | undefined;
    let errorMessage: string | undefined;

    if (isStreaming) {
      const contentBlocks = finalMessage.content || [];
      finalAnswer = Array.isArray(contentBlocks)
        ? contentBlocks.filter((c: any) => c.type === "text").map((c: any) => c.text).join("")
        : String(contentBlocks);
      stopReason = finalMessage.stopReason;
      errorMessage = finalMessage.errorMessage;
    } else {
      finalAnswer = response!.content || "";
      stopReason = response!.stopReason;
      errorMessage = response!.errorMessage;
    }

    return {
      needNextTurn: false,
      finalResult: {
        finalAnswer,
        totalRounds: this.state.round,
        totalToolCalls: this.state.totalToolCalls,
        totalTokens: this.state.totalTokens,
        toolResults: this.state.toolResults,
        success: true,
        stopReason: stopReason || "stop",
        error: errorMessage,
        finalState: { ...this.state },
      },
      toolExecutionTime: 0,
    };
  }
}
