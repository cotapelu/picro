// Basic Agent Usage Example
//
// This example demonstrates how to create a simple agent with a custom tool
// and run it with a prompt.

import { Agent, ToolDefinition } from '@picro/agent';

// Define a simple tool
const helloTool: ToolDefinition = {
  name: 'hello',
  description: 'Say hello to someone',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Name to greet' },
    },
    required: ['name'],
  },
  handler: async (input: { name: string }) => {
    return `Hello, ${input.name}!`;
  },
};

async function main() {
  // Create an agent with the tool
  const agent = new Agent(undefined, [helloTool], {
    verbose: true,
    maxRounds: 5,
  });

  // Run the agent with a prompt
  await agent.run('Please greet Alice using the hello tool.');
}

main().catch(console.error);
