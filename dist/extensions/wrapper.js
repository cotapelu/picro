"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Extension wrapper utilities - wrap core tools for extension use.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapRegisteredTool = wrapRegisteredTool;
exports.wrapRegisteredTools = wrapRegisteredTools;
/**
 * Wrap an AgentTool into an extension-compatible tool.
 * In this implementation, they are essentially the same shape.
 */
function wrapRegisteredTool(tool) {
    return {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        handler: tool.handler,
    };
}
/**
 * Wrap multiple AgentTools.
 */
function wrapRegisteredTools(tools) {
    return tools.map(wrapRegisteredTool);
}
//# sourceMappingURL=wrapper.js.map