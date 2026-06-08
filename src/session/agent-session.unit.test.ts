import { describe, it, expect, vi } from 'vitest';
import { AgentSession } from './agent-session.js';

describe('AgentSession unit', () => {
  it('getLeafId returns sessionManager.getLeafId()', () => {
    const sessionManager = {
      getLeafId: vi.fn().mockReturnValue('leaf-123'),
    };
    const agentSession = new AgentSession({
      agent: { subscribe: () => () => {} },
      sessionManager,
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    expect(agentSession.getLeafId()).toBe('leaf-123');
  });

  it('autoCompactionEnabled getter/setter works', () => {
    const settingsManager = {
      getCompactionEnabled: vi.fn().mockReturnValue(true),
      setCompactionEnabled: vi.fn(),
    };
    const agentSession = new AgentSession({
      agent: { subscribe: () => () => {} },
      sessionManager: { getLeafId: vi.fn() },
      settingsManager,
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    expect(agentSession.autoCompactionEnabled).toBe(true);
    agentSession.setAutoCompactionEnabled(false);
    expect(settingsManager.setCompactionEnabled).toHaveBeenCalledWith(false);
  });
});
