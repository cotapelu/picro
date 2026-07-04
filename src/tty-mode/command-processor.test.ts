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
});
