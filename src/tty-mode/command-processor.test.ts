import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandProcessor } from './command-processor.js';

describe('CommandProcessor', () => {
  let processor: CommandProcessor;
  let api: any;

  beforeEach(() => {
    processor = new CommandProcessor();
    api = {
      getRl: () => ({ prompt: vi.fn() }),
      getMenuRenderer: () => ({
        show: vi.fn(),
      }),
      stop: vi.fn(),
    };
  });

  it('should have built-in commands', () => {
    const all = processor.getAll();
    const names = all.map(c => c.name);
    expect(names).toContain('model');
    expect(names).toContain('help');
    expect(names).toContain('quit');
    expect(names).toContain('exit');
  });

  it('should execute known command', async () => {
    const spy = vi.fn();
    processor.register({
      name: 'test',
      description: 'Test command',
      execute: spy,
    });
    await processor.execute(api, 'test', []);
    expect(spy).toHaveBeenCalledWith(api, []);
  });

  it('should return undefined for unknown command and print message', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await processor.execute(api, 'unknown', []);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
  });

  it('should provide help listing all commands', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await processor.execute(api, 'help', []);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('/model'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('/quit'));
  });

  it('should call stop for quit/exit', async () => {
    await processor.execute(api, 'quit', []);
    expect(api.stop).toHaveBeenCalled();
  });

  it('handleModel: should fetch models from registry and show menu', async () => {
    const mockMenu = {
      show: vi.fn(),
    };
    api.getMenuRenderer = () => mockMenu;
    api.getRl = () => ({ prompt: vi.fn() });
    api.getRuntime = () => ({ services: { modelRegistry: {} as any, settingsManager: {} as any } }); // will override below

    const getProviders = vi.fn(() => ['provider1']);
    const modelRegistry = {
      getProviders,
      getModels: vi.fn().mockReturnValue([{ id: 'm1' }, { id: 'm2' }]),
    };
    const settingsManager = {
      setDefaultProvider: vi.fn(),
    };
    api.getRuntime = () => ({ services: { modelRegistry, settingsManager } });

    await processor.execute(api, 'model', []);

    expect(modelRegistry.getProviders).toHaveBeenCalled();
    expect(modelRegistry.getModels).toHaveBeenCalledWith('provider1');
    expect(mockMenu.show).toHaveBeenCalled();
    const [items, onSelect] = mockMenu.show.mock.calls[0];
    expect(items.length).toBe(2);
    // simulate select first
    await onSelect(items[0]);
    expect(settingsManager.setDefaultProvider).toHaveBeenCalledWith('provider1');
  });

  it('handleModel: should print no models if empty', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const modelRegistry = {
      getProviders: () => [],
      getModels: vi.fn(),
    };
    api.getRuntime = () => ({ services: { modelRegistry } });
    api.getRl = () => ({ prompt: vi.fn() });

    await processor.execute(api, 'model', []);
    expect(consoleLogSpy).toHaveBeenCalledWith('No models available.');
  });

  it('getMenuItems should return slash commands', () => {
    const items = processor.getMenuItems();
    expect(items.length).toBeGreaterThanOrEqual(4);
    expect(items[0].label).toMatch(/^\/model/);
    expect(items[1].label).toMatch(/^\/help/);
  });

  describe('/sessions command', () => {
    it('should list sessions', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockSessions = [
        { id: '1', name: 'test', cwd: '/', firstMessage: 'hello' },
      ];
      const ttyApi = {
        getRl: () => ({ prompt: vi.fn() }),
        getRuntime: () => ({ listSessions: vi.fn().mockResolvedValue(mockSessions) }),
      } as any;
      await processor.execute(ttyApi, 'sessions', []);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Sessions:'));
    });

    it('should switch session', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const ttyApi = {
        getRl: () => ({ prompt: vi.fn() }),
        getRuntime: () => ({ switchSession: vi.fn().mockResolvedValue({ cancelled: false }) }),
      } as any;
      await processor.execute(ttyApi, 'sessions', ['switch', '1']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Switched to session 1'));
    });
  });

  describe('/tools command', () => {
    it('should list tools', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockTools = [
        { name: 'read', description: 'Read file', parameters: {} },
        { name: 'bash', description: 'Run bash', parameters: {} },
      ];
      const ttyApi = {
        getRl: () => ({ prompt: vi.fn() }),
        getRuntime: () => ({ session: { getTools: vi.fn(() => mockTools), getActiveTools: vi.fn(() => ['read']) } }),
      } as any;
      await processor.execute(ttyApi, 'tools', []);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Tools:'));
    });

    it('should enable tool', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const setActiveTools = vi.fn().mockResolvedValue(undefined);
      const ttyApi = {
        getRl: () => ({ prompt: vi.fn() }),
        getRuntime: () => ({ session: { getActiveTools: vi.fn(() => []), setActiveTools } }),
      } as any;
      await processor.execute(ttyApi, 'tools', ['enable', 'read']);
      expect(setActiveTools).toHaveBeenCalledWith(['read']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Enabled tool: read'));
    });

    it('should disable tool', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const setActiveTools = vi.fn().mockResolvedValue(undefined);
      const ttyApi = {
        getRl: () => ({ prompt: vi.fn() }),
        getRuntime: () => ({ session: { getActiveTools: vi.fn(() => ['read', 'bash']), setActiveTools } }),
      } as any;
      await processor.execute(ttyApi, 'tools', ['disable', 'read']);
      expect(setActiveTools).toHaveBeenCalledWith(['bash']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Disabled tool: read'));
    });
  });

  describe('/compact command', () => {
    it('should trigger compaction', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const compact = vi.fn().mockResolvedValue(undefined);
      const ttyApi = {
        getRl: () => ({ prompt: vi.fn() }),
        getRuntime: () => ({ session: { compact } }),
      } as any;
      await processor.execute(ttyApi, 'compact', []);
      expect(compact).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Compaction complete'));
    });

    it('should handle compaction failure', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const compact = vi.fn().mockRejectedValue(new Error('fail'));
      const ttyApi = {
        getRl: () => ({ prompt: vi.fn() }),
        getRuntime: () => ({ session: { compact } }),
      } as any;
      await processor.execute(ttyApi, 'compact', []);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Compaction failed'));
    });
  });

  describe('/theme command', () => {
    it('should list themes', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const ttyApi = {
        getRl: () => ({ prompt: vi.fn() }),
        config: {},
      } as any;
      await processor.execute(ttyApi, 'theme', []);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Available themes'));
    });

    it('should set theme', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockConfig = { set: vi.fn() };
      const ttyApi = {
        getRl: () => ({ prompt: vi.fn() }),
        config: mockConfig,
        output: { setTheme: vi.fn() },
      } as any;
      await processor.execute(ttyApi, 'theme', ['set', 'matrix']);
      expect(mockConfig.set).toHaveBeenCalledWith('theme', 'matrix');
      expect(ttyApi.output.setTheme).toHaveBeenCalled();
    });
  });

  describe('/settings command', () => {
    it('should list settings', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockConfig = {
        getAll: vi.fn(() => ({ historySize: 1000, persistHistory: true })),
      };
      const ttyApi = {
        getRl: () => ({ prompt: vi.fn() }),
        getRuntime: () => ({}),
        config: mockConfig,
      } as any;
      await processor.execute(ttyApi, 'settings', []);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Settings:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('historySize'));
    });

    it('should set setting', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockConfig = {
        set: vi.fn(),
        getAll: vi.fn(() => ({})),
      };
      const ttyApi = {
        getRl: () => ({ prompt: vi.fn() }),
        getRuntime: () => ({}),
        config: mockConfig,
      } as any;
      await processor.execute(ttyApi, 'settings', ['set', 'historySize', '2000']);
      expect(mockConfig.set).toHaveBeenCalledWith('historySize', 2000);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Set historySize'));
    });

    it('should reset settings', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockConfig = {
        reset: vi.fn(),
        getAll: vi.fn(() => ({})),
      };
      const ttyApi = {
        getRl: () => ({ prompt: vi.fn() }),
        getRuntime: () => ({}),
        config: mockConfig,
      } as any;
      await processor.execute(ttyApi, 'settings', ['reset']);
      expect(mockConfig.reset).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('reset to defaults'));
    });
  });
});
