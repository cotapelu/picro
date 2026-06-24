import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAgentSessionServices } from '../session/agent-session-services.js';
import { SessionManager } from '../session/session-manager.js';
import { createAgentSessionFromServices } from '../session/agent-session-services.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';

describe('Scan code integration', () => {
  let cwd: string;
  let agentDir: string;
  let sessionFile: string;

  beforeAll(() => {
    cwd = process.cwd();
    agentDir = join(homedir(), '.pi', 'agent', 'test');
    // Ensure test agent dir exists
    if (!existsSync(agentDir)) {
      mkdirSync(agentDir, { recursive: true });
    }
    // Use a unique session file
    sessionFile = join(agentDir, `scan-test-${Date.now()}.jsonl`);
  });

  afterAll(async () => {
    // Cleanup session file
    if (existsSync(sessionFile)) {
      unlinkSync(sessionFile);
    }
  });

  it.skip('should execute ls tool and get results', async () => {
    // Create services
    const services = await createAgentSessionServices({
      cwd,
      agentDir,
    });

    // Create session manager pointing to our test session file
    const sessionManager = SessionManager.open(sessionFile, services.sessionDir, cwd);
    sessionManager.newSession();

    // Create session
    const session = await createAgentSessionFromServices({
      services,
      sessionManager,
    });

    // Collect messages
    const turns: any[] = [];
    const unsubscribe = session.subscribe((event: any) => {
      if (event.type === 'message_end') {
        turns.push(event.turn);
      }
      if (event.type === 'error') {
        console.error('Session error event:', event);
      }
    });

    try {
      // Prompt to list files
      await session.prompt('list files');

      // Wait a bit for async processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check we have assistant messages
      const assistantTurns = turns.filter(t => t.role === 'assistant');
      expect(assistantTurns.length).toBeGreaterThan(0);

      // Get the last assistant turn
      const last = assistantTurns[assistantTurns.length - 1];
      const text = last.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('');

      // Should contain file listing (entries from ls)
      expect(text).toMatch(/Total: \d+ entries/);
    } finally {
      unsubscribe();
    }
  });
});
