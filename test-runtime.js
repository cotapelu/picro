// Minimal test: create runtime and check if it works
import { createAgentSessionRuntime } from './dist/runtime/agent-session-runtime.js';
import { createAgentSessionServices } from './dist/session/agent-session-services.js';
import { SessionManager } from './dist/session/session-manager.js';

async function test() {
  const cwd = process.cwd();
  const agentDir = '/tmp/picro-test';
  
  // Create services
  const services = await createAgentSessionServices({ cwd, agentDir });
  
  // Create session manager (new session)
  const sessionManager = SessionManager.create(cwd, services.sessionDir);
  
  // Create runtime
  const runtime = await createAgentSessionRuntime(
    async (opts) => ({ session: null as any, services, diagnostics: [] }),
    {
      cwd,
      agentDir,
      sessionManager,
    }
  );
  
  console.log('Runtime created:', !!runtime);
  console.log('Session:', !!runtime.session);
  console.log('Agent:', !!runtime.session.agent);
  console.log('Session methods:');
  console.log('- prompt:', typeof runtime.session.prompt);
  console.log('- state:', !!runtime.session.state);
  console.log('- model:', runtime.session.model);
  console.log('- isStreaming:', runtime.session.isStreaming);
  
  // Try to check if agent.run exists
  console.log('- agent.run:', typeof runtime.session.agent.run);
  
  process.exit(0);
}

test().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
