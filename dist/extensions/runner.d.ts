/**
 * Extensions Runner - Run extensions and emit events
 */
import type { ExtensionRuntime, ExtensionCommand, LoadExtensionsResult } from "./types.js";
import type { BeforeAgentStartEventResult, InputEventResult } from "./types.js";
/**
 * Create extension runtime
 */
export declare function createExtensionRuntime(): ExtensionRuntime;
/**
 * ExtensionRunner - manages extension execution
 */
export declare class ExtensionRunner {
    private extensions;
    private runtime;
    private handlers;
    private _uiContext?;
    private _commandContextActions?;
    private _errorListener?;
    constructor(runtime?: ExtensionRuntime);
    /**
     * Load extensions
     */
    loadExtensions(result: LoadExtensionsResult): void;
    /**
     * Check if there are handlers for an event type
     */
    hasHandlers(eventType: string): boolean;
    /**
     * Register a handler for an event
     */
    on(eventType: string, handler: Function): () => void;
    /**
     * Emit an event to all handlers
     */
    emit(event: any): Promise<any>;
    /**
     * Emit before_agent_start event
     */
    emitBeforeAgentStart(prompt: string, images: any[], systemPrompt: string, options: any): Promise<BeforeAgentStartEventResult | undefined>;
    /**
     * Emit input event
     */
    emitInput(text: string, images: any[], source: string): Promise<InputEventResult>;
    /**
     * Get a command by name
     */
    getCommand(name: string): ExtensionCommand | undefined;
    /**
     * Get all commands
     */
    getCommands(): ExtensionCommand[];
    /**
     * Get all tools from extensions
     */
    getTools(): any[];
    /**
     * Get flag value
     */
    getFlag(name: string): string | boolean | undefined;
    /**
     * Set flag value
     */
    setFlag(name: string, value: string | boolean): void;
    /**
     * Invalidate the runner
     */
    invalidate(message: string): void;
    setUIContext(uiContext: any): void;
    bindCommandContext(actions: any): void;
    bindCore(actions: any): void;
    onError(handler: (error: any) => void): () => void;
    createContext(): any;
    /**
     * Create command context
     */
    createCommandContext(): any;
    /**
     * Provide autocomplete suggestions
     */
    provideAutocomplete(context: any): Promise<any[]>;
    /**
     * Render a message (for extended message rendering)
     */
    renderMessage(message: any, options?: any): Promise<any | null>;
    /**
     * Render tool execution result
     */
    renderToolExecution(toolName: string, input: any, output: any, options?: any): Promise<any>;
    /**
     * Create a widget
     */
    createWidget(options: any): Promise<void>;
    /**
     * Select string (e.g., file picker)
     */
    selectString(options: any): Promise<string | undefined>;
}
/**
 * Emit session shutdown event
 */
export declare function emitSessionShutdownEvent(runner: ExtensionRunner, event: any): Promise<void>;
//# sourceMappingURL=runner.d.ts.map