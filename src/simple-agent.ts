/**
 * Simple Agent Session Example
 *
 * Demonstrates basic usage of AgentSessionRuntime for scripting.
 * No TUI - suitable for CLI scripts, tests, or integration.
 */

import { createAgentSessionRuntime } from '@picro/agent';

async function run(): Promise<void> {
  // Create runtime with default settings
  const runtime = await createAgentSessionRuntime(
    async () => ({
      session: null as any,
      services: null as any,
      diagnostics: [],
    }),
    {
      cwd: process.cwd(),
      agentDir: './.pi/agent',
      model: 'claude-3.5-sonnet',
      thinkingLevel: 'medium',
      tools: ['bash', 'read', 'write', 'edit', 'ls'],
    }
  );

  const session = runtime.session;
  console.log('Session:', session.sessionId);
  console.log('Model:', session.model?.name);
  console.log('---\n');

  // Prompt
  const question = process.argv[2] || 'list files in the current directory';
  console.log(`Prompt: "${question}"\n`);

  try {
    await session.prompt(question);
    console.log('\n--- Session completed ---');
    console.log('Turn count:', session.state.round);
    console.log('Total tool calls:', session.state.totalToolCalls);
    console.log('Session saved to:', session.sessionFile || 'memory');
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  await runtime.dispose();
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
