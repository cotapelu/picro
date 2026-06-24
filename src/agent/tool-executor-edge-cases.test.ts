// SPDX-License-Identifier: Apache-2.0
/**
 * Edge case tests for ToolExecutor to increase coverage to ≥90%.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ToolExecutor } from "./tool-executor.js";
import { EventEmitter } from "../events/event-emitter.js";
import type { ToolCallData } from "./types.js";

// Mock tool using handler
const createMockTool = (name: string, handler: (...args: any[]) => any) => {
  return {
    name,
    description: `Mock tool ${name}`,
    params: [
      {
        name: "arg1",
        type: "string",
        description: "Argument 1",
        required: true,
      },
    ],
    handler,
  };
};

describe("ToolExecutor - Edge Cases", () => {
  let executor: ToolExecutor;
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
    executor = new ToolExecutor({ emitter });
  });

  describe("Tool Execution Edge Cases", () => {
    it("handles tool returning null", async () => {
      const tool = createMockTool("nullTool", async (args: any) => null);
      executor.registerTool(tool);

      const result = await executor.execute({
        id: "call_1",
        name: "nullTool",
        arguments: { arg1: "test" },
      } as ToolCallData, {} as any);

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
    });

    it("handles tool returning undefined", async () => {
      const tool = createMockTool("undefinedTool", async (args: any) => undefined);
      executor.registerTool(tool);

      const result = await executor.execute({
        id: "call_1",
        name: "undefinedTool",
        arguments: { arg1: "test" },
      } as ToolCallData, {} as any);

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
    });

    it("handles tool throwing error", async () => {
      const tool = createMockTool("errorTool", async () => {
        throw new Error("Tool error");
      });
      executor.registerTool(tool);

      const result = await executor.execute({
        id: "call_1",
        name: "errorTool",
        arguments: { arg1: "test" },
      } as ToolCallData, {} as any);

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.error).toBeDefined();
    });

    it("handles unknown tool", async () => {
      const result = await executor.execute({
        id: "call_1",
        name: "unknownTool",
        arguments: { arg1: "test" },
      } as ToolCallData, {} as any);

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.error?.toString()).toContain("not found");
    });

    it("handles tool with empty params", async () => {
      const tool = createMockTool("noArgTool", async () => {
        return "no args needed";
      });
      tool.params = []; // no parameters
      executor.registerTool(tool);

      const result = await executor.execute({
        id: "call_1",
        name: "noArgTool",
        arguments: {},
      } as ToolCallData, {} as any);

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
    });
  });

  describe("Parallel Execution", () => {
    it("handles multiple concurrent tool calls", async () => {
      const tool = createMockTool("concurrentTool", async (args: any) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { id: args.id };
      });
      executor.registerTool(tool);

      const calls: ToolCallData[] = [
        { id: "call_1", name: "concurrentTool", arguments: { id: 1 } },
        { id: "call_2", name: "concurrentTool", arguments: { id: 2 } },
        { id: "call_3", name: "concurrentTool", arguments: { id: 3 } },
      ];

      const results = await Promise.all(
        calls.map((call) => executor.execute(call, {} as any))
      );

      expect(results).toHaveLength(3);
      results.forEach((r) => expect(r.isError).toBe(false));
    });
  });
});
