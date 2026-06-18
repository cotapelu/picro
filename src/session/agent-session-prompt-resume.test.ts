// SPDX-License-Identifier: Apache-2.0
/**
 * Additional tests for context persistence: run() vs resume() behavior.
 */

import { describe, it, expect, vi } from 'vitest';
import { AgentSession } from './agent-session.js';
import { DefaultModelRegistry } from './model-registry.js';
import { SettingsManager } from '../runtime/settings-manager.js';

function createSession(overrides: any = {}) {
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
    resume: vi.fn().mockResolvedValue(undefined),
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

describe('AgentSession.prompt - context persistence', () => {
  it('first turn with empty history calls agent.run', async () => {
    const session = createSession({
      modelRegistry: { hasConfiguredAuth: vi.fn().mockReturnValue(true) } as any,
    });
    session.agent.state.isRunning = false;
    session.agent.state.history = [];
    (session as any)._model = { provider: 'openai', contextWindow: 10000 } as any;
    (session as any).waitForRetry = vi.fn().mockResolvedValue(undefined);
    await session.prompt('first message');
    expect(session.agent.run).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ role: 'user', content: [{ type: 'text', text: 'first message' }] })
    ]));
    expect(session.agent.resume).not.toHaveBeenCalled();
  });

  it('subsequent turns with history call agent.resume via steer queue', async () => {
    const session = createSession({
      modelRegistry: { hasConfiguredAuth: vi.fn().mockReturnValue(true) } as any,
    });
    session.agent.state.isRunning = false;
    session.agent.state.history = [
      { role: 'user', content: [{ type: 'text', text: 'previous' }], timestamp: Date.now() },
      { role: 'assistant', content: [{ type: 'text', text: 'response' }], timestamp: Date.now() },
    ];
    (session as any)._model = { provider: 'openai', contextWindow: 10000 } as any;
    (session as any).waitForRetry = vi.fn().mockResolvedValue(undefined);
    await session.prompt('next message');
    expect(session.agent.steer).toHaveBeenCalledWith(expect.objectContaining({
      role: 'user',
      content: [{ type: 'text', text: 'next message' }],
    }));
    expect(session.agent.resume).toHaveBeenCalled();
    expect(session.agent.run).not.toHaveBeenCalled();
  });
});
