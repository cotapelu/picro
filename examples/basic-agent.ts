/**
 * Basic Coding Agent Example
 *
 * Demonstrates how to create and use the coding agent.
 */

import { createCodingAgent } from '@picro/coding-agent';

async function main() {
  console.log('Creating coding agent...');
  
  const agent = await createCodingAgent({
    model: 'anthropic/claude-3.5-sonnet', // or any available model
    thinkingLevel: 'medium',
    autoStart: true,
  });

  console.log('Agent created!');
  console.log('Session:', agent.session);
  console.log('TUI:', agent.tui);

  // The TUI will be running and interactive
  // You can also send messages programmatically:
  // await agent.send('Hello, can you help me with a TypeScript project?');

  // To stop:
  // agent.stop();
}

main().catch(console.error);
