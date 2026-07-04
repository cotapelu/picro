import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentSessionRuntime } from './agent-session-runtime.js';
import type { Agent } from '../agent/agent.js';
import type { AgentSession } from '../session/agent-session.js';
import type { AgentSessionServices } from '../session/agent-session-services.js';

describe('AgentSessionRuntime', () => {
  let mockAgent: Agent;
  let mockSession: AgentSession;
  let mockServices: AgentSessionServices;
  let runtime: AgentSessionRuntime;

  beforeEach(() => {
    mockAgent = {} as any;
    mockSession = {} as any;
    mockServices = {
      cwd: '/test',
      authStorage: {} as any,
      modelRegistry: {} as any,
      settingsManager: {
        getDefaultProvider: () => 'openai',
        getDefaultModel: () => 'gpt-4',
      } as any,
      sessionManager: {} as any,
      resourceLoader: {} as any,
      telemetry: { isEnabled: () => false, track: vi.fn() } as any,
      trustManager: {} as any,
      performanceTracker: {} as any,
      diagnostics: { warn: vi.fn(), error: vi.fn() } as any,
      outputGuard: {} as any,
      keybindings: {} as any,
      footerDataProvider: {} as any,
      systemPrompt: { build: vi.fn(() => 'sys') } as any,
      promptTemplates: { getForRole: vi.fn() } as any,
      skills: { getAll: vi.fn() } as any,
      themes: { getCurrent: vi.fn() } as any,
      extensions: { getAll: vi.fn() } as any,
    } as any;
    runtime = new AgentSessionRuntime(mockAgent, mockSession, mockServices);
  });

  it('should expose session', () => {
    expect(runtime.session).toBe(mockSession);
  });

  it('should expose services', () => {
    expect(runtime.services).toBe(mockServices);
  });

  it('should expose cwd', () => {
    expect(runtime.cwd).toBe('/test');
  });

  it('should have prompt method delegating to session', async () => {
    const promptSpy = vi.fn().mockResolvedValue(undefined);
    mockSession.prompt = promptSpy;
    await runtime.prompt('hello');
    expect(promptSpy).toHaveBeenCalledWith('hello', undefined);
  });

  it('should have settings getter returning settingsManager', () => {
    expect(runtime.settings).toBe(mockServices.settingsManager);
  });

  it('should have authStorage getter', () => {
    expect(runtime.authStorage).toBe(mockServices.authStorage);
  });
});
