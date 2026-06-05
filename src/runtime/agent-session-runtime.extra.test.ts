// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock for node:fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  // Provide a default export to satisfy any default imports
  default: {},
}));
vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return {
    ...actual,
    join: vi.fn((...parts: string[]) => parts.join('/')),
  };
});

// Mock ../session/session-manager.js
vi.mock('../session/session-manager.js', () => {
  const mockSessionManager = vi.fn(() => ({
    newSession: vi.fn(),
    getEntry: vi.fn(),
    branchWithSummary: vi.fn(),
  }));
  // Static methods
  mockSessionManager.open = vi.fn();
  mockSessionManager.continueRecent = vi.fn();
  mockSessionManager.list = vi.fn();
  mockSessionManager.listAll = vi.fn();
  mockSessionManager.importSession = vi.fn();
  mockSessionManager.create = vi.fn();
  return { SessionManager: mockSessionManager };
});

// Mock ../session/agent-session-services.js
vi.mock('../session/agent-session-services.js', () => ({
  createAgentSessionServices: vi.fn(),
  createAgentSessionFromServices: vi.fn(),
}));

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { SessionManager } from '../session/session-manager.js';
import { createAgentSessionFromServices } from '../session/agent-session-services.js';
import { AgentSessionRuntime } from './agent-session-runtime.js';
import type { AgentSessionServices } from '../session/agent-session-services.js';

// ================= Helpers =================

function createMockSession(overrides: any = {}): any {
  const base: any = {
    dispose: vi.fn(),
    sessionManager: {
      getEntry: vi.fn(),
      branchWithSummary: vi.fn(() => ({ selectedText: 'forked' })),
    },
    settings: { get: vi.fn(), set: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
    messages: [],
    isStreaming: false,
    model: { id: 'default', provider: 'test' },
  };
  base.setThinkingLevel = vi.fn(function(level: any) { this.thinkingLevel = level; });
  return { ...base, ...overrides };
}

function createMockServices(cwd = '/test', overrides: any = {}): AgentSessionServices {
  const base: AgentSessionServices = {
    cwd,
    sessionDir: '/sessions',
    settingsManager: { get: vi.fn(), set: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
    diagnostics: [],
  };
  return { ...base, ...overrides };
}

// ================= Tests =================

describe('AgentSessionRuntime (extended)', () => {
  let session: any;
  let services: AgentSessionServices;
  let runtime: AgentSessionRuntime;
  const mockAgent: any = {};

  beforeEach(() => {
    vi.clearAllMocks();
    session = createMockSession();
    services = createMockServices();
    runtime = new AgentSessionRuntime(mockAgent, session, services);
  });

  describe('constructor', () => {
    it('stores agent, session, services', () => {
      expect(runtime.session).toBe(session);
      expect(runtime.services).toBe(services);
      expect(runtime.cwd).toBe('/test');
    });
  });

  describe('get services', () => {
    it('returns the injected services', () => {
      expect(runtime.services).toBe(services);
    });
  });

  describe('get cwd', () => {
    it('returns services.cwd', () => {
      expect(runtime.cwd).toBe('/test');
    });
  });

  describe('get thinkingLevel', () => {
    it('returns session.thinkingLevel', () => {
      session.thinkingLevel = 'high';
      expect(runtime.thinkingLevel).toBe('high');
    });
  });

  describe('setThinkingLevel', () => {
    it('sets session.thinkingLevel', () => {
      runtime.setThinkingLevel('minimal');
      expect(session.thinkingLevel).toBe('minimal');
    });
  });

  describe('get authStorage', () => {
    it('returns services.authStorage', () => {
      services.authStorage = { getApiKey: vi.fn() };
      expect(runtime.authStorage).toBe(services.authStorage);
    });
  });

  describe('get settings', () => {
    it('returns services.settingsManager', () => {
      expect(runtime.settings).toBe(services.settingsManager);
    });
  });

  describe('copyToClipboard', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('copies text on Windows via clip', () => {
      process.env = { ...originalEnv, windir: 'C:\\Windows' };
      // spy on execSync from child_process? The method uses require('child_process').execSync.
      // We'll not verify command; just ensure it doesn't throw.
      expect(() => runtime.copyToClipboard('text')).not.toThrow();
      process.env = originalEnv;
    });

    it('copies text on macOS via pbcopy', () => {
      process.env = { ...originalEnv, windir: undefined };
      expect(() => runtime.copyToClipboard('text')).not.toThrow();
    });
  });

  describe('get modelFallbackMessage', () => {
    it('returns undefined by default', () => {
      expect(runtime.modelFallbackMessage).toBeUndefined();
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
      expect(session.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('get diagnostics', () => {
    it('returns services.diagnostics', () => {
      expect(runtime.diagnostics).toBe(services.diagnostics);
    });
  });

  describe('setBeforeSessionInvalidate', () => {
    it('stores handler', () => {
      const handler = vi.fn();
      // Should not throw
      runtime.setBeforeSessionInvalidate(handler);
    });
  });

  describe('setRebindSession', () => {
    it('stores handler', () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      runtime.setRebindSession(handler);
    });
  });

  describe('fork', () => {
    const branchFromId = 'entry123';
    const summary = `Forked from entry ${branchFromId}`;

    beforeEach(() => {
      session.sessionManager.getEntry = vi.fn().mockReturnValue({ id: branchFromId, parentId: 'parent456' });
      session.sessionManager.branchWithSummary = vi.fn().mockReturnValue({ selectedText: 'forked text' });
    });

    it('forks at position "at" by default', async () => {
      const result = await runtime.fork(branchFromId);
      expect(session.sessionManager.getEntry).toHaveBeenCalledWith(branchFromId);
      expect(session.sessionManager.branchWithSummary).toHaveBeenCalledWith(branchFromId, summary);
      expect(result).toEqual({ cancelled: false, selectedText: 'forked text' });
    });

    it('forks at position "before" uses parentId', async () => {
      const result = await runtime.fork(branchFromId, { position: 'before' });
      expect(session.sessionManager.getEntry).toHaveBeenCalledWith(branchFromId);
      expect(session.sessionManager.branchWithSummary).toHaveBeenCalledWith('parent456', summary);
      expect(result).toEqual({ cancelled: false, selectedText: 'forked text' });
    });

    it('returns cancelled:true when disposed', async () => {
      await runtime.dispose();
      const result = await runtime.fork(branchFromId);
      expect(result).toEqual({ cancelled: true });
    });

    it('handles errors and returns cancelled:true', async () => {
      session.sessionManager.branchWithSummary = vi.fn().mockImplementation(() => { throw new Error('fail'); });
      const result = await runtime.fork(branchFromId);
      expect(result).toEqual({ cancelled: true });
    });
  });

  describe('newSession', () => {
    const mockNewSessionManager = {
      newSession: vi.fn(),
    };
    const mockNewSession = {};

    beforeEach(() => {
      vi.mocked(SessionManager).continueRecent = vi.fn().mockReturnValue(mockNewSessionManager);
      vi.mocked(createAgentSessionFromServices).mockResolvedValue(mockNewSession);
    });

    it('creates a new session', async () => {
      const result = await runtime.newSession();
      expect(mockNewSessionManager.newSession).toHaveBeenCalledWith({ parentSession: undefined });
      expect(createAgentSessionFromServices).toHaveBeenCalledWith({
        services: services,
        sessionManager: mockNewSessionManager,
      });
      expect(result).toEqual({ cancelled: false });
    });

    it('calls beforeInvalidate handler if set', async () => {
      const handler = vi.fn();
      runtime.setBeforeSessionInvalidate(handler);
      await runtime.newSession();
      expect(handler).toHaveBeenCalled();
    });

    it('returns cancelled:true when disposed', async () => {
      await runtime.dispose();
      const result = await runtime.newSession();
      expect(result).toEqual({ cancelled: true });
    });

    it('handles errors and returns cancelled:true', async () => {
      vi.mocked(createAgentSessionFromServices).mockRejectedValue(new Error('fail'));
      const result = await runtime.newSession();
      expect(result).toEqual({ cancelled: true });
    });
  });

  describe('switchSession', () => {
    const filePath = '/sessions/123.jsonl';
    const mockSwitchedSessionManager = { newSession: vi.fn() };
    const mockSwitchedSession = {};

    beforeEach(() => {
      fs.existsSync = vi.fn().mockReturnValue(true);
      vi.mocked(SessionManager).open = vi.fn().mockReturnValue({ newSession: vi.fn() });
      vi.mocked(SessionManager).continueRecent = vi.fn().mockReturnValue(mockSwitchedSessionManager);
      vi.mocked(createAgentSessionFromServices).mockResolvedValue(mockSwitchedSession);
    });

    it('switches to existing session file', async () => {
      const result = await runtime.switchSession(filePath);
      expect(SessionManager.open).toHaveBeenCalledWith(filePath, services.sessionDir, runtime.cwd);
      expect(createAgentSessionFromServices).toHaveBeenCalled();
      expect(result).toEqual({ cancelled: false });
    });

    it('returns cancelled:true when disposed', async () => {
      await runtime.dispose();
      const result = await runtime.switchSession(filePath);
      expect(result).toEqual({ cancelled: true });
    });

    it('handles file not found', async () => {
      fs.existsSync = vi.fn().mockReturnValue(false);
      const result = await runtime.switchSession(filePath);
      expect(result).toEqual({ cancelled: true });
    });
  });

  describe('listSessions', () => {
    it('returns combined local and global sessions', async () => {
      const local = [{ id: 'l1', path: '/p1', cwd: '/cwd' }];
      const global = [{ id: 'g1', path: '/p2', cwd: '/cwd' }];
      vi.mocked(SessionManager).list = vi.fn().mockResolvedValue(local);
      vi.mocked(SessionManager).listAll = vi.fn().mockResolvedValue(global);
      const result = await runtime.listSessions();
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject(local[0]);
      expect(result[1]).toMatchObject(global[0]);
    });

    it('returns empty array when disposed', async () => {
      await runtime.dispose();
      const result = await runtime.listSessions();
      expect(result).toEqual([]);
    });
  });

  describe('importFromJsonl', () => {
    const filePath = '/tmp/session.jsonl';
    const content = 'line1\nline2';

    beforeEach(() => {
      fs.existsSync = vi.fn().mockReturnValue(true);
      fs.readFileSync = vi.fn().mockReturnValue(content);
      vi.mocked(SessionManager).importSession = vi.fn().mockReturnValue({ newSession: vi.fn() });
      vi.mocked(createAgentSessionFromServices).mockResolvedValue({});
    });

    it('imports session from file', async () => {
      const result = await runtime.importFromJsonl(filePath);
      expect(fs.existsSync).toHaveBeenCalledWith(filePath);
      expect(fs.readFileSync).toHaveBeenCalledWith(filePath, 'utf-8');
      expect(SessionManager.importSession).toHaveBeenCalledWith(runtime.cwd, services.sessionDir, content);
      expect(createAgentSessionFromServices).toHaveBeenCalled();
      expect(result).toEqual({ cancelled: false });
    });

    it('uses cwdOverride if provided', async () => {
      const overrideCwd = '/override';
      await runtime.importFromJsonl(filePath, overrideCwd);
      expect(SessionManager.importSession).toHaveBeenCalledWith(overrideCwd, services.sessionDir, content);
    });

    it('returns cancelled if file not found', async () => {
      fs.existsSync = vi.fn().mockReturnValue(false);
      const result = await runtime.importFromJsonl(filePath);
      expect(result).toEqual({ cancelled: true });
    });

    it('returns cancelled on read error', async () => {
      fs.readFileSync = vi.fn().mockImplementation(() => { throw new Error('read error'); });
      const result = await runtime.importFromJsonl(filePath);
      expect(result).toEqual({ cancelled: true });
    });

    it('returns cancelled when disposed', async () => {
      await runtime.dispose();
      const result = await runtime.importFromJsonl(filePath);
      expect(result).toEqual({ cancelled: true });
    });
  });
});
