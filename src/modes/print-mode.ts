// SPDX-License-Identifier: Apache-2.0
/**
 * Print Mode - Single-shot, non-interactive.
 * Sends prompts and outputs the final text response.
 */

import type { AgentSessionRuntime } from "../runtime/agent-session-runtime";
import type { ImageContent } from "../llm";
import type { AssistantTurn } from "../agent/types";

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
export async function runPrintMode(runtime: AgentSessionRuntime, options: PrintModeOptions): Promise<number> {
  const session = runtime.session;
  let exitCode = 0;

  try {
    // Initial message with optional images
    if (options.initialMessage) {
      await session.prompt(options.initialMessage, { images: options.initialImages });
    }

    // Additional messages
    if (options.messages) {
      for (const msg of options.messages) {
        await session.prompt(msg);
      }
    }

    // Get last assistant turn from history
    const state = session.state;
    const history = state.history;
    const lastTurn = history[history.length - 1] as AssistantTurn | undefined;

    if (options.mode === "text") {
      if (lastTurn && lastTurn.role === "assistant") {
        for (const content of lastTurn.content) {
          if (content.type === "text") {
            console.log(content.text);
          }
        }
      } else {
        exitCode = 1;
      }
    } else if (options.mode === "json") {
      if (lastTurn) {
        console.log(JSON.stringify(lastTurn));
      } else {
        exitCode = 1;
      }
    }

    return exitCode;
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
