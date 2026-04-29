// SPDX-License-Identifier: Apache-2.0
/**
 * Agent runner: core loop execution.
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
   ToolDefinition,
 } from './types.js';
import type { Model } from '@picro/llm';
import type { AgentEvent } from './events.js';
 import { EventEmitter } from './event-emitter.js';
 import { ToolExecutor } from './tool-executor.js';
 import { ContextBuilder } from './context-builder.js';
 import { MessageQueue } from './message-queue.js';

/**
 * Manages the agent execution loop.
 * Separated from Agent class for cleaner architecture.
 */
export class AgentRunner {
  private state: AgentRuntimeState;
  private config: AgentConfig;
  private emitter: EventEmitter;
  private toolExecutor: ToolExecutor;
  private contextBuilder: ContextBuilder;
  private strategy: LoopStrategy;
  private abortController: AbortController | null = null;
  private memoryStore?: MemoryStore;

  constructor(
    config: AgentConfig,
    emitter: EventEmitter,
    toolExecutor: ToolExecutor,
    contextBuilder: ContextBuilder,
    strategy: LoopStrategy,
    memoryStore?: MemoryStore
  ) {
    this.config = config;
    this.emitter = emitter;
    this.toolExecutor = toolExecutor;
    this.contextBuilder = contextBuilder;
    this.strategy = strategy;
    this.memoryStore = memoryStore;

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
  private reset(): void {
    this.state = this.createInitialState();
  }

  private createInitialState(): AgentRuntimeState {
    return {
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
  }

   /**
    * Run agent to completion (non-streaming).
    */
   async run(
     initialPrompt: string,
     steeringQueue: MessageQueue,
     followUpQueue: MessageQueue,
     llmProvider: (prompt: string, tools: any[], options?: any) => Promise<LLMResponse>,
     signal?: AbortSignal,
     initialTurns: ConversationTurn[] = []
   ): Promise<AgentRunResult> {
     this.abortController = new AbortController();
     const combinedSignal = signal
       ? this.combineSignals(signal, this.abortController.signal)
       : this.abortController.signal;

     this.state = this.createInitialState();
     if (initialTurns.length > 0) {
       this.state.history.push(...initialTurns);
     }
     this.state.isRunning = true;

     const runStartTime = Date.now();
     let totalContextBuildingTime = 0;
     let totalMemoryRetrievalTime = 0;
     let totalLLMRequestTime = 0;
     let totalToolExecutionTime = 0;

     try {
       await this.emitter.emit({
         type: 'agent:start',
         timestamp: Date.now(),
         round: 0,
         initialPrompt,
       } as any);

       let currentPrompt = initialPrompt;
       const maxRounds = this.config.maxRounds;

       while (this.state.round < maxRounds && !this.state.isCancelled) {
         const roundStartTime = Date.now();
         this.state.round++;

         if (steeringQueue.hasPending) {
           const steering = this.drainQueue(steeringQueue);
           this.state.history.push(...steering);
         }

         currentPrompt = this.strategy.transformPrompt?.(currentPrompt, this.state) ?? currentPrompt;

         // Context building timing
         const contextBuildStart = Date.now();
         let contextTurns = this.state.history;
         if (this.config.transformContext) {
           contextTurns = await this.config.transformContext(contextTurns, combinedSignal);
         }
         const contextBuildEnd = Date.now();
         totalContextBuildingTime += (contextBuildEnd - contextBuildStart);

         // Memory retrieval timing
         let memories: MemoryEntry[] = [];
         let memoryRetrievalTime = 0;
         if (this.memoryStore) {
           const memoryStart = Date.now();
           try {
             const retrieval = await this.memoryStore.recall(currentPrompt);
             memories = retrieval.memories;
             memoryRetrievalTime = Date.now() - memoryStart;
             totalMemoryRetrievalTime += memoryRetrievalTime;
             await this.emitter.emit({
               type: 'memory:retrieve',
               timestamp: Date.now(),
               round: this.state.round,
               query: currentPrompt,
               memoriesRetrieved: memories.length,
               scores: retrieval.scores,
               memories: memories.map((mem, index) => ({
                 content: mem.content,
                 relevance: mem.relevance,
                 index,
               })),
             } as any);
           } catch (e) {
             console.warn('Memory retrieval failed:', e);
           }
         }

         // Context building
         const { prompt: fullPrompt, tokenCount } = this.contextBuilder.build(
           currentPrompt,
           contextTurns,
           memories
         );
         this.state.promptLength = fullPrompt.length;
         this.state.totalTokens += tokenCount;

         const toolDefs = this.toolExecutor.getNames().map((name) => {
           const def = this.toolExecutor.getDefinition(name);
           return {
             type: 'function',
             function: {
               name: def!.name,
               description: def!.description,
               parameters: def!.parameters || { type: 'object', properties: {}, required: [] },
             },
           };
         });

         // LLM request timing
         const llmStartTime = Date.now();
         await this.emitter.emit({
           type: 'llm:request',
           timestamp: Date.now(),
           round: this.state.round,
           promptLength: fullPrompt.length,
           toolsAvailable: toolDefs.length,
         } as any);

         const response = await llmProvider(fullPrompt, toolDefs, {
           signal: combinedSignal,
           sessionId: this.config.sessionId,
           reasoning: this.config.reasoningLevel,
           thinkingBudget: this.config.thinkingBudgets?.[this.config.reasoningLevel ?? 'off'],
         });
         const llmEndTime = Date.now();
         const llmRequestTime = llmEndTime - llmStartTime;
         totalLLMRequestTime += llmRequestTime;

         await this.emitter.emit({
           type: 'llm:response',
           timestamp: Date.now(),
           round: this.state.round,
           tokensUsed: tokenCount,
           toolCallsCount: response.toolCalls?.length ?? 0,
         } as any);

         if (response.toolCalls && response.toolCalls.length > 0) {
           this.state.totalToolCalls += response.toolCalls.length;

           const context: ToolContext = {
             round: this.state.round,
             runtimeState: this.state,
             signal: combinedSignal,
           };

           // Tool execution timing
           const toolExecStartTime = Date.now();
           const toolResults = await this.toolExecutor.executeAll(
             response.toolCalls,
             context,
             combinedSignal
           );
           const toolExecEndTime = Date.now();
           const toolExecutionTime = toolExecEndTime - toolExecStartTime;
           totalToolExecutionTime += toolExecutionTime;

           this.state.toolResults.push(...toolResults);

           if (this.config.autoSaveMemories && this.memoryStore) {
             await this.autoSaveMemory(currentPrompt, response, toolResults);
           }

           const resultsText = this.strategy.formatResults(toolResults);
           currentPrompt += `\n\n[Tool Results]\n${resultsText}`;

           this.state.history.push(this.createAssistantTurn(response));
           for (const result of toolResults) {
             this.state.history.push(this.createToolTurn(result));
           }

           // Emit round timing if debug mode is enabled
           if (this.config.debug) {
             const roundEndTime = Date.now();
             const totalRoundTime = roundEndTime - roundStartTime;
             await this.emitter.emit({
               type: 'debug:round:timing',
               timestamp: Date.now(),
               round: this.state.round,
               contextBuildingTime: (contextBuildEnd - contextBuildStart),
               memoryRetrievalTime,
               llmRequestTime,
               toolExecutionTime,
               totalRoundTime,
             } as any);
           }

           await this.emitter.emit({
             type: 'turn:end',
             timestamp: Date.now(),
             round: this.state.round,
             toolCallsExecuted: response.toolCalls.length,
             hasAssistantContent: !!response.content,
           } as any);

           if (!this.strategy.shouldContinue(response, this.state)) {
             break;
           }
         } else {
           this.state.history.push(this.createAssistantTurn(response));

           await this.emitter.emit({
             type: 'turn:end',
             timestamp: Date.now(),
             round: this.state.round,
             toolCallsExecuted: 0,
             hasAssistantContent: true,
           } as any);

           const finalResult: AgentRunResult = {
             finalAnswer: response.content || '',
             totalRounds: this.state.round,
             totalToolCalls: this.state.totalToolCalls,
             totalTokens: this.state.totalTokens,
             toolResults: this.state.toolResults,
             success: true,
             stopReason: response.stopReason || 'stop',
             finalState: { ...this.state },
           };

           // Emit run timing if debug mode is enabled
           if (this.config.debug) {
             const runEndTime = Date.now();
             const totalRunTime = runEndTime - runStartTime;
             await this.emitter.emit({
               type: 'debug:run:timing',
               timestamp: Date.now(),
               totalRunTime,
               totalContextBuildingTime,
               totalMemoryRetrievalTime,
               totalLLMRequestTime,
               totalToolExecutionTime,
             } as any);
           }

           await this.emitter.emit({
             type: 'agent:end',
             timestamp: Date.now(),
             round: this.state.round,
             result: finalResult,
           } as any);

           return finalResult;
         }
       }

       if (this.state.isCancelled) {
         const abortedResult = this.createAbortedResult();
         await this.emitter.emit({
           type: 'agent:end',
           timestamp: Date.now(),
           round: this.state.round,
           result: abortedResult,
         } as any);
         return abortedResult;
       }

       const maxRoundsResult: AgentRunResult = {
         finalAnswer: 'Max rounds reached without final answer',
         totalRounds: this.state.round,
         totalToolCalls: this.state.totalToolCalls,
         totalTokens: this.state.totalTokens,
         toolResults: this.state.toolResults,
         success: false,
         stopReason: 'max_rounds',
         error: 'Max rounds reached',
         finalState: { ...this.state },
       };

       // Emit run timing if debug mode is enabled
       if (this.config.debug) {
         const runEndTime = Date.now();
         const totalRunTime = runEndTime - runStartTime;
         await this.emitter.emit({
           type: 'debug:run:timing',
           timestamp: Date.now(),
           totalRunTime,
           totalContextBuildingTime,
           totalMemoryRetrievalTime,
           totalLLMRequestTime,
           totalToolExecutionTime,
         } as any);
       }

       await this.emitter.emit({
         type: 'agent:end',
         timestamp: Date.now(),
         round: this.state.round,
         result: maxRoundsResult,
       } as any);

       return maxRoundsResult;
     } catch (error: any) {
       await this.emitter.emit({
         type: 'error',
         timestamp: Date.now(),
         round: this.state.round,
         message: error.message || String(error),
         stack: error.stack,
       } as any);

       const errorResult: AgentRunResult = {
         finalAnswer: '',
         totalRounds: this.state.round,
         totalToolCalls: this.state.totalToolCalls,
         totalTokens: this.state.totalTokens,
         toolResults: this.state.toolResults,
         success: false,
         stopReason: 'error',
         error: error.message || String(error),
         finalState: { ...this.state },
       };

       // Emit run timing if debug mode is enabled
       if (this.config.debug) {
         const runEndTime = Date.now();
         const totalRunTime = runEndTime - runStartTime;
         await this.emitter.emit({
           type: 'debug:run:timing',
           timestamp: Date.now(),
           totalRunTime,
           totalContextBuildingTime,
           totalMemoryRetrievalTime,
           totalLLMRequestTime,
           totalToolExecutionTime,
         } as any);
       }

       await this.emitter.emit({
         type: 'agent:end',
         timestamp: Date.now(),
         round: this.state.round,
         result: errorResult,
       } as any);

       return errorResult;
     } finally {
       this.state.isRunning = false;
     }
   }



  private drainQueue(queue: MessageQueue): ConversationTurn[] {
    return queue.drainAll();
  }

   private async autoSaveMemory(
     prompt: string,
     response: LLMResponse,
     results: ToolResult[]
   ): Promise<void> {
     if (!this.memoryStore) return;
     try {
       await this.memoryStore.remember('user_input', prompt);
       if (response.content) {
         await this.memoryStore.remember('assistant_response', response.content);
       }
       for (const result of results) {
         const content = `tool: ${result.toolName} => ${this.getResultText(result)}`;
         await this.memoryStore.remember('tool_result', content, {
           toolName: result.toolName,
           isError: 'error' in result,
           timestamp: Date.now(),
         });
       }
     } catch (e) {
       console.warn('Auto-save memory failed:', e);
     }
   }

  private createAssistantTurn(response: LLMResponse): ConversationTurn {
    return {
      role: 'assistant',
      content: response.content ? [{ type: 'text', text: response.content }] : [],
      timestamp: Date.now(),
      stopReason: response.stopReason,
      errorMessage: response.errorMessage,
      usage: response.usage,
    } as any;
  }

  private createToolTurn(result: ToolResult): ConversationTurn {
    const isError = 'error' in result;
    return {
      role: 'tool',
      toolCallId: result.toolCallId,
      toolName: result.toolName,
      content: isError
        ? [{ type: 'text', text: result.error as string }]
        : [{ type: 'text', text: result.result as string }],
      isError,
      details: (result as any).metadata?.details,
      timestamp: Date.now(),
    } as any;
  }

  private createAbortedResult(): AgentRunResult {
    return {
      finalAnswer: '',
      totalRounds: this.state.round,
      totalToolCalls: this.state.totalToolCalls,
      totalTokens: this.state.totalTokens,
      toolResults: this.state.toolResults,
      success: false,
      stopReason: 'aborted',
      error: 'Cancelled by user',
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
          signal.addEventListener('abort', checkAbort, { once: true });
        }
      }
    }
    return controller.signal;
  }

