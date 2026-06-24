import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock LLM module before any imports that use it
vi.mock('../llm/index.js', () => {
  let llmCallCount = 0;
  const complete = vi.fn().mockImplementation(async () => {
    llmCallCount++;
    if (llmCallCount === 1) {
      // First response: tool call (content array with toolCall block)
      return {
        content: [{ type: 'toolCall', id: 'call_1', name: 'ls', arguments: {} }],
        stopReason: 'toolUse',
        usage: { input: 10, output: 5, totalTokens: 15 },
      };
    } else {
      // Second response: final answer (text block)
      return {
        content: [{ type: 'text', text: 'Here is the directory listing:\nTotal: 20 entries' }],
        stopReason: 'stop',
        usage: { input: 10, output: 5, totalTokens: 15 },
      };
    }
  });
  const stream = vi.fn().mockImplementation(function* () {
    llmCallCount++;
    if (llmCallCount === 1) {
      // Stream first turn: toolCall
      yield { type: 'start', partial: { role: 'assistant', content: [{ type: 'toolCall', id: 'call_1', name: 'ls', arguments: {} }], stopReason: undefined, usage: undefined } as any };
      yield { type: 'toolcall_end', toolCall: { id: 'call_1', name: 'ls', arguments: {} } } as any;
      yield { type: 'done', reason: 'toolUse' as const, usage: { input: 10, output: 5, totalTokens: 15 } } as any;
    } else {
      // Stream second turn: text
      yield { type: 'start', partial: { role: 'assistant', content: [{ type: 'text', text: '' }], stopReason: undefined, usage: undefined } as any };
      yield { type: 'text_delta', delta: 'Here is the directory listing:\nTotal: 20 entries' } as any;
      yield { type: 'done', reason: 'stop' as const, usage: { input: 10, output: 5, totalTokens: 15 } } as any;
    }
  });

  return { complete, stream };
});

import { createAgentSessionServices } from '../session/agent-session-services.js';
import { SessionManager } from '../session/session-manager.js';
import { createAgentSessionFromServices } from '../session/agent-session-services.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import type { Model } from '../llm/index.js';

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
    const errors: any[] = [];
    const unsubscribe = session.subscribe((event: any) => {
      if (event.type === 'message_end') {
        turns.push(event.turn);
      }
      if (event.type === 'error') {
        errors.push(event);
      }
    });

    try {
      // Prompt to list files
      await session.prompt('list files');

      // Wait a bit for async event flushing (should not be needed but safe)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Log for debugging
      console.log('Collected turns:', JSON.stringify(turns, null, 2));
      if (errors.length) {
        console.log('Errors:', errors);
      }

      // Check we have assistant messages with text content
      const assistantTurns = turns.filter(t => t.role === 'assistant');
      expect(assistantTurns.length).toBeGreaterThanOrEqual(1, 'Should have at least one assistant turn');

      // Find a turn with a text message
      const turnWithText = assistantTurns.find(t =>
        t.content.some((c: any) => c.type === 'text')
      );
      expect(turnWithText).toBeDefined('Should have an assistant turn containing text');

      const text = turnWithText.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('');

      expect(text).toMatch(/Total: \d+ entries/);
    } finally {
      unsubscribe();
    }
  });
}, 30000);
