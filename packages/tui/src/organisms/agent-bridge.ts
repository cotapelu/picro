/**
 * Agent Bridge for Tool Execution Messages
 *
 * Connects an agent's tool execution events to a TUI ToolExecutionMessage panel.
 * The agent should provide an EventEmitter-like object with `on` and `off` methods.
 */

import { TerminalUI } from '../interactive/tui.js';
import { ToolExecutionMessage } from '../molecules/tool-execution.js';
import type { ToolCallInfo } from '../molecules/tool-execution.js';

interface AgentToolBridgeOptions {
  /** Height in rows */
  panelHeight?: number;
  /** Anchor position, default 'bottom-center' */
  anchor?: 'bottom-center' | 'top-center';
}

/** Map tool call IDs to their info for updates */
const toolCalls = new Map<string, ToolCallInfo>();

/** Create a bridge between an agent EventEmitter and TUI */
export function createAgentToolBridge(
  tui: TerminalUI,
  emitter: { on: (event: string, handler: (...args: any[]) => void) => void; off: (event: string, handler: (...args: any[]) => void) => void },
  options: AgentToolBridgeOptions = {}
): {
  /** Destroy the bridge (remove listeners) */
  destroy: () => void;
} {
  const panel = new ToolExecutionMessage();
  const panelOpts: { panelHeight?: number; anchor?: 'bottom-center' | 'top-center' } = {};
  if (options.panelHeight) panelOpts.panelHeight = options.panelHeight;
  if (options.anchor) panelOpts.anchor = options.anchor;
  tui.showPanel(panel, panelOpts);

  const onStart = (event: any) => {
    const info: ToolCallInfo = { name: event.toolName, status: 'running' };
    toolCalls.set(event.toolCallId, info);
    panel.addToolCall(info);
    tui.requestRender();
  };

  const onEnd = (event: any) => {
    const result = event.result;
    const existing = toolCalls.get(event.toolCallId);
    if (existing) {
      existing.status = result.isError ? 'error' : 'success';
      existing.output = result.result;
    } else {
      const info: ToolCallInfo = { name: event.toolName, status: result.isError ? 'error' : 'success', output: result.result };
      toolCalls.set(event.toolCallId, info);
      panel.addToolCall(info);
    }
    tui.requestRender();
  };

  const onError = (event: any) => {
    const existing = toolCalls.get(event.toolCallId);
    if (existing) {
      existing.status = 'error';
      existing.output = event.errorMessage;
    }
    tui.requestRender();
  };

  emitter.on('tool:call:start', onStart);
  emitter.on('tool:call:end', onEnd);
  emitter.on('tool:call:error', onError);

  return {
    destroy() {
      emitter.off('tool:call:start', onStart);
      emitter.off('tool:call:end', onEnd);
      emitter.off('tool:call:error', onError);
    },
  };
}
