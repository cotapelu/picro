// SPDX-License-Identifier: Apache-2.0
/**
 * AgentLoop: core loop execution.
 * Different from pi-agent-legacy: class-based, simpler flow.
 */
/**
 * Manages the agent execution loop.
 * Separated from Agent class for cleaner architecture.
 */
export class AgentLoop {
    state;
    config;
    emitter;
    toolExecutor;
    contextBuilder;
    strategy;
    abortController = null;
    memoryStore;
    constructor(config, emitter, toolExecutor, contextBuilder, strategy, memoryStore) {
        this.config = config;
        this.emitter = emitter;
        this.toolExecutor = toolExecutor;
        this.contextBuilder = contextBuilder;
        this.strategy = strategy;
        this.memoryStore = memoryStore;
        this.state = this.createInitialState();
    }
    /** Abort current execution */
    abort() {
        this.state.isCancelled = true;
        this.abortController?.abort();
    }
    /** Get current state snapshot */
    getState() {
        return { ...this.state };
    }
    /** Reset state for new run */
    reset() {
        this.state = this.createInitialState();
    }
    createInitialState() {
        const state = {
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
        state.messages = state.history;
        return state;
    }
    /**
     * Run agent to completion (non-streaming).
     */
    async run(initialPrompt, steeringQueue, followUpQueue, llmProvider, signal, initialTurns = []) {
        const iterator = this.executeLoop(initialPrompt, steeringQueue, followUpQueue, llmProvider, false, signal, initialTurns)[Symbol.asyncIterator]();
        while (true) {
            const { value, done } = await iterator.next();
            if (done) {
                return value;
            }
            // No yields expected in non-streaming mode; ignore.
        }
    }
    /**
     * Stream agent execution with delta events.
     * Yields LLMStreamEvent during streaming and returns final AgentRunResult.
     */
    async *stream(initialPrompt, steeringQueue, followUpQueue, streamProvider, signal, initialTurns = []) {
        const iterator = this.executeLoop(initialPrompt, steeringQueue, followUpQueue, streamProvider, true, signal, initialTurns)[Symbol.asyncIterator]();
        while (true) {
            const { value, done } = await iterator.next();
            if (done) {
                return value;
            }
            else {
                yield value;
            }
        }
    }
    /**
     * Core execution loop used by both run and stream.
     * @param isStreaming - true for streaming, false for non-streaming
     */
    async *executeLoop(initialPrompt, steeringQueue, followUpQueue, llmOrStreamProvider, isStreaming, signal, initialTurns = []) {
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
            });
            let currentPrompt = initialPrompt;
            const maxRounds = this.config.maxRounds;
            while (this.state.round < maxRounds && !this.state.isCancelled) {
                const roundStartTime = Date.now();
                this.state.round++;
                if (isStreaming) {
                    await this.emitter.emit({
                        type: 'turn:start',
                        timestamp: Date.now(),
                        round: this.state.round,
                        promptLength: currentPrompt.length,
                    });
                }
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
                let memories = [];
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
                        });
                    }
                    catch (e) {
                        console.warn('Memory retrieval failed:', e);
                    }
                }
                // Context building
                const { prompt: fullPrompt, tokenCount } = this.contextBuilder.build(currentPrompt, contextTurns, memories);
                this.state.promptLength = fullPrompt.length;
                this.state.totalTokens += tokenCount;
                const toolDefs = this.toolExecutor.getNames().map((name) => {
                    const def = this.toolExecutor.getDefinition(name);
                    return {
                        type: 'function',
                        function: {
                            name: def.name,
                            description: def.description,
                            parameters: def.parameters || { type: 'object', properties: {}, required: [] },
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
                });
                let llmRequestTime = 0;
                let response = null;
                let finalMessage = null;
                if (isStreaming) {
                    const streamOptions = {
                        signal: combinedSignal,
                        sessionId: this.config.sessionId,
                        reasoning: this.config.reasoningLevel,
                        thinkingBudget: this.config.thinkingBudgets?.[this.config.reasoningLevel ?? 'off'],
                    };
                    let partialMessage = null;
                    let streamError = null;
                    try {
                        const rawStream = llmOrStreamProvider(fullPrompt, toolDefs, streamOptions);
                        for await (const event of rawStream) {
                            yield event;
                            switch (event.type) {
                                case 'start':
                                    partialMessage = event.partial;
                                    await this.emitter.emit({
                                        type: 'message:start',
                                        timestamp: Date.now(),
                                        round: this.state.round,
                                        message: { ...partialMessage },
                                    });
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
                                        });
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
                                        });
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
                                    });
                                    break;
                                case 'error':
                                    streamError = event.error?.errorMessage || 'Stream error';
                                    this.state.isCancelled = true;
                                    await this.emitter.emit({
                                        type: 'error',
                                        timestamp: Date.now(),
                                        round: this.state.round,
                                        message: streamError,
                                    });
                                    break;
                            }
                        }
                        if (!finalMessage && !streamError) {
                            streamError = 'Stream ended without completion';
                        }
                    }
                    catch (err) {
                        streamError = err.message || String(err);
                        this.state.isCancelled = true;
                        await this.emitter.emit({
                            type: 'error',
                            timestamp: Date.now(),
                            round: this.state.round,
                            message: streamError,
                            stack: err.stack,
                        });
                    }
                    const llmEndTime = Date.now();
                    llmRequestTime = llmEndTime - llmStartTime;
                    totalLLMRequestTime += llmRequestTime;
                    await this.emitter.emit({
                        type: 'llm:response',
                        timestamp: Date.now(),
                        round: this.state.round,
                        tokensUsed: tokenCount,
                        toolCallsCount: finalMessage?.content.filter((c) => c.type === 'toolCall').length || 0,
                    });
                    if (streamError) {
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
                            });
                        }
                        const errorResult = {
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
                        });
                        return errorResult;
                    }
                    if (!finalMessage) {
                        const err = 'No final message from LLM';
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
                            });
                        }
                        const errorResult = {
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
                        });
                        return errorResult;
                    }
                    this.state.history.push(this.createAssistantTurn(finalMessage));
                }
                else {
                    response = await llmOrStreamProvider(fullPrompt, toolDefs, {
                        signal: combinedSignal,
                        sessionId: this.config.sessionId,
                        reasoning: this.config.reasoningLevel,
                        thinkingBudget: this.config.thinkingBudgets?.[this.config.reasoningLevel ?? 'off'],
                    });
                    const llmEndTime = Date.now();
                    llmRequestTime = llmEndTime - llmStartTime;
                    totalLLMRequestTime += llmRequestTime;
                    await this.emitter.emit({
                        type: 'llm:response',
                        timestamp: Date.now(),
                        round: this.state.round,
                        tokensUsed: tokenCount,
                        toolCallsCount: response.toolCalls?.length ?? 0,
                    });
                    this.state.history.push(this.createAssistantTurn(response));
                }
                // Determine tool calls and response for strategy
                let toolCalls = [];
                let shouldContinueResponse = null;
                if (isStreaming) {
                    // finalMessage is guaranteed to be set at this point (errors handled above)
                    toolCalls = (finalMessage.content || []).filter((c) => c.type === 'toolCall');
                    shouldContinueResponse = {
                        content: '',
                        toolCalls,
                        stopReason: finalMessage.stopReason,
                        usage: finalMessage.usage,
                        errorMessage: finalMessage.errorMessage,
                    };
                }
                else {
                    toolCalls = response.toolCalls || [];
                    shouldContinueResponse = response;
                }
                if (toolCalls.length > 0) {
                    this.state.totalToolCalls += toolCalls.length;
                    const toolContext = {
                        round: this.state.round,
                        runtimeState: this.state,
                        signal: combinedSignal,
                    };
                    // Tool execution timing
                    const toolExecStartTime = Date.now();
                    const toolResults = await this.toolExecutor.executeAll(toolCalls, toolContext, combinedSignal);
                    const toolExecEndTime = Date.now();
                    const toolExecutionTime = toolExecEndTime - toolExecStartTime;
                    totalToolExecutionTime += toolExecutionTime;
                    this.state.toolResults.push(...toolResults);
                    if (this.config.autoSaveMemories && this.memoryStore) {
                        if (isStreaming) {
                            await this.autoSaveMemory(currentPrompt, finalMessage, toolResults);
                        }
                        else {
                            await this.autoSaveMemory(currentPrompt, response, toolResults);
                        }
                    }
                    const resultsText = this.strategy.formatResults(toolResults);
                    currentPrompt += `\n\n[Tool Results]\n${resultsText}`;
                    for (const result of toolResults) {
                        this.state.history.push(this.createToolTurn(result));
                    }
                    // Emit round timing if debug mode is enabled (match original: only non-streaming)
                    if (this.config.debug && !isStreaming) {
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
                        });
                    }
                    await this.emitter.emit({
                        type: 'turn:end',
                        timestamp: Date.now(),
                        round: this.state.round,
                        toolCallsExecuted: toolCalls.length,
                        hasAssistantContent: true,
                    });
                    if (!this.strategy.shouldContinue(shouldContinueResponse, this.state)) {
                        break;
                    }
                }
                else {
                    await this.emitter.emit({
                        type: 'turn:end',
                        timestamp: Date.now(),
                        round: this.state.round,
                        toolCallsExecuted: 0,
                        hasAssistantContent: true,
                    });
                    let finalAnswer;
                    if (isStreaming) {
                        const contentBlocks = finalMessage.content || [];
                        finalAnswer = Array.isArray(contentBlocks)
                            ? contentBlocks.filter((c) => c.type === 'text').map((c) => c.text).join('')
                            : String(contentBlocks);
                    }
                    else {
                        finalAnswer = response.content || '';
                    }
                    const finalResult = {
                        finalAnswer,
                        totalRounds: this.state.round,
                        totalToolCalls: this.state.totalToolCalls,
                        totalTokens: this.state.totalTokens,
                        toolResults: this.state.toolResults,
                        success: true,
                        stopReason: isStreaming ? finalMessage.stopReason : response.stopReason || 'stop',
                        error: isStreaming ? finalMessage.errorMessage : response.errorMessage,
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
                        });
                    }
                    await this.emitter.emit({
                        type: 'agent:end',
                        timestamp: Date.now(),
                        round: this.state.round,
                        result: finalResult,
                    });
                    return finalResult;
                }
            } // while
            // Exited while: either max rounds or cancelled
            let finalResult;
            if (this.state.isCancelled) {
                finalResult = this.createAbortedResult();
            }
            else {
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
                });
            }
            await this.emitter.emit({
                type: 'agent:end',
                timestamp: Date.now(),
                round: this.state.round,
                result: finalResult,
            });
            return finalResult;
        }
        catch (error) {
            this.state.isCancelled = false;
            await this.emitter.emit({
                type: 'error',
                timestamp: Date.now(),
                round: this.state.round,
                message: error.message || String(error),
                stack: error.stack,
            });
            const errorResult = {
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
                });
            }
            await this.emitter.emit({
                type: 'agent:end',
                timestamp: Date.now(),
                round: this.state.round,
                result: errorResult,
            });
            return errorResult;
        }
        finally {
            this.state.isRunning = false;
            if (isStreaming) {
                this.state.isCancelled = false;
            }
        }
    }
    drainQueue(queue) {
        return queue.drainAll();
    }
    async autoSaveMemory(prompt, response, results) {
        if (!this.memoryStore)
            return;
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
        }
        catch (e) {
            console.warn('Auto-save memory failed:', e);
        }
    }
    createAssistantTurn(response) {
        return {
            role: 'assistant',
            content: response.content ? [{ type: 'text', text: response.content }] : [],
            timestamp: Date.now(),
            stopReason: response.stopReason,
            errorMessage: response.errorMessage,
            usage: response.usage,
        };
    }
    createToolTurn(result) {
        const isError = 'error' in result;
        return {
            role: 'tool',
            toolCallId: result.toolCallId,
            toolName: result.toolName,
            content: isError
                ? [{ type: 'text', text: result.error }]
                : [{ type: 'text', text: result.result }],
            isError,
            details: result.metadata?.details,
            timestamp: Date.now(),
        };
    }
    createAbortedResult() {
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
    combineSignals(...signals) {
        const controller = new AbortController();
        let abortCount = 0;
        const needed = signals.filter(Boolean).length;
        const checkAbort = () => {
            abortCount++;
            if (abortCount >= needed)
                controller.abort();
        };
        for (const signal of signals) {
            if (signal) {
                if (signal.aborted) {
                    controller.abort();
                }
                else {
                    signal.addEventListener('abort', checkAbort, { once: true });
                }
            }
        }
        return controller.signal;
    }
    getResultText(result) {
        if ('error' in result)
            return result.error;
        return result.result;
    }
}
