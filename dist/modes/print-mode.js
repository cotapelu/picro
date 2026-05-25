// SPDX-License-Identifier: Apache-2.0
/**
 * Print Mode - Single-shot, non-interactive.
 * Sends prompts and outputs the final text response.
 */
/**
 * Run print mode.
 * Returns exit code (0 = success, non-zero = error).
 */
export async function runPrintMode(runtime, options) {
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
        const lastTurn = history[history.length - 1];
        if (options.mode === "text") {
            if (lastTurn && lastTurn.role === "assistant") {
                for (const content of lastTurn.content) {
                    if (content.type === "text") {
                        console.log(content.text);
                    }
                }
            }
            else {
                exitCode = 1;
            }
        }
        else if (options.mode === "json") {
            if (lastTurn) {
                console.log(JSON.stringify(lastTurn));
            }
            else {
                exitCode = 1;
            }
        }
        return exitCode;
    }
    catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        return 1;
    }
}
//# sourceMappingURL=print-mode.js.map