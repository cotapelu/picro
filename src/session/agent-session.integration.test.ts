// SPDX-License-Identifier: Apache-2.0
/**
 * Integration tests for AgentSession.
 *
 * These tests exercise the full agent session lifecycle:
 * - Session creation
 * - Prompt → response flow
 * - Model switching
 * - Event subscription
 * - Session persistence (save/load)
 *
 * Uses a mock LLM provider to avoid real API calls.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { AgentSession } from './agent-session.js';
import { SessionManager } from './session-manager.js';
import { SettingsManager } from '../runtime/settings-manager.js';
import { DefaultModelRegistry } from './model-registry.js';
import { DefaultResourceLoader } from '../runtime/resource-loader.js';
import { AuthStorage } from './auth-storage.js';
import { ExtensionRunner } from '../extensions/runner.js';
import { createExtensionRuntime } from '../extensions/runner.js';
import { Agent } from '../agent/agent.js';
import { ToolExecutor } from '../agent/tool-executor.js';
import { ContextBuilder } from '../agent/context-manager.js';
import { EventEmitter } from '../events/event-emitter.js';
import type { Model } from '../llm/index.js';

// Mock LLM that returns a simple response without tool calls
function createMockLLM(response: string, toolCalls: any[] = []) {
  return async (prompt: string, tools: any[], options?: any): Promise<any> => {
    return {
      content: response,
      stopReason: 'stop',
      usage: { input: 100, output: 50, totalTokens: 150, cost: { input: 0, output: 0, total: 0 } },
      toolCalls,
    };
  };
}

// Minimal test model
const mockModel: Model = {
  id: 'mock-model',
  name: 'Mock Model',
  api: 'openai',
  provider: 'openai',
  baseUrl: 'https://api.openai.com',
  reasoning: false,
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000,
  maxTokens: 4096,
};

// Helper to create a complete services setup
async function createTestServices(testDir: string) {
  const agentDir = join(testDir, '.pi', 'agent');
  mkdirSync(agentDir, { recursive: true });

  const authStorage = AuthStorage.create(join(agentDir, 'auth.json'));
  const settingsManager = SettingsManager.create(testDir, agentDir);
  // Stubbed modelRegistry that accepts any model
  const modelRegistry = {
    hasConfiguredAuth: () => true,
    getApiKeyAndHeaders: async () => ({ ok: true, apiKey: 'test', headers: {} }),
  } as any;
  const resourceLoader = new DefaultResourceLoader({ cwd: testDir, agentDir, settingsManager });

  return {
    authStorage,
    settingsManager,
    modelRegistry,
    resourceLoader,
    agentDir,
  };
}

// Helper to create Agent with simple tools (bash, read, write, edit, ls)
function createTestAgent(cwd: string, customTools?: any[]) {
  // We'll use ToolExecutor directly to build tools
  const toolExecutor = new ToolExecutor();
  // Register tools would be done via AgentSession
  return new Agent(undefined, [], {
    maxRounds: 5,
    verbose: false,
    toolTimeout: 30000,
    cacheResults: false,
    toolExecutionStrategy: 'parallel',
    contextBuilder: { maxTokens: 128000, reservedTokens: 4096, minMessages: 5, enableMemoryInjection: true },
    executor: { timeout: 30000, cacheEnabled: false, toolExecutionStrategy: 'parallel' },
    enableLogging: false,
    steeringMode: 'dequeue-one',
    followUpMode: 'dequeue-one',
    debug: false,
    compaction: { enabled: true, autoCompact: true },
  });
}

describe('AgentSession Integration', () => {
  let testDir: string;
  let services: any;
  let sessionManager: SessionManager;
  let agent: Agent;
  let session: AgentSession;

  beforeEach(async () => {
    testDir = join(tmpdir(), `picro-integration-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    services = await createTestServices(testDir);
    sessionManager = SessionManager.continueRecent(testDir, services.settingsManager.getSessionDir() ?? join(services.agentDir, 'sessions'));
    agent = createTestAgent(testDir);

    session = new AgentSession({
      agent,
      sessionManager,
      settingsManager: services.settingsManager,
      cwd: testDir,
      resourceLoader: services.resourceLoader,
      modelRegistry: services.modelRegistry,
    });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('session lifecycle', () => {
    it('should create session with empty state', () => {
      // Session starts with no model set
      // but agent session should be initialized
      expect(session).toBeDefined();
    });

    it('should set model and emit event', async () => {
      const events: any[] = [];
      session.subscribe((ev) => events.push(ev));

      await session.setModel(mockModel);

      expect(events.some(e => e.type === 'model_change')).toBe(true);
    });
  });

  describe('prompt flow', () => {
    it('should run a simple prompt and produce answer', async () => {
      const llmProvider = createMockLLM('Hello, I am AI.');
      agent.setLLMProvider(llmProvider);

      await session.setModel(mockModel);

      // Send a prompt
      await session.prompt('Hi');

      // Check state via agent
      const state = session.agent.getState();
      expect(state.history.length).toBeGreaterThan(0);
    });
  });

  describe('event subscription', () => {
    it('should receive events during execution', async () => {
      const llmProvider = createMockLLM('Result');
      agent.setLLMProvider(llmProvider);

      await session.setModel(mockModel);

      const events: any[] = [];
      session.subscribe((ev) => events.push(ev));

      await session.prompt('Test');

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'agent:start')).toBe(true);
      expect(events.some(e => e.type === 'agent:end')).toBe(true);
    });
  });

  describe('session persistence', () => {
    it('should record entries in session manager', async () => {
      const llmProvider = createMockLLM('Answer');
      agent.setLLMProvider(llmProvider);
      await session.setModel(mockModel);
      await session.prompt('First');

      // The session manager should have recorded entries
      const branch = sessionManager.getBranch();
      expect(branch.length).toBeGreaterThan(0);

      // We can create a new AgentSession using the same manager and it should still have entries
      const newSession = new AgentSession({
        agent: createTestAgent(testDir),
        sessionManager: sessionManager,
        settingsManager: services.settingsManager,
        cwd: testDir,
        resourceLoader: services.resourceLoader,
        modelRegistry: services.modelRegistry,
      });
      // New session's manager has same branch
      expect(newSession['sessionManager'].getBranch().length).toBeGreaterThan(0);
    });
  });
});
