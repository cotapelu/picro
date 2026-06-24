import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createAgentSessionServices } from '../session/agent-session-services.js';
import { SessionManager } from '../session/session-manager.js';
import { createAgentSessionFromServices } from '../session/agent-session-services.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import type { Model } from '../llm/index.js';
import { complete, stream } from '../llm/index.js';

// Mock LLM to avoid real API calls
let llmCallCount = 0;
vi.spyOn({ complete, stream }, 'complete').mockImplementation(async () => {
  llmCallCount++;
  if (llmCallCount === 1) {
    return {
      content: '',
      stopReason: 'toolUse' as const,
      usage: { input: 10, output: 5, totalTokens: 15 },
      toolCalls: [{ id: 'call_1', name: 'ls', arguments: {} }],
    };
  } else {
    return {
      content: 'Here is the directory listing:\nTotal: 20 entries',
      stopReason: 'stop' as const,
      usage: { input: 10, output: 5, totalTokens: 15 },
      toolCalls: [],
    };
  }
});

vi.spyOn({ complete, stream }, 'stream').mockImplementation(async function*() {
  llmCallCount++;
  if (llmCallCount === 1) {
    yield { type: 'start', partial: { role: 'assistant', content: [{ type: 'toolCall', id: 'call_1', name: 'ls', arguments: {} }], stopReason: undefined, usage: undefined } as any };
    yield { type: 'toolcall_end', toolCall: { id: 'call_1', name: 'ls', arguments: {} } } as any;
    yield { type: 'done', reason: 'toolUse' as const, usage: { input: 10, output: 5, totalTokens: 15 } } as any;
  } else {
    yield { type: 'start', partial: { role: 'assistant', content: [{ type: 'text', text: '' }], stopReason: undefined, usage: undefined } as any };
    yield { type: 'text_delta', delta: 'Here is the directory listing:\nTotal: 20 entries' } as any;
    yield { type: 'done', reason: 'stop' as const, usage: { input: 10, output: 5, totalTokens: 15 } } as any;
  }
});

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

  it('should execute ls tool and get results', async () => {
    // Create services
    const services = await createAgentSessionServices({
      cwd,
      agentDir,
    });

    // Bypass auth check for integration test
    vi.spyOn(services.modelRegistry, 'hasConfiguredAuth').mockReturnValue(true);

    // Fake model for testing
    const fakeModel: Model = {
      id: 'test-model',
      name: 'Test Model',
      provider: 'openai',
      baseUrl: '',
      reasoning: false,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 4096,
    };

    // Create session manager pointing to our test session file
    const sessionManager = SessionManager.open(sessionFile, services.sessionDir, cwd);
    sessionManager.newSession();

    // Create session with fake model
    const session = await createAgentSessionFromServices({
      services,
      sessionManager,
      model: fakeModel,
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

      // Wait longer for async processing (multiple rounds: ls + final answer)
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Debug: log all turns to see structure
      console.log('Collected turns:', JSON.stringify(turns, null, 2));

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
