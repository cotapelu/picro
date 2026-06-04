import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Define mock model
const mockModel = {
  provider: 'openai',
  id: 'test-model',
  name: 'Test Model',
  baseUrl: 'https://api.openai.com',
  reasoning: false,
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 4096,
  maxTokens: 1024,
};

// Mock the DefaultModelRegistry to provide the test model
vi.mock('./model-registry.js', () => {
  return {
    DefaultModelRegistry: class {
      find(provider: string, modelId: string) {
        if (provider === mockModel.provider && modelId === mockModel.id) {
          return mockModel as any;
        }
        return undefined;
      }
      hasConfiguredAuth() { return true; }
      async getApiKeyAndHeaders() { return { ok: true, apiKey: 'dummy', headers: {} }; }
      getProviders() { return [mockModel.provider]; }
      getModels() { return [mockModel]; }
      registerProvider() {}
    },
  };
});

import { createAgentSessionRuntime } from '../runtime/agent-session-runtime.js';
import { SessionManager } from './session-manager.js';
import { createAgentSessionServices, createAgentSessionFromServices } from './agent-session-services.js';

describe('AgentSession Resume', () => {
  let testDir: string;
  let agentDir: string;

  beforeAll(() => {
    process.env.OPENAI_API_KEY = 'dummy';
  });

  afterAll(() => {
    delete process.env.OPENAI_API_KEY;
  });

  beforeEach(() => {
    testDir = join(tmpdir(), `picro-resume-${Date.now()}`);
    agentDir = join(testDir, '.pi', 'agent');
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch {}
  });

  it('should restore model and messages from a previous session', async () => {
    // === Phase 1: Create initial session, set model, add a message ===
    const services1 = await createAgentSessionServices({
      cwd: testDir,
      agentDir,
    });

    const sessionManager1 = SessionManager.continueRecent(testDir, services1.sessionDir);
    if (!sessionManager1.file) {
      const newFile = join(services1.sessionDir, `session-${Date.now()}.jsonl`);
      (sessionManager1 as any).file = newFile;
    }
    console.log('sessionManager1.file:', sessionManager1.file);
    console.log('services1.sessionDir:', services1.sessionDir);
    const fs = await import('fs');
    const files = fs.readdirSync(services1.sessionDir);
    console.log('Files in services1.sessionDir:', files);

    const session1 = await createAgentSessionFromServices({
      services: services1,
      sessionManager: sessionManager1,
    });

    const model = services1.modelRegistry.find(mockModel.provider, mockModel.id);
    if (!model) {
      throw new Error('Test precondition failed: mock model should be available');
    }

    await session1.setModel(model);

    // User message
    session1.sessionManager.appendMessage({
      role: 'user',
      content: [{ type: 'text', text: 'Resume test message' }],
      timestamp: Date.now(),
    } as any);
    // Assistant message to trigger persistence
    session1.sessionManager.appendMessage({
      role: 'assistant',
      content: [{ type: 'text', text: 'Understood' }],
      timestamp: Date.now(),
    } as any);

    const ctx1 = session1.sessionManager.buildSessionContext();
    expect(ctx1.messages.length).toBeGreaterThan(0);
    // Debug: print entries
    const entries1 = session1.sessionManager.getEntries();
    console.log('Entries1 count:', entries1.length);
    console.log('Entries1 types:', entries1.map((e: any) => e.type));
    console.log('Entries1[0]:', entries1[0]);
    console.log('ctx1.model:', ctx1.model);

    // === Phase 2: Create fresh runtime to resume ===
    const dummyFactory = async (opts: any) => ({ diagnostics: [] });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runtime = await createAgentSessionRuntime(dummyFactory as any, {
      cwd: testDir,
      agentDir,
    });

    // Debug second session manager
    const entries2 = runtime.session.sessionManager.getEntries();
    console.log('Entries2 count:', entries2.length);
    console.log('Entries2 types:', entries2.map((e: any) => e.type));
    const ctxAfter = runtime.session.sessionManager.buildSessionContext();
    console.log('ctxAfter.model:', ctxAfter.model);
    console.log('runtime.session.sessionManager.file:', runtime.session.sessionManager.file);

    // Verify model restored
    const resumedModel = runtime.session.model;
    expect(resumedModel).toBeDefined();
    expect(resumedModel!.provider).toBe(mockModel.provider);
    expect(resumedModel!.id).toBe(mockModel.id);

    // Verify agent history contains the user and assistant messages
    const history = runtime.session.agent.runner.state.history;
    expect(history.length).toBe(2);
    const userMsg = history.find(m => m.role === 'user');
    const assistantMsg = history.find(m => m.role === 'assistant');
    expect(userMsg).toBeDefined();
    expect(assistantMsg).toBeDefined();
    const userContent = (userMsg!.content as any[]).find(c => c.type === 'text');
    expect(userContent).toBeDefined();
    expect(userContent!.text).toBe('Resume test message');
    const assistantContent = (assistantMsg!.content as any[]).find(c => c.type === 'text');
    expect(assistantContent).toBeDefined();
    expect(assistantContent!.text).toBe('Understood');
  });
});
