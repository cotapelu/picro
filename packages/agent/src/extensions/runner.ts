// SPDX-License-Identifier: Apache-2.0
/**
 * Extensions Runner - Run extensions and emit events
 */

import type { Extension, ExtensionRuntime, ExtensionAPI, ExtensionCommand, LoadExtensionsResult } from "./types.js";
import type { BeforeAgentStartEventResult, InputEventResult } from "./types.js";

/**
 * Create extension runtime
 */
export function createExtensionRuntime(): ExtensionRuntime {
  return {
    flagValues: new Map(),
    pendingProviderRegistrations: [],
  };
}

/**
 * ExtensionRunner - manages extension execution
 */
export class ExtensionRunner {
  private extensions: Extension[] = [];
  private runtime: ExtensionRuntime;
  private handlers: Map<string, Set<Function>> = new Map();

  constructor(runtime?: ExtensionRuntime) {
    this.runtime = runtime ?? createExtensionRuntime();
  }

  /**
   * Load extensions
   */
  loadExtensions(result: LoadExtensionsResult): void {
    this.extensions = result.extensions;
    this.runtime = result.runtime;
  }

  /**
   * Check if there are handlers for an event type
   */
  hasHandlers(eventType: string): boolean {
    const handlers = this.handlers.get(eventType);
    return handlers !== undefined && handlers.size > 0;
  }

  /**
   * Register a handler for an event
   */
  on(eventType: string, handler: Function): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Emit an event to all handlers
   */
  async emit(event: any): Promise<any> {
    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.size === 0) {
      return undefined;
    }

    let result: any;
    for (const handler of handlers) {
      try {
        result = await handler(event);
      } catch (error) {
        console.error(`Error in handler for ${event.type}:`, error);
      }
    }

    return result;
  }

  /**
   * Emit before_agent_start event
   */
  async emitBeforeAgentStart(
    prompt: string,
    images: any[],
    systemPrompt: string,
    options: any
  ): Promise<BeforeAgentStartEventResult | undefined> {
    return this.emit({
      type: "before_agent_start",
      prompt,
      images,
      systemPrompt,
      ...options,
    });
  }

  /**
   * Emit input event
   */
  async emitInput(
    text: string,
    images: any[],
    source: string
  ): Promise<InputEventResult> {
    const result = await this.emit({
      type: "input",
      text,
      images,
      source,
    });

    return result ?? { action: "pass" };
  }

  /**
   * Get a command by name
   */
  getCommand(name: string): ExtensionCommand | undefined {
    for (const ext of this.extensions) {
      const command = ext.commands.get(name);
      if (command) {
        return command;
      }
    }
    return undefined;
  }

  /**
   * Get all commands
   */
  getCommands(): ExtensionCommand[] {
    const commands: ExtensionCommand[] = [];
    for (const ext of this.extensions) {
      for (const cmd of ext.commands.values()) {
        commands.push(cmd);
      }
    }
    return commands;
  }

  /**
   * Get all tools from extensions
   */
  getTools(): any[] {
    const tools: any[] = [];
    for (const ext of this.extensions) {
      for (const tool of ext.tools.values()) {
        tools.push(tool);
      }
    }
    return tools;
  }

  /**
   * Get flag value
   */
  getFlag(name: string): string | boolean | undefined {
    return this.runtime.flagValues.get(name);
  }

  /**
   * Set flag value
   */
  setFlag(name: string, value: string | boolean): void {
    this.runtime.flagValues.set(name, value);
  }

  /**
   * Invalidate the runner
   */
  invalidate(message: string): void {
    // Clear all handlers
    this.handlers.clear();
    this.extensions = [];
  }

  /**
   * Create command context
   */
  createCommandContext(): any {
    // Will be populated with actual implementation
    return {};
  }

  // =========================================================================
  // UI Provider Methods (stubs for extension UI integration)
  // =========================================================================

  /**
   * Provide autocomplete suggestions
   */
  async provideAutocomplete(context: any): Promise<any[]> {
    return [];
  }

  /**
   * Render a message (for extended message rendering)
   */
  async renderMessage(message: any, options?: any): Promise<any | null> {
    return null;
  }

  /**
   * Render tool execution result
   */
  async renderToolExecution(toolName: string, input: any, output: any, options?: any): Promise<any> {
    return {};
  }

  /**
   * Create a widget
   */
  async createWidget(options: any): Promise<void> {
    // no-op
  }

  /**
   * Select string (e.g., file picker)
   */
  async selectString(options: any): Promise<string | undefined> {
    return undefined;
  }
}

/**
 * Emit session shutdown event
 */
export async function emitSessionShutdownEvent(
  runner: ExtensionRunner,
  event: any
): Promise<void> {
  await runner.emit(event);
}