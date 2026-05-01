// AgentSession Example
//
// Demonstrates using AgentSession for persistent conversations,
// model switching, and compaction.

import { AgentSession, SessionManager } from '@picro/agent';
import { DefaultModelRegistry } from '@picro/agent';
import { DefaultResourceLoader } from '@picro/agent';
import { SettingsManager } from '@picro/agent';

async function main() {
  const cwd = process.cwd();
  const sessionManager = SessionManager.create(cwd);
  const settingsManager = SettingsManager.create(cwd);
  const modelRegistry = new DefaultModelRegistry();
  const resourceLoader = new DefaultResourceLoader({ cwd, agentDir: process.env.PI_AGENT_DIR ?? '' });

  const session = new AgentSession({
    agent: undefined as any, // Placeholder: normally construct Agent first
    sessionManager,
    settingsManager,
    cwd,
    resourceLoader,
    modelRegistry,
  });

  console.log('Session created. ID:', sessionManager.getCurrentSessionId());

  // Subscribe to events
  session.subscribe((event) => {
    console.log('Event:', event.type);
  });

  // Enable performance tracking
  // (if enabled in constructor, stats can be retrieved later)
  // const stats = session.getPerformanceStats();
}

main().catch(console.error);
