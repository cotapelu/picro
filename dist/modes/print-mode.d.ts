/**
 * Print Mode - Single-shot, non-interactive.
 * Sends prompts and outputs the final text response.
 */
import type { AgentSessionRuntime } from "../runtime/agent-session-runtime.js";
import type { ImageContent } from "../llm/index.js";
/**
 * Options for print mode.
 */
export interface PrintModeOptions {
    mode: "text" | "json";
    messages?: string[];
    initialMessage?: string;
    initialImages?: ImageContent[];
}
/**
 * Run print mode.
 * Returns exit code (0 = success, non-zero = error).
 */
export declare function runPrintMode(runtime: AgentSessionRuntime, options: PrintModeOptions): Promise<number>;
//# sourceMappingURL=print-mode.d.ts.map