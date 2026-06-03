// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentSessionRuntime } from './agent-session-runtime.js';
import type { AgentSessionServices } from '../session/agent-session-services.js';

// Mock session with minimal methods
function createMockSession(): any {
  return {
    dispose: vi.fn(),
    settings: { get: vi.fn(), set: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
    messages: [],
    isStreaming: false,
    model: { id: 'default', provider: 'test' },
  };
}

function createMockServices(cwd = '/test'): AgentSessionServices {
  return {
    cwd,
    sessionDir: '/sessions',
    settingsManager: { get: vi.fn(), set: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
    diagnostics: [],
  } as any;
}

describe('AgentSessionRuntime', () => {
  let session: any;
  let services: AgentSessionServices;
  let runtime: AgentSessionRuntime;

  beforeEach(() => {
    session = createMockSession();
    services = createMockServices();
    runtime = new AgentSessionRuntime({} as any, session, services);
  });

  describe('cwd', () => {
    it('returns services.cwd', () => {
      expect(runtime.cwd).toBe('/test');
    });
  });

  describe('session getter', () => {
    it('returns the injected session', () => {
      expect(runtime.session).toBe(session);
    });
  });

  describe('settings getter', () => {
    it('returns services.settingsManager', () => {
      expect(runtime.settings).toBe(services.settingsManager);
    });
  });

  describe('dispose', () => {
    it('calls session.dispose and marks disposed', async () => {
      await runtime.dispose();
      expect(session.dispose).toHaveBeenCalled();
    });

    it('is idempotent', async () => {
      await runtime.dispose();
      await runtime.dispose(); // should not throw
    });
  });

  describe('diagnostics getter', () => {
    it('returns services.diagnostics', () => {
      expect(runtime.diagnostics).toBe(services.diagnostics);
    });
  });

  describe('modelFallbackMessage', () => {
    it('returns undefined by default', () => {
      expect(runtime.modelFallbackMessage).toBeUndefined();
    });
  });
});
