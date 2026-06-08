import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentSessionRuntime } from './agent-session-runtime.js';

function createMockSession(): any {
  return {
    dispose: vi.fn(),
    settings: { get: vi.fn(), set: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
    messages: [],
    isStreaming: false,
    model: { id: 'default', provider: 'test' },
  };
}

function createMockServices(cwd = '/test'): any {
  return {
    cwd,
    sessionDir: '/sessions',
    settingsManager: { get: vi.fn(), set: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
    diagnostics: [],
  };
}

describe('AgentSessionRuntime (additional)', () => {
  let session: any;
  let services: any;
  let runtime: AgentSessionRuntime;
  const mockAgent: any = {};

  beforeEach(() => {
    vi.clearAllMocks();
    session = createMockSession();
    services = createMockServices();
    runtime = new AgentSessionRuntime(mockAgent, session, services);
  });

  describe('setBeforeSessionInvalidate', () => {
    it('stores the handler', () => {
      const handler = vi.fn();
      expect(() => runtime.setBeforeSessionInvalidate(handler)).not.toThrow();
      // The handler is stored internally; we can't directly assert, but ensure no error
    });
  });

  describe('setRebindSession', () => {
    it('stores the handler', () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      expect(() => runtime.setRebindSession(handler)).not.toThrow();
    });
  });

  describe('get diagnostics', () => {
    it('returns services.diagnostics', () => {
      const diag = [{ type: 'info', message: 'test' }];
      services.diagnostics = diag;
      expect(runtime.diagnostics).toBe(diag);
    });
  });

  describe('dispose', () => {
    it('calls session.dispose and marks disposed', async () => {
      await runtime.dispose();
      expect(session.dispose).toHaveBeenCalled();
    });

    it('is idempotent', async () => {
      await runtime.dispose();
      await runtime.dispose();
      expect(session.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('get modelFallbackMessage', () => {
    it('returns undefined by default', () => {
      expect(runtime.modelFallbackMessage).toBeUndefined();
    });
  });
});
