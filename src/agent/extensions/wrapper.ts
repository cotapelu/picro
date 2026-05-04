// SPDX-License-Identifier: Apache-2.0
/**
 * Extension wrapper utilities - wrap core tools for extension use.
 */

import type { ToolDefinition } from "../types";
import type { ExtensionRunner } from "./runner";
import type { AgentTool } from "../agent-types";

/**
 * Wrap an AgentTool into an extension-compatible tool.
 * In this implementation, they are essentially the same shape.
 */
export function wrapRegisteredTool(tool: AgentTool): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    handler: tool.handler as any,
  };
}

/**
 * Wrap multiple AgentTools.
 */
export function wrapRegisteredTools(tools: AgentTool[]): ToolDefinition[] {
  return tools.map(wrapRegisteredTool);
}
