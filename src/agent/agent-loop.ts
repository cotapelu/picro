// SPDX-License-Identifier: Apache-2.0
/**
 * AgentLoop: core loop execution.
 * Different from pi-agent-legacy: class-based, simpler flow.
 */

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
  MemoryEntry,
  MemoryStore,
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
  SuccessfulToolResult,
  FailedToolResult,
} from "./types.js";
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
  private memoryStore?: MemoryStore;
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

  constructor(
    config: AgentConfig,
    emitter: EventEmitter,
    toolExecutor: ToolExecutor,
    contextBuilder: ContextBuilder | null,
    strategy: LoopStrategy,
    llmComplete: (context: Context, options?: any) => Promise<LLMResponse>,
    llmStream: (context: Context, options?: any) => Promise<AsyncIterable<any>>,
    memoryStore?: MemoryStore,
    tools: AgentTool[] = [],
  ) {
    this.config = config;
    this.emitter = emitter;
    this.toolExecutor = toolExecutor;
    this.contextBuilder = contextBuilder;
    this.strategy = strategy;
    this.memoryStore = memoryStore;
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

  // Build LLM Context from turns and optionally memories
  private async buildLlmContext(
    turns: ConversationTurn[],
    memories: MemoryEntry[],
    signal?: AbortSignal,
  ): Promise<Context> {
    let processed = turns;
    if (this.config.transformContext) {
      processed = await this.config.transformContext(turns, signal);
    } else if (memories.length > 0) {
      // Inject memories as system messages if no custom transform
      const memoryTurns: ConversationTurn[] = memories.map((mem) => ({
        role: "system",
        content: [{ type: "text", text: mem.content }],
        timestamp: Date.now(),
      }));
      processed = [...memoryTurns, ...processed];
    }

    let llmMessages: LlmMessage[];
    if (this.config.convertToLlm) {
      llmMessages = await this.config.convertToLlm(processed);
    } else {
      llmMessages = this.convertTurnsToMessages(processed);
    }

    const systemTurn = processed.find((t) => t.role === "system");
    let systemPrompt: string | undefined;
    if (systemTurn) {
      systemPrompt = (systemTurn as any).content
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("");
    }

    return {
      messages: llmMessages as any,
      systemPrompt,
      tools: this.tools as any,
    };
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
  private async *executeLoop(
    initialPrompt: string,
    steeringQueue: MessageQueue,
    followUpQueue: MessageQueue,
    isStreaming: boolean,
    signal?: AbortSignal,
    initialTurns: ConversationTurn[] = [],
    resetState: boolean = true,
  ): AsyncGenerator<any, AgentRunResult> {
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
    this.state.isRunning = true;

    const runStartTime = Date.now();
    let totalContextBuildingTime = 0;
    let totalMemoryRetrievalTime = 0;
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

        // Invoke prepareNextTurn hook if configured and previous turn exists
        if (this.config.prepareNextTurn && this.lastTurnAssistant) {
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
            if (this.config.debug)
              console.error("prepareNextTurn hook error:", e);
          } finally {
            // Reset after processing to avoid re-running
            this.lastTurnAssistant = null;
            this.lastTurnToolResults = [];
            this.lastTurnNewMessages = [];
          }
        }
        let turnEnded = false;
        let finalResultCandidate: AgentRunResult | null = null;

        if (isStreaming) {
          await this.emitter.emit({
            type: "turn:start",
            timestamp: Date.now(),
            round: this.state.round,
            promptLength: this.state.history.length,
          } as any);
        }

        // Get steering turns via hook (if provided) or drain queue and push directly to history
        const steeringTurns = await this._collectSteeringTurns(steeringQueue);
        if (steeringTurns.length > 0) {
          this.state.history.push(...steeringTurns);
        }

        // Memory retrieval - use last user message as query if available
        let memories: MemoryEntry[] = [];
        let memoryRetrievalTime = 0;
        const lastUserTurn = [...this.state.history]
          .reverse()
          .find((t) => t.role === "user");
        const query =
          lastUserTurn?.content
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("") || "";
        const memResult = await this._retrieveMemories(query);
        memories = memResult.memories;
        memoryRetrievalTime = memResult.retrievalTime;
        totalMemoryRetrievalTime += memoryRetrievalTime;

        // Build LLM context from current history (includes steering if any)
        const llmContext = await this.buildLlmContext(
          this.state.history,
          memories,
          combinedSignal,
        );

        // LLM request timing
        const llmStartTime = Date.now();
        await this.emitter.emit({
          type: "llm:request",
          timestamp: Date.now(),
          round: this.state.round,
          promptLength: llmContext.messages.length,
          toolsAvailable: this.tools.length,
        } as any);

        let llmRequestTime = 0;
        let response: LLMResponse | null = null;
        let finalMessage: any = null;
        // Set streaming flag in state
        this.state.isStreaming = isStreaming;

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
                totalMemoryRetrievalTime,
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
                totalMemoryRetrievalTime,
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

          const assistantTurn = this.createAssistantTurn(finalMessage);
          this.state.history.push(assistantTurn);
          this.lastTurnAssistant = assistantTurn as AssistantTurn;
          this.lastTurnNewMessages = [assistantTurn];
          this.lastTurnToolResults = [];
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

          await this.emitter.emit({
            type: "llm:response",
            timestamp: Date.now(),
            round: this.state.round,
            tokensUsed: response!.usage?.totalTokens ?? 0,
            toolCallsCount: response!.toolCalls?.length ?? 0,
          } as any);

          const assistantTurn = this.createAssistantTurn(response!);
          this.state.history.push(assistantTurn);
          this.lastTurnAssistant = assistantTurn as AssistantTurn;
          this.lastTurnNewMessages = [assistantTurn];
          this.lastTurnToolResults = [];
          // Emit message:start and message:end for non-streaming
          this.emitter.emit({
            type: "message:start",
            timestamp: Date.now(),
            round: this.state.round,
            message: assistantTurn,
          } as any);
          this.emitter.emit({
            type: "message:end",
            timestamp: Date.now(),
            round: this.state.round,
            message: assistantTurn,
          } as any);
        }

        // Clear streaming flag after response
        this.state.isStreaming = false;
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
          toolCalls = response!.toolCalls || [];
          shouldContinueResponse = response!;
        }

        if (toolCalls.length > 0) {
          this.state.totalToolCalls += toolCalls.length;

          const toolContext: ToolContext = {
            round: this.state.round,
            runtimeState: this.state,
            signal: combinedSignal,
          };

          // Tool execution timing
          const toolExecStartTime = Date.now();
          const toolResults = await this.toolExecutor.executeAll(
            toolCalls,
            toolContext,
            combinedSignal,
          );
          const toolExecEndTime = Date.now();
          const toolExecutionTime = toolExecEndTime - toolExecStartTime;
          totalToolExecutionTime += toolExecutionTime;

          this.state.toolResults.push(...toolResults);

          if (this.config.autoSaveMemories && this.memoryStore) {
            // Use last user query for memory
            const lastUserTurn = [...this.state.history]
              .reverse()
              .find((t) => t.role === "user");
            const query =
              lastUserTurn?.content
                .filter((c) => c.type === "text")
                .map((c) => c.text)
                .join("") || "";
            if (isStreaming) {
              await this.autoSaveMemory(query, finalMessage, toolResults);
            } else {
              await this.autoSaveMemory(query, response!, toolResults);
            }
          }

          // Do NOT modify currentPrompt - tool results are already in history as tool turns

          const toolTurns: ToolTurn[] = [];
          for (const result of toolResults) {
            const toolTurn = this.createToolTurn(result);
            this.state.history.push(toolTurn);
            toolTurns.push(toolTurn);
            this.lastTurnNewMessages.push(toolTurn);
          }
          this.lastTurnToolResults = toolResults;

          // Emit round timing if debug mode is enabled (match original: only non-streaming)
          if (this.config.debug && !isStreaming) {
            const roundEndTime = Date.now();
            const totalRoundTime = roundEndTime - roundStartTime;
            await this.emitter.emit({
              type: "debug:round:timing",
              timestamp: Date.now(),
              round: this.state.round,
              contextBuildingTime: 0,
              memoryRetrievalTime,
              llmRequestTime,
              toolExecutionTime,
              totalRoundTime,
            } as any);
          }

          await this.emitter.emit({
            type: "turn:end",
            timestamp: Date.now(),
            round: this.state.round,
            toolCallsExecuted: toolCalls.length,
            hasAssistantContent: true,
          } as any);

          // Check for early termination due to all tools signaling terminate
          const allTerminate =
            toolResults.length > 0 &&
            toolResults.every((r) => (r as any).terminate === true);
          if (allTerminate) {
            const followUpTurns = await this.followUpManager.collect(
              followUpQueue,
              this.config.getFollowUpMessages,
              this.config.debug,
            );
            if (followUpTurns.length > 0) {
              this.state.history.push(...followUpTurns);
              // Continue to next round - follow-up messages are already in history
              continue;
            } else {
              turnEnded = true;
              finalResultCandidate = {
                finalAnswer: "",
                totalRounds: this.state.round,
                totalToolCalls: this.state.totalToolCalls,
                totalTokens: this.state.totalTokens,
                toolResults: this.state.toolResults,
                success: true,
                stopReason: "stop",
                error: undefined,
                finalState: { ...this.state },
              };
            }
          } else {
            // After tool execution and not allTerminate: we need another LLM turn to get final answer,
            // unless follow-up interrupts.
            const followUpTurns = await this.followUpManager.collect(
              followUpQueue,
              this.config.getFollowUpMessages,
              this.config.debug,
            );
            if (followUpTurns.length > 0) {
              this.state.history.push(...followUpTurns);
              // Continue to next round - follow-up messages are already in history
              continue;
            }
            // else: no follow-up, loop will continue for another LLM call
          }
        } else {
          await this.emitter.emit({
            type: "turn:end",
            timestamp: Date.now(),
            round: this.state.round,
            toolCallsExecuted: 0,
            hasAssistantContent: true,
          } as any);

          // No tool calls: prepare final result candidate
          let finalAnswer: string;
          let stopReason: StopReason | undefined;
          let errorMessage: string | undefined;

          if (isStreaming) {
            const contentBlocks = finalMessage.content || [];
            finalAnswer = Array.isArray(contentBlocks)
              ? contentBlocks
                  .filter((c: any) => c.type === "text")
                  .map((c: any) => c.text)
                  .join("")
              : String(contentBlocks);
            stopReason = finalMessage.stopReason;
            errorMessage = finalMessage.errorMessage;
          } else {
            finalAnswer = response!.content || "";
            stopReason = response!.stopReason;
            errorMessage = response!.errorMessage;
          }

          finalResultCandidate = {
            finalAnswer,
            totalRounds: this.state.round,
            totalToolCalls: this.state.totalToolCalls,
            totalTokens: this.state.totalTokens,
            toolResults: this.state.toolResults,
            success: true,
            stopReason: stopReason || "stop",
            error: errorMessage,
            finalState: { ...this.state },
          };

          turnEnded = true;
        }

        if (turnEnded) {
          // Check follow-up messages
          const followUpTurns = await this.followUpManager.collect(
            followUpQueue,
            this.config.getFollowUpMessages,
            this.config.debug,
          );
          if (followUpTurns.length > 0) {
            // Follow-up messages are full turns - push to history and continue
            this.state.history.push(...followUpTurns);
            continue;
          } else {
            // No follow-up: emit agent_end if needed and return final result
            if (finalResultCandidate) {
              if (this.config.debug) {
                const runEndTime = Date.now();
                const totalRunTime = runEndTime - roundStartTime;
                await this.emitter.emit({
                  type: "debug:run:timing",
                  timestamp: Date.now(),
                  totalRunTime,
                  totalContextBuildingTime,
                  totalMemoryRetrievalTime,
                  totalLLMRequestTime,
                  totalToolExecutionTime,
                } as any);
              }
              await this.emitter.emit({
                type: "agent:end",
                timestamp: Date.now(),
                round: this.state.round,
                result: finalResultCandidate,
              } as any);
              return finalResultCandidate;
            } else {
              // No final result candidate? Should not happen, break to exit.
              break;
            }
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
          totalMemoryRetrievalTime,
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
          totalMemoryRetrievalTime,
          totalLLMRequestTime,
          totalToolExecutionTime,
        } as any);
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

  private async _retrieveMemories(
    currentPrompt: string,
  ): Promise<{ memories: MemoryEntry[]; retrievalTime: number }> {
    const result: { memories: MemoryEntry[]; retrievalTime: number } = {
      memories: [],
      retrievalTime: 0,
    };
    if (!this.memoryStore) return result;
    const memoryStart = Date.now();
    try {
      const retrieval = await this.memoryStore.recall(currentPrompt);
      result.memories = retrieval.memories;
      result.retrievalTime = Date.now() - memoryStart;
      await this.emitter.emit({
        type: "memory:retrieve",
        timestamp: Date.now(),
        round: this.state.round,
        query: currentPrompt,
        memoriesRetrieved: result.memories.length,
        scores: retrieval.scores,
        memories: result.memories.map((mem, index) => ({
          content: mem.content,
          relevance: mem.relevance,
          index,
        })),
      } as any);
    } catch (e) {
      console.warn("Memory retrieval failed:", e);
    }
    return result;
  }

  private async autoSaveMemory(
    prompt: string,
    response: LLMResponse,
    results: ToolResult[],
  ): Promise<void> {
    if (!this.memoryStore) return;
    try {
      await this.memoryStore.remember("user_input", prompt);
      if (response.content) {
        await this.memoryStore.remember("assistant_response", response.content);
      }
      for (const result of results) {
        const content = `tool: ${result.toolName} => ${this.getResultText(result)}`;
        await this.memoryStore.remember("tool_result", content, {
          toolName: result.toolName,
          isError: "error" in result,
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      console.warn("Auto-save memory failed:", e);
    }
  }

  private createAssistantTurn(response: LLMResponse): ConversationTurn {
    return {
      role: "assistant",
      content: response.content
        ? [{ type: "text", text: response.content }]
        : [],
      timestamp: Date.now(),
      stopReason: response.stopReason,
      errorMessage: response.errorMessage,
      usage: response.usage,
    } as any;
  }

  private createToolTurn(result: ToolResult): ToolTurn {
    const isError = "error" in result;
    const contentBlocks: (TextBlock | ImageBlock)[] = isError
      ? [{ type: "text", text: (result as FailedToolResult).error }]
      : (() => {
          const successful = result as SuccessfulToolResult;
          return typeof successful.content === "string"
            ? [{ type: "text", text: successful.content }]
            : successful.content;
        })();
    return {
      role: "tool",
      toolCallId: result.toolCallId,
      toolName: result.toolName,
      content: contentBlocks,
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
}
