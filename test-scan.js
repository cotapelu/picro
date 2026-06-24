const { createAgentSessionRuntime } = require('./dist/runtime/agent-session-runtime.js');
const { SessionManager } = require('./dist/session/session-manager.js');
const path = require('path');

async function main() {
  const cwd = process.cwd();
  const agentDir = path.join(require('os').homedir(), '.pi', 'agent');
  
  const runtime = await createAgentSessionRuntime(
    async (opts) => {
      const { createAgentSessionServices } = require('./dist/session/agent-session-services.js');
      const services = await createAgentSessionServices({ cwd, agentDir });
      return {
        session: null,
        services,
        diagnostics: [],
      };
    },
    {
      cwd,
      agentDir,
    }
  );

  // Listen to events
  runtime.session.subscribe((event: any) => {
    console.log('EVENT:', event.type, event);
  });

  try {
    await runtime.session.prompt('list files');
    console.log('Done');
  } catch (err) {
    console.error('PROMPT ERROR:', err);
  }
}

main().catch(console.error);
