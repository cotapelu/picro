// Print mode - Non-interactive text/JSON output
import type { AgentSessionRuntime } from '../runtime/agent-session-runtime.js';

/**
 * Run the agent in print mode (non-interactive).
 * Sends initialMessage and any additional messages, then prints the last assistant response.
 *
 * @param runtime - The agent session runtime
 * @param options - Mode options
 * @returns Exit code (0 = success)
 */
export async function runPrintMode(
  runtime: AgentSessionRuntime,
  options: {
    mode: 'text' | 'json';
    messages?: string[];
    initialMessage?: string;
    initialImages?: any[];
  }
): Promise<number> {
  try {
    // Send initial message if provided
    if (options.initialMessage) {
      await runtime.session.prompt(options.initialMessage, { images: options.initialImages });
    }

    // Send additional messages sequentially
    if (options.messages && options.messages.length > 0) {
      for (const msg of options.messages) {
        await runtime.session.prompt(msg);
      }
    }

    // Retrieve the last assistant message from session history
    const sessionMessages = runtime.session.messages as any[];
    let lastAssistantText = '';

    // Find last assistant turn (scan backwards)
    for (let i = sessionMessages.length - 1; i >= 0; i--) {
      const msg = sessionMessages[i];
      if (msg.role === 'assistant') {
        const content = msg.content as any[] || [];
        // Concatenate all text blocks
        lastAssistantText = content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n')
          .trim();
        break;
      }
    }

    // Output based on mode
    if (options.mode === 'json') {
      console.log(JSON.stringify({ response: lastAssistantText }, null, 2));
    } else {
      console.log(lastAssistantText);
    }

    return 0;
  } catch (error: any) {
    console.error('Error in print mode:', error.message || error);
    return 1;
  }
}
