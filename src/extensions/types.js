// SPDX-License-Identifier: Apache-2.0
/**
 * Extensions Types - Type definitions for the extension system
 *
 * Extensions allow adding custom tools, commands, and event handlers to pi.
 */
// ============================================================================
// Type Guards
// ============================================================================
/**
 * Check if tool result is from read tool
 */
export function isReadToolResult(result) {
    return typeof result === "string" && result.length > 0;
}
/**
 * Check if tool result is from bash tool
 */
export function isBashToolResult(result) {
    return typeof result === "string" && result.length > 0;
}
/**
 * Check if tool result is from write tool
 */
export function isWriteToolResult(result) {
    return typeof result === "string" && (result.includes("Written to") || result.includes("Created"));
}
/**
 * Check if tool result is from edit tool
 */
export function isEditToolResult(result) {
    return typeof result === "string" && result.includes("Edit");
}
/**
 * Check if tool result is from grep tool
 */
export function isGrepToolResult(result) {
    return typeof result === "string" && (result.includes("matches") || result.includes("Found"));
}
/**
 * Check if tool result is from find tool
 */
export function isFindToolResult(result) {
    return typeof result === "string" && (result.includes("files") || result.includes("Found"));
}
/**
 * Check if tool result is from ls tool
 */
export function isLsToolResult(result) {
    return typeof result === "string" && (result.includes("total") || result.startsWith("/"));
}
/**
 * Check if event is a tool call event type
 */
export function isToolCallEventType(event) {
    return [
        "tool_call",
        "tool_result",
        "tool_execution_start",
        "tool_execution_end",
    ].includes(event.type);
}
//# sourceMappingURL=types.js.map