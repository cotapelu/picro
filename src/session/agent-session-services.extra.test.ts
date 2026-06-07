// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { createAgentSessionServices } from './agent-session-services.js';

// Mock external dependencies
vi.mock('./auth-storage.js', () => ({
  AuthStorage: {
    create: vi.fn(() => ({})),
  },
}));

vi.mock('../runtime/settings-manager.js', () => ({
  SettingsManager: {
    create: vi.fn(() => ({})),
  },
}));

vi.mock('./model-registry.js', () => ({
  DefaultModelRegistry: vi.fn(function () { return {}; }),
}));

vi.mock('../runtime/resource-loader.js', () => ({
  DefaultResourceLoader: vi.fn(function () {
    return {
      reload: async () => {},
      getExtensions: () => ({ runtime: { flagValues: new Map(), pendingProviderRegistrations: [] }, extensions: [], errors: [] }),
    };
  }),
}));

vi.mock('../extensions/loader.js', () => ({
  discoverAndLoadExtensions: vi.fn(),
}));

vi.mock('../extensions/runner.js', () => ({
  createExtensionRuntime: vi.fn(() => ({ flagValues: new Map(), pendingProviderRegistrations: [] })),
  ExtensionRunner: vi.fn(function(this: any) { this.loadExtensions = vi.fn(); }),
}));

import { AuthStorage } from './auth-storage.js';
import { SettingsManager } from '../runtime/settings-manager.js';
import { DefaultModelRegistry } from './model-registry.js';
import { DefaultResourceLoader } from '../runtime/resource-loader.js';
import { discoverAndLoadExtensions } from '../extensions/loader.js';
import { ExtensionRunner } from '../extensions/runner.js';

describe('createAgentSessionServices (extra)', () => {
  const mockCwd = join(tmpdir(), 'cwd');
  const mockAgentDir = join(tmpdir(), 'agent');

  function resetMocks() {
    vi.clearAllMocks();
    // For static create methods (AuthStorage, SettingsManager)
    (AuthStorage.create as any).mockReturnValue({});
    (SettingsManager.create as any).mockReturnValue({ getSessionDir: () => undefined });
    // For constructors (DefaultModelRegistry, DefaultResourceLoader)
    (DefaultModelRegistry as any).mockImplementation(function () { return {}; });
    (DefaultResourceLoader as any).mockImplementation(function () {
      return {
        reload: async () => {},
        getExtensions: () => ({ runtime: { flagValues: new Map(), pendingProviderRegistrations: [] }, extensions: [], errors: [] }),
      };
    });
    (discoverAndLoadExtensions as any).mockResolvedValue({
      extensions: [],
      errors: [],
      runtime: { flagValues: new Map(), pendingProviderRegistrations: [] },
    });
  }

  beforeEach(() => {
    resetMocks();
  });

  it('returns services with required properties', async () => {
    const services = await createAgentSessionServices({ cwd: mockCwd });
    expect(services).toHaveProperty('cwd', mockCwd);
    expect(services).toHaveProperty('agentDir');
    expect(services).toHaveProperty('sessionDir');
    expect(services).toHaveProperty('authStorage');
    expect(services).toHaveProperty('settingsManager');
    expect(services).toHaveProperty('modelRegistry');
    expect(services).toHaveProperty('resourceLoader');
    expect(services).toHaveProperty('diagnostics');
    expect(services).toHaveProperty('extensionRunner');
  });

  it('uses default agentDir when not provided', async () => {
    const services = await createAgentSessionServices({ cwd: mockCwd });
    expect(typeof services.agentDir).toBe('string');
    expect(services.agentDir).toContain('.pi');
    expect(services.agentDir).toContain('agent');
  });

  it('honors provided agentDir', async () => {
    const services = await createAgentSessionServices({ cwd: mockCwd, agentDir: mockAgentDir });
    expect(services.agentDir).toBe(mockAgentDir);
  });

  it('creates authStorage, settingsManager, modelRegistry, resourceLoader', async () => {
    await createAgentSessionServices({ cwd: mockCwd, agentDir: mockAgentDir });
    expect(AuthStorage.create).toHaveBeenCalledWith(expect.stringContaining('auth.json'));
    expect(SettingsManager.create).toHaveBeenCalledWith(mockCwd, mockAgentDir);
    expect(DefaultModelRegistry).toHaveBeenCalled();
    expect(DefaultResourceLoader).toHaveBeenCalledWith(expect.objectContaining({
      cwd: mockCwd,
      agentDir: mockAgentDir,
    }));
  });

  it('passes resourceLoaderOptions through to DefaultResourceLoader', async () => {
    const opts = {
      cwd: mockCwd,
      agentDir: mockAgentDir,
      resourceLoaderOptions: {
        noExtensions: true,
        noSkills: true,
        noThemes: true,
        noContextFiles: true,
        systemPrompt: 'sys',
        appendSystemPrompt: ['a'],
      },
    };
    await createAgentSessionServices(opts);
    expect(DefaultResourceLoader).toHaveBeenCalledWith(expect.objectContaining({
      cwd: mockCwd,
      agentDir: mockAgentDir,
      noExtensions: true,
      noSkills: true,
      noThemes: true,
      noContextFiles: true,
      systemPrompt: 'sys',
      appendSystemPrompt: ['a'],
    }));
  });

  it('handles extension discovery errors gracefully', async () => {
    const err = new Error('extension discovery failed');
    (discoverAndLoadExtensions as any).mockRejectedValueOnce(err);
    const services = await createAgentSessionServices({ cwd: mockCwd, agentDir: mockAgentDir });
    expect(services).toBeDefined();
    expect(services.diagnostics).toEqual([]);
    expect(services.extensionRunner).toBeDefined();
  });

  it('parses extensionFlagValues for boolean flags', async () => {
    (discoverAndLoadExtensions as any).mockResolvedValue({
      extensions: [],
      errors: [],
      runtime: { flagValues: new Map([['boolFlag', true]]), pendingProviderRegistrations: [] },
    });
    const services = await createAgentSessionServices({
      cwd: mockCwd,
      agentDir: mockAgentDir,
      extensionFlagValues: new Map([['boolFlag', true]]),
    });
    expect(services).toBeDefined();
  });

  it('parses extensionFlagValues for string flags', async () => {
    (discoverAndLoadExtensions as any).mockResolvedValue({
      extensions: [],
      errors: [],
      runtime: { flagValues: new Map([['strFlag', 'val']]), pendingProviderRegistrations: [] },
    });
    const services = await createAgentSessionServices({
      cwd: mockCwd,
      agentDir: mockAgentDir,
      extensionFlagValues: new Map([['strFlag', 'val']]),
    });
    expect(services).toBeDefined();
  });

  it('records diagnostic for unknown extension flag', async () => {
    (discoverAndLoadExtensions as any).mockResolvedValue({
      extensions: [],
      errors: [],
      runtime: { flagValues: new Map(), pendingProviderRegistrations: [] },
    });
    const services = await createAgentSessionServices({
      cwd: mockCwd,
      agentDir: mockAgentDir,
      extensionFlagValues: new Map([['unknown', 'x']]),
    });
    expect(services.diagnostics).toHaveLength(1);
    expect(services.diagnostics[0].type).toBe('error');
    expect(services.diagnostics[0].message).toContain('Unknown option');
  });

  it('creates extensionRunner even if discovery fails', async () => {
    (discoverAndLoadExtensions as any).mockRejectedValue(new Error('fail'));
    const services = await createAgentSessionServices({ cwd: mockCwd, agentDir: mockAgentDir });
    expect(services.extensionRunner).toBeDefined();
    expect(services.extensionRunner instanceof ExtensionRunner).toBe(true);
  });

  it('propagates error when resourceLoader constructor throws', async () => {
    (DefaultResourceLoader as any).mockImplementation(() => {
      throw new Error('loader fail');
    });
    await expect(createAgentSessionServices({ cwd: mockCwd, agentDir: mockAgentDir })).rejects.toThrow('loader fail');
  });

  it('uses injected custom service instances', async () => {
    const customAuth = {} as any;
    const customSettings = { getSessionDir: () => join(mockCwd, 'sessions') } as any;
    const customRegistry = {} as any;
    const customLoader = { reload: async () => {}, getExtensions: () => ({ runtime: { flagValues: new Map(), pendingProviderRegistrations: [] }, extensions: [], errors: [] }) } as any;
    const services = await createAgentSessionServices({
      cwd: mockCwd,
      agentDir: mockAgentDir,
      authStorage: customAuth,
      settingsManager: customSettings,
      modelRegistry: customRegistry,
      resourceLoader: customLoader,
    });
    expect(services.authStorage).toBe(customAuth);
    expect(services.settingsManager).toBe(customSettings);
    expect(services.modelRegistry).toBe(customRegistry);
    expect(services.resourceLoader).toBe(customLoader);
  });
});
