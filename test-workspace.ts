/**
 * Workspace validation test
 * Ensures all packages can be imported and basic APIs work
 */

import { TerminalUI, ProcessTerminal } from '@picro/tui';
import { AgentSession } from '@picro/agent';
import { getModel, getProviders } from '@picro/llm';

console.log('Testing workspace imports...');

// Test TUI
console.log('✓ TUI imported: TerminalUI, ProcessTerminal');

// Test Agent
console.log('✓ Agent imported: AgentSession');

// Test LLM
const providers = getProviders();
console.log(`✓ LLM imported: ${providers.length} providers available`);

// Test basic instantiation
try {
  const terminal = new ProcessTerminal();
  const tui = new TerminalUI(terminal);
  console.log('✓ TerminalUI instantiated');
  tui.stop();
} catch (e) {
  console.error('✗ TerminalUI failed:', e);
  process.exit(1);
}

console.log('\n✅ Workspace validation passed!');
