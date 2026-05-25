/**
 * Extension wrapper utilities - wrap core tools for extension use.
 */
import type { ToolDefinition } from "../agent/types.js";
import type { AgentTool } from "../session/agent-types.js";
/**
 * Wrap an AgentTool into an extension-compatible tool.
 * In this implementation, they are essentially the same shape.
 */
export declare function wrapRegisteredTool(tool: AgentTool): ToolDefinition;
/**
 * Wrap multiple AgentTools.
 */
export declare function wrapRegisteredTools(tools: AgentTool[]): ToolDefinition[];
//# sourceMappingURL=wrapper.d.ts.map