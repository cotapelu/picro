import { describe, it, expect } from "vitest";
import { AgentLoop } from "./agent-loop.js";
import { ToolExecutor } from "./tool-executor.js";
import { ContextBuilder } from "./context-manager.js";
import { EventEmitter } from "../events/event-emitter.js";
import { simpleStrategy } from "./loop-strategy.js";
import { MessageQueue } from "./message-queue.js";
import { createBashTool } from "../tools/bash-tool.js";
import type { AgentConfig, LLMResponse, ToolCallData } from "./types.js";

function generateLargeText(kilobytes: number): string {
  const line = "x".repeat(80) + "\n";
  const lines = Math.ceil((kilobytes * 1024) / line.length);
  return line.repeat(lines);
}

function createScanningLLM(
  totalRounds: number,
  toolsPerRound: number,
  outputSizeKB: number
) {
  let round = 0;
  return async (context: any, options?: any): Promise<LLMResponse> => {
    round++;
    const hasTools = round < totalRounds;
    const toolCalls: ToolCallData[] = [];
    if (hasTools) {
      for (let i = 0; i < toolsPerRound; i++) {
        const text = generateLargeText(outputSizeKB);
        const command = `printf "%s" "${text.replace(/"/g, '\\"')}"`;
        toolCalls.push({ toolCallId: `call-${round}-${i}`, toolName: "bash", arguments: { command } });
      }
    }
    return {
      content: hasTools ? "Continuing scan..." : "Scan complete",
      stopReason: hasTools ? "tool_call" : "stop",
      toolCalls: hasTools ? toolCalls : [],
      usage: { input: 10, output: 20, totalTokens: 30, cost: { input: 0, output: 0, total: 0 } },
    };
  };
}

function createConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    maxRounds: 1000,
    verbose: false,
    toolTimeout: 30000,
    cacheResults: false,
    toolExecutionStrategy: "parallel",
    contextBuilder: { maxTokens: 128000, reservedTokens: 4096, minMessages: 5, enableMemoryInjection: false },
    executor: { timeout: 30000, cacheEnabled: false, toolExecutionStrategy: "parallel" },
    enableLogging: false,
    steeringMode: "dequeue-one",
    followUpMode: "dequeue-one",
    debug: false,
    compaction: { enabled: false, autoCompact: false },
    ...overrides,
  };
}

function createTestLoop(config: AgentConfig, llmComplete: any, llmStream?: any) {
  const emitter = new EventEmitter();
  const toolExecutor = new ToolExecutor();
  const contextBuilder = new ContextBuilder();
  const bashTool = createBashTool(process.cwd());
  toolExecutor.register(bashTool);
  const tools = [bashTool];
  return new AgentLoop(
    config,
    emitter,
    toolExecutor,
    contextBuilder,
    simpleStrategy,
    llmComplete,
    llmStream || (async function*() {} as any),
    undefined,
    tools,
  );
}

describe('AgentLoop Large Scan Integration', () => {
  it('should handle 1000+ tool calls without exceeding history limits', async () => {
    const totalRounds = 4;
    const toolsPerRound = 350; // 3 rounds with tools => 1050 tool calls total
    const outputSizeKB = 5;
    const llm = createScanningLLM(totalRounds, toolsPerRound, outputSizeKB);
    const loop = createTestLoop(createConfig({ maxRounds: totalRounds + 2 }), llm);

    const result = await loop.run("scan", new MessageQueue(), new MessageQueue());
    if (!result.success) {
      throw new Error(`AgentLoop failed: ${result.error || 'no error'} stopReason=${result.stopReason}`);
    }

    const toolTurns = loop['state'].history.filter((t: any) => t.role === "tool");
    // Should be capped at 1000
    expect(toolTurns.length).toBeLessThanOrEqual(1000);
    expect(loop['metrics'].historyEvictions).toBeGreaterThan(0);
  });

  it('should enforce toolResults limit and evict oldest', async () => {
    const totalRounds = 2;
    const toolsPerRound = 1100; // one round with 1100 tool calls
    const llm = createScanningLLM(totalRounds, toolsPerRound, 5);
    const loop = createTestLoop(createConfig({ maxRounds: totalRounds + 2 }), llm);

    const result = await loop.run("scan", new MessageQueue(), new MessageQueue());
    if (!result.success) throw new Error(`AgentLoop failed: ${result.error || 'no error'} stopReason=${result.stopReason}`);

    expect(loop['state'].toolResults.length).toBeLessThanOrEqual(1000);
    expect(loop['metrics'].toolResultsEvictions).toBeGreaterThan(0);
  });
});
