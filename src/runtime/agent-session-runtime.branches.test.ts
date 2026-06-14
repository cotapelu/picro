import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock node:fs, preserve actual fs and override existsSync
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

// Mock clipboardy
vi.mock('clipboardy', () => ({
  default: {
    write: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock node:child_process for fallback
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Mock createAgentSessionFromServices to avoid heavy init
vi.mock('../session/agent-session-services.js', () => ({
  createAgentSessionFromServices: vi.fn().mockResolvedValue({}),
}));

import { existsSync } from 'node:fs';
import clipboardy from 'clipboardy';
import { execSync } from 'node:child_process';
import { SessionManager } from '../session/session-manager.js';
import { AgentSessionRuntime } from './agent-session-runtime.js';
import { createAgentSessionFromServices } from '../session/agent-session-services.js';
import type { AgentSessionServices } from '../session/agent-session-services.js';

// Minimal session mock
function createMockSession(): any {
  return {
    dispose: vi.fn(),
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

describe('AgentSessionRuntime branches', () => {
  let session: any;
  let services: AgentSessionServices;
  let runtime: AgentSessionRuntime;

  beforeEach(() => {
    session = createMockSession();
    services = createMockServices();
    runtime = new AgentSessionRuntime({} as any, session, services);
    // Reset mocks
    vi.clearAllMocks();
    existsSync.mockReturnValue(true);
    createAgentSessionFromServices.mockResolvedValue({});
  });

  describe('constructor', () => {
    it('initializes properties', () => {
      expect(runtime.session).toBe(session);
      expect(runtime.services).toBe(services);
      expect(runtime.cwd).toBe('/test');
    });
  });

  describe('dispose', () => {
    it('calls session.dispose and sets disposed flag', async () => {
      await (runtime as any).dispose();
      expect(session.dispose).toHaveBeenCalled();
      expect((runtime as any)._disposed).toBe(true);
    });

    it('is idempotent', async () => {
      await (runtime as any).dispose();
      await (runtime as any).dispose();
      expect(session.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('switchSession', () => {
    beforeEach(() => {
      runtime._rebindSession = vi.fn().mockResolvedValue(undefined);
    });

    it('cancels if disposed', async () => {
      (runtime as any)._disposed = true;
      const result = await runtime.switchSession('/path');
      expect(result.cancelled).toBe(true);
    });

    it('cancels if session file does not exist', async () => {
      existsSync.mockReturnValueOnce(false);
      const result = await runtime.switchSession('/missing');
      expect(result.cancelled).toBe(true);
    });

    it('calls rebind on success', async () => {
      const newSessMgr = {} as any;
      vi.spyOn(SessionManager, 'open').mockReturnValue(newSessMgr);
      const result = await runtime.switchSession('/path');
      expect(runtime._rebindSession).toHaveBeenCalledWith('/path');
      expect(result.cancelled).toBe(false);
    });
  });

  describe('copyToClipboard', () => {
    it('uses clipboardy when available', async () => {
      await runtime.copyToClipboard('text');
      expect(clipboardy.write).toHaveBeenCalledWith('text');
    });

    it('falls back to execSync when clipboardy fails and not CI', async () => {
      (clipboardy.write as any).mockRejectedValue(new Error('fail'));

      // Ensure CI is not set
      const originalCI = process.env.CI;
      delete process.env.CI;

      execSync.mockImplementation(() => {});

      await runtime.copyToClipboard('fallback text');

      expect(execSync).toHaveBeenCalled();

      if (originalCI) process.env.CI = originalCI;
    });

    it('logs text when in CI mode', async () => {
      (clipboardy.write as any).mockRejectedValue(new Error('fail'));

      const originalCI = process.env.CI;
      process.env.CI = 'true';

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await runtime.copyToClipboard('ci text');

      expect(consoleLogSpy).toHaveBeenCalledWith('[clipboard] ', 'ci text');

      if (originalCI !== undefined) process.env.CI = originalCI;
      else delete process.env.CI;
    });
  });
});