  private getResultText(result: ToolResult): string {
    if ('error' in result) return result.error;
    return result.result;
  }

  /**
   * Stream agent execution with delta events.
   * Yields LLMStreamEvent during streaming and returns final AgentRunResult.
   */
   async *stream(
     initialPrompt: string,
     steeringQueue: MessageQueue,
     followUpQueue: MessageQueue,
     streamProvider: (prompt: string, tools: any[], options?: any) => AsyncIterable<any> | Promise<AsyncIterable<any>>,
     signal?: AbortSignal,
     initialTurns: ConversationTurn[] = []
   ): AsyncGenerator<any, AgentRunResult> {
     this.abortController = new AbortController();
     const combinedSignal = signal
       ? this.combineSignals(signal, this.abortController.signal)
       : this.abortController.signal;

     this.state = this.createInitialState();
     if (initialTurns.length > 0) {
       this.state.history.push(...initialTurns);
     }
     this.state.isRunning = true;

     const runStartTime = Date.now();
     let totalContextBuildingTime = 0;
     let totalMemoryRetrievalTime = 0;
     let totalLLMRequestTime = 0;
     let totalToolExecutionTime = 0;

     try {
       await this.emitter.emit({
         type: 'agent:start',
         timestamp: Date.now(),
         round: 0,
         initialPrompt,
       } as any);

       let currentPrompt = initialPrompt;
       const maxRounds = this.config.maxRounds;

       while (this.state.round < maxRounds && !this.state.isCancelled) {
         const roundStartTime = Date.now();
         this.state.round++;

         await this.emitter.emit({
           type: 'turn:start',
           timestamp: Date.now(),
           round: this.state.round,
           promptLength: currentPrompt.length,
         } as any);

         // Drain steering queue
         if (steeringQueue.hasPending) {
           const steering = this.drainQueue(steeringQueue);
           this.state.history.push(...steering);
         }

         // Apply transformPrompt
         currentPrompt = this.strategy.transformPrompt?.(currentPrompt, this.state) ?? currentPrompt;

         // Context building with timing
         const contextBuildStart = Date.now();
         let contextTurns = this.state.history;
         if (this.config.transformContext) {
           contextTurns = await this.config.transformContext(contextTurns, combinedSignal);
         }
         const contextBuildEnd = Date.now();
         totalContextBuildingTime += (contextBuildEnd - contextBuildStart);

         // Memory retrieval with timing
         let memories: MemoryEntry[] = [];
         let memoryRetrievalTime = 0;
         if (this.memoryStore) {
           const memoryStart = Date.now();
           try {
             const retrieval = await this.memoryStore.recall(currentPrompt);
             memories = retrieval.memories;
             memoryRetrievalTime = Date.now() - memoryStart;
             totalMemoryRetrievalTime += memoryRetrievalTime;
             await this.emitter.emit({
               type: 'memory:retrieve',
               timestamp: Date.now(),
               round: this.state.round,
               query: currentPrompt,
               memoriesRetrieved: memories.length,
               scores: retrieval.scores,
               memories: memories.map((mem, index) => ({
                 content: mem.content,
                 relevance: mem.relevance,
                 index,
               })),
             } as any);
           } catch (e) {
             console.warn('Memory retrieval failed:', e);
           }
         }

         // Build prompt
         const { prompt: fullPrompt, tokenCount } = this.contextBuilder.build(
           currentPrompt,
           contextTurns,
           memories
         );
         this.state.promptLength = fullPrompt.length;
         this.state.totalTokens += tokenCount;

         // Prepare internal tool definitions (ToolDefinition[])
         const internalToolDefs: ToolDefinition[] = this.toolExecutor.getNames().map(name => this.toolExecutor.getDefinition(name)!);

         // LLM request timing
         const llmStartTime = Date.now();
         await this.emitter.emit({
           type: 'llm:request',
           timestamp: Date.now(),
           round: this.state.round,
           promptLength: fullPrompt.length,
           toolsAvailable: internalToolDefs.length,
         } as any);

         // Stream options
         const streamOptions: any = {
           signal: combinedSignal,
           sessionId: this.config.sessionId,
           reasoning: this.config.reasoningLevel,
           thinkingBudget: this.config.thinkingBudgets?.[this.config.reasoningLevel ?? 'off'],
         };

         let partialMessage: any = null;
         let finalMessage: any = null;
         let streamError: string | null = null;

         try {
           const rawStream = streamProvider(fullPrompt, internalToolDefs, streamOptions);
           for await (const event of (rawStream as any)) {
             // Yield raw event to caller
             yield event;

             switch (event.type) {
               case 'start':
                 partialMessage = event.partial;
                 await this.emitter.emit({
                   type: 'message:start',
                   timestamp: Date.now(),
                   round: this.state.round,
                   message: { ...partialMessage },
                 } as any);
                 break;

               case 'text_start':
               case 'thinking_start':
               case 'toolcall_start':
                 if (partialMessage) {
                   await this.emitter.emit({
                     type: 'message:update',
                     timestamp: Date.now(),
                     round: this.state.round,
                     message: { ...partialMessage },
                   } as any);
                 }
                 break;

               case 'text_delta':
               case 'thinking_delta':
               case 'toolcall_delta':
                 if (partialMessage) {
                   await this.emitter.emit({
                     type: 'message:update',
                     timestamp: Date.now(),
                     round: this.state.round,
                     message: { ...partialMessage },
                     delta: event.delta,
                   } as any);
                 }
                 break;

               case 'text_end':
               case 'thinking_end':
               case 'toolcall_end':
                 // no special handling
                 break;

               case 'done':
                 finalMessage = event.message;
                 await this.emitter.emit({
                   type: 'message:end',
                   timestamp: Date.now(),
                   round: this.state.round,
                   message: finalMessage,
                 } as any);
                 // Exit the for-await, continue with processing finalMessage
                 break;

               case 'error':
                 streamError = event.error?.errorMessage || 'Stream error';
                 this.state.isCancelled = true;
                 await this.emitter.emit({
                   type: 'error',
                   timestamp: Date.now(),
                   round: this.state.round,
                   message: streamError,
                 } as any);
                 break;
             }
           }

           // If we exit the for-await loop without 'done' or 'error'
           if (!finalMessage && !streamError) {
             streamError = 'Stream ended without completion';
           }
         } catch (err: any) {
           streamError = err.message || String(err);
           this.state.isCancelled = true;
           await this.emitter.emit({
             type: 'error',
             timestamp: Date.now(),
             round: this.state.round,
             message: streamError,
             stack: err.stack,
           } as any);
         }

         // LLM response timing
         const llmEndTime = Date.now();
         const llmRequestTime = llmEndTime - llmStartTime;
         totalLLMRequestTime += llmRequestTime;

         await this.emitter.emit({
           type: 'llm:response',
           timestamp: Date.now(),
           round: this.state.round,
           tokensUsed: tokenCount,
           toolCallsCount: finalMessage?.content.filter((c: any) => c.type === 'toolCall').length || 0,
         } as any);

         if (streamError) {
           const errorResult: AgentRunResult = {
             finalAnswer: '',
             totalRounds: this.state.round,
             totalToolCalls: this.state.totalToolCalls,
             totalTokens: this.state.totalTokens,
             toolResults: this.state.toolResults,
             success: false,
             stopReason: 'error',
             error: streamError,
             finalState: { ...this.state },
           };
           await this.emitter.emit({
             type: 'agent:end',
             timestamp: Date.now(),
             round: this.state.round,
             result: errorResult,
           } as any);
           return errorResult;
         }

         if (!finalMessage) {
           // Should not happen if error handled, but safeguard
           const err = 'No final message from LLM';
           const errorResult: AgentRunResult = {
             finalAnswer: '',
             totalRounds: this.state.round,
             totalToolCalls: this.state.totalToolCalls,
             totalTokens: this.state.totalTokens,
             toolResults: this.state.toolResults,
             success: false,
             stopReason: 'error',
             error: err,
             finalState: { ...this.state },
           };
           await this.emitter.emit({
             type: 'agent:end',
             timestamp: Date.now(),
             round: this.state.round,
             result: errorResult,
           } as any);
           return errorResult;
         }

         // Push assistant turn to history
         this.state.history.push(this.createAssistantTurn(finalMessage));

         // Check for tool calls
         const toolCalls = finalMessage.content.filter((c: any) => c.type === 'toolCall') as ToolCallData[];

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
             combinedSignal
           );
           const toolExecEndTime = Date.now();
           const toolExecutionTime = toolExecEndTime - toolExecStartTime;
           totalToolExecutionTime += toolExecutionTime;

           this.state.toolResults.push(...toolResults);

           if (this.config.autoSaveMemories && this.memoryStore) {
             await this.autoSaveMemory(currentPrompt, finalMessage, toolResults);
           }

           // Append tool turns to history
           for (const result of toolResults) {
             this.state.history.push(this.createToolTurn(result));
           }

           // Append tool results text to currentPrompt for next round
           const resultsText = this.strategy.formatResults(toolResults);
           currentPrompt += `\n\n[Tool Results]\n${resultsText}`;

           await this.emitter.emit({
             type: 'turn:end',
             timestamp: Date.now(),
             round: this.state.round,
             toolCallsExecuted: toolCalls.length,
             hasAssistantContent: true,
           } as any);

           // Build a response object for strategy (has toolCalls field)
           const responseForStrategy: LLMResponse = {
             content: '',
             toolCalls,
             stopReason: finalMessage.stopReason,
             usage: finalMessage.usage,
             errorMessage: finalMessage.errorMessage,
           };

           // Continue to next round if strategy permits
           if (!this.strategy.shouldContinue(responseForStrategy, this.state)) {
             break; // Exit while loop
           }
         } else {
           // No tool calls - finish successfully
           await this.emitter.emit({
             type: 'turn:end',
             timestamp: Date.now(),
             round: this.state.round,
             toolCallsExecuted: 0,
             hasAssistantContent: true,
           } as any);

           // Extract final answer as string from content blocks
           const contentBlocks = finalMessage.content || [];
           const finalAnswer = Array.isArray(contentBlocks)
             ? contentBlocks.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('')
             : String(contentBlocks);

           const finalResult: AgentRunResult = {
             finalAnswer,
             totalRounds: this.state.round,
             totalToolCalls: this.state.totalToolCalls,
             totalTokens: this.state.totalTokens,
             toolResults: this.state.toolResults,
             success: true,
             stopReason: finalMessage.stopReason || 'stop',
             error: finalMessage.errorMessage,
             finalState: { ...this.state },
           };

           if (this.config.debug) {
             const runEndTime = Date.now();
             const totalRunTime = runEndTime - runStartTime;
             await this.emitter.emit({
               type: 'debug:run:timing',
               timestamp: Date.now(),
               totalRunTime,
               totalContextBuildingTime,
               totalMemoryRetrievalTime,
               totalLLMRequestTime,
               totalToolExecutionTime,
             } as any);
           }

           await this.emitter.emit({
             type: 'agent:end',
             timestamp: Date.now(),
             round: this.state.round,
             result: finalResult,
           } as any);

           return finalResult;
         }
       } // while

