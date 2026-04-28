/**
 * Simple Agent Example
 *
 * Demonstrates basic agent session usage.
 */

import { AgentSession } from '@picro/agent';

async function main() {
  console.log('Creating agent session...\n');

  const session = new AgentSession({
    cwd: process.cwd(),
    model: 'anthropic/claude-3.5-sonnet',
    thinkingLevel: 'medium',
  });

  console.log('Agent created. Model:', session.model?.id);
  console.log('Sending prompt...\n');

  try {
    const response = await session.prompt(`
      You are a helpful coding assistant.
      Explain what this code does in one sentence:

      const sum = (a, b) => a + b;
    `);

    console.log('Response:');
    console.log(response.content);
  } catch (error) {
    console.error('Error:', error);
  }

  session.stop();
}

main().catch(console.error);
