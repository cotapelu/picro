// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for AgentSession.prompt() error handling and success path.
 */

import { describe, it, expect, vi } from 'vitest';
import { AgentSession } from './agent-session.js';
import { DefaultModelRegistry } from './model-registry.js';
import { SettingsManager } from '../runtime/settings-manager.js';

function createSession(overrides: any = {}) {
  // Base agent with required methods and state
  const baseAgent = {
    subscribe: vi.fn(() => () => {}),
    registerTool: vi.fn(),
    clearAllQueues: vi.fn(),
    abort: vi.fn(),
    setModel: vi.fn(),
    getToolNames: vi.fn(() => []),
    steer: vi.fn(),
    followUp: vi.fn(),
    getConfig: vi.fn().mockReturnValue({}),
    run: vi.fn().mockResolvedValue(undefined),
    state: { isRunning: false, history: [], messages: [] },
  };
  const agent = { ...baseAgent, ...(overrides.agent || {}) };
  const sessionManager = {
    getLeafId: vi.fn().mockReturnValue('leaf'),
    getSessionFile: vi.fn().mockReturnValue(undefined),
    getSessionId: vi.fn().mockReturnValue('sid'),
    appendMessage: vi.fn(),
    appendModelChange: vi.fn(),
    appendThinkingLevelChange: vi.fn(),
    getBranch: vi.fn().mockReturnValue([]),
    buildSessionContext: vi.fn().mockReturnValue({ messages: [] }),
  };
  const settingsManager = SettingsManager.inMemory({});
  const modelRegistry = overrides.modelRegistry || new DefaultModelRegistry();

  return new AgentSession({
    agent,
    sessionManager: { ...sessionManager, ...(overrides.sessionManager || {}) },
    settingsManager: { ...settingsManager, ...(overrides.settingsManager || {}) },
    cwd: '/test',
    resourceLoader: {
      getAgentsFiles: () => undefined,
      getSkills: () => undefined,
      getAppendSystemPrompt: () => [],
      getExtensions: () => ({ runtime: { flagValues: new Map() }, extensions: [], errors: [] }),
    },
    modelRegistry,
    ...overrides,
  });
}

describe('AgentSession.prompt - branch tests', () => {
  describe('Streaming cases', () => {
    it('throws if streaming without streamingBehavior', async () => {
      const session = createSession();
      session.agent.state.isRunning = true;
      await expect(session.prompt('test')).rejects.toThrow(/streamingBehavior/);
    });

    it('queues as steer when streaming with steeringBehavior', async () => {
      const session = createSession();
      session.agent.state.isRunning = true;
      await session.prompt('test', { streamingBehavior: 'steer' });
      // _queueSteer builds a turn and calls agent.steer with the turn
      expect(session.agent.steer).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: expect.arrayContaining([{ type: 'text', text: 'test' }]),
        })
      );
    });

    it('queues as followUp when streaming with followUp', async () => {
      const session = createSession();
      session.agent.state.isRunning = true;
      await session.prompt('test', { streamingBehavior: 'followUp' });
      expect(session.agent.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: expect.arrayContaining([{ type: 'text', text: 'test' }]),
        })
      );
    });
  });

  describe('Validation', () => {
    it('throws if model is not set', async () => {
      const session = createSession();
      session.agent.state.isRunning = false;
      (session as any)._model = null;
      await expect(session.prompt('test')).rejects.toThrow(/No model selected/);
    });

    it('throws if model auth not configured', async () => {
      const session = createSession({
        modelRegistry: { hasConfiguredAuth: vi.fn().mockReturnValue(false) } as any,
      });
      session.agent.state.isRunning = false;
      (session as any)._model = { provider: 'openai' } as any;
      await expect(session.prompt('test')).rejects.toThrow(/API key/);
    });
  });

  describe('Success path', () => {
    it('non-streaming calls agent.run and flushes pending bash', async () => {
      const session = createSession({
        modelRegistry: { hasConfiguredAuth: vi.fn().mockReturnValue(true) } as any,
      });
      session.agent.state.isRunning = false;
      (session as any)._model = { provider: 'openai' } as any;
      (session as any).waitForRetry = vi.fn().mockResolvedValue(undefined);
      (session as any)._flushPendingBashMessages = vi.fn();
      await session.prompt('hello');
      // agent.run now expects an array of ConversationTurn (or string)
      expect(session.agent.run).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: [{ type: 'text', text: 'hello' }] })
      ]));
      expect((session as any)._flushPendingBashMessages).toHaveBeenCalled();
    });
  });
});