       // Exited while: either max rounds or cancelled
       let finalResult: AgentRunResult;
       if (this.state.isCancelled) {
         finalResult = this.createAbortedResult();
       } else {
         finalResult = {
           finalAnswer: 'Max rounds reached without final answer',
           totalRounds: this.state.round,
           totalToolCalls: this.state.totalToolCalls,
           totalTokens: this.state.totalTokens,
           toolResults: this.state.toolResults,
           success: false,
           stopReason: 'max_rounds',
           error: 'Max rounds reached',
           finalState: { ...this.state },
         };
       }

       if (this.config.debug) {
         const runEndTime = Date.now();
         const totalRunTime = runEndTime - runStartTime;
         await this.emitter.emit({
           type: 'debug:run:timing',
           timestamp: Date.now(),
           totalRunTime,
           totalContextBuildingTime,
           totalMemoryRetrievalTime,
           totalLLMRequestTime,
           totalToolExecutionTime,
         } as any);
       }

       await this.emitter.emit({
         type: 'agent:end',
         timestamp: Date.now(),
         round: this.state.round,
         result: finalResult,
       } as any);

       return finalResult;
     } catch (error: any) {
       this.state.isCancelled = true;
       await this.emitter.emit({
         type: 'error',
         timestamp: Date.now(),
         round: this.state.round,
         message: error.message || String(error),
         stack: error.stack,
       } as any);
       const errorResult: AgentRunResult = {
         finalAnswer: '',
         totalRounds: this.state.round,
         totalToolCalls: this.state.totalToolCalls,
         totalTokens: this.state.totalTokens,
         toolResults: this.state.toolResults,
         success: false,
         stopReason: 'error',
         error: error.message || String(error),
         finalState: { ...this.state },
       };
       await this.emitter.emit({
         type: 'agent:end',
         timestamp: Date.now(),
         round: this.state.round,
         result: errorResult,
       } as any);
       return errorResult;
     } finally {
       this.state.isRunning = false;
       this.state.isCancelled = false;
     }
   }
}
