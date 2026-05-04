import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  KeybindingsManager,
  Keybinding,
  KeybindingDefinitions,
  KeybindingConflict,
  KeybindingsConfig,
  TUI_KEYBINDINGS,
  getKeybindings,
  setKeybindings,
} from '../keybindings';
import { parseKey, matchesKey, type ParsedKey } from '../keys';

// Mock keys module functions
vi.mock('../keys', async () => {
  const actual = await vi.importActual('../keys');
  return {
    ...actual,
    parseKey: vi.fn(),
    matchesKey: vi.fn(),
  };
});

describe('Keybindings Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global manager
    setKeybindings(null as any);
  });

  describe('Interfaces and Types', () => {
    it('should have correct Keybinding shape', () => {
      const binding: Keybinding = {
        id: 'test.id',
        description: 'Test binding',
        defaultKeys: ['ctrl+a'],
        keys: ['ctrl+a'],
        context: 'test',
        enabled: true,
      };
      expect(binding.id).toBe('test.id');
      expect(binding.defaultKeys).toEqual(['ctrl+a']);
      expect(binding.keys).toEqual(['ctrl+a']);
      expect(binding.enabled).toBe(true);
    });

    it('should allow optional fields', () => {
      const minimal: Keybinding = {
        id: 'minimal',
        defaultKeys: ['a'],
        keys: ['a'],
        enabled: true,
      };
      expect(minimal.description).toBeUndefined();
      expect(minimal.context).toBeUndefined();
    });
  });

  describe('Constructor', () => {
    it('should create manager without definitions', () => {
      const manager = new KeybindingsManager();
      expect(manager).toBeInstanceOf(KeybindingsManager);
    });

    it('should create manager with definitions', () => {
      const defs: KeybindingDefinitions = {
        test: [
          {
            id: 'test.one',
            defaultKeys: ['a'],
            keys: ['a'],
            enabled: true,
          },
        ],
      };
      const manager = new KeybindingsManager(defs);
      expect(manager).toBeInstanceOf(KeybindingsManager);
    });

    it('should create manager with initial config', () => {
      const defs: KeybindingDefinitions = {
        test: [
          {
            id: 'test.one',
            defaultKeys: ['a'],
            keys: ['a'],
            enabled: true,
          },
        ],
      };
      const config: KeybindingsConfig = {
        overrides: { 'test.one': 'b' },
        disabled: ['test.two'],
      };
      const manager = new KeybindingsManager(defs, config);
      expect(manager).toBeInstanceOf(KeybindingsManager);
    });
  });

  describe('registerDefinitions', () => {
    it('should register new definitions', () => {
      const manager = new KeybindingsManager();
      const defs: KeybindingDefinitions = {
        ctx1: [
          {
            id: 'binding1',
            defaultKeys: ['a'],
            keys: ['a'],
            enabled: true,
          },
        ],
      };
      manager.registerDefinitions(defs);
      expect(manager.getAllBindings().length).toBe(1);
    });

    it('should merge with existing definitions', () => {
      const defs1: KeybindingDefinitions = {
        ctx1: [
          {
            id: 'binding1',
            defaultKeys: ['a'],
            keys: ['a'],
            enabled: true,
          },
        ],
      };
      const manager = new KeybindingsManager(defs1);

      const defs2: KeybindingDefinitions = {
        ctx1: [
          {
            id: 'binding1',
            defaultKeys: ['a'],
            keys: ['b'], // Different keys
            enabled: true,
          },
        ],
      };
      manager.registerDefinitions(defs2);

      const binding = manager.getBinding('binding1');
      expect(binding?.keys).toEqual(['b']);
    });

    it('should apply context from registration context if not set', () => {
      const defs: KeybindingDefinitions = {
        ctx1: [
          {
            id: 'binding1',
            defaultKeys: ['a'],
            keys: ['a'],
            enabled: true,
            context: undefined,
          },
        ],
      };
      const manager = new KeybindingsManager();
      manager.registerDefinitions(defs);

      const binding = manager.getBinding('binding1');
      expect(binding?.context).toBe('ctx1');
    });

    it('should handle multiple contexts and bindings', () => {
      const defs: KeybindingDefinitions = {
        ctx1: [
          { id: 'b1', defaultKeys: ['a'], keys: ['a'], enabled: true },
          { id: 'b2', defaultKeys: ['b'], keys: ['b'], enabled: true },
        ],
        ctx2: [
          { id: 'b3', defaultKeys: ['c'], keys: ['c'], enabled: true },
        ],
      };
      const manager = new KeybindingsManager();
      manager.registerDefinitions(defs);
      expect(manager.getAllBindings().length).toBe(3);
    });
  });

  describe('Context Management', () => {
    it('should push and pop contexts', () => {
      const manager = new KeybindingsManager();
      manager.pushContext('ctx1');
      manager.pushContext('ctx2');
      expect(manager.getCurrentContext()).toBe('ctx2');
      const popped = manager.popContext();
      expect(popped).toBe('ctx2');
      expect(manager.getCurrentContext()).toBe('ctx1');
    });

    it('should return undefined when popping empty stack', () => {
      const manager = new KeybindingsManager();
      const popped = manager.popContext();
      expect(popped).toBeUndefined();
    });

    it('should set context (replaces entire stack)', () => {
      const manager = new KeybindingsManager();
      manager.pushContext('ctx1');
      manager.pushContext('ctx2');
      manager.setContext('ctx3');
      expect(manager.getCurrentContext()).toBe('ctx3');
      expect(manager.popContext()).toBe('ctx3');
      expect(manager.popContext()).toBeUndefined();
    });

    it('should handle nested context changes', () => {
      const manager = new KeybindingsManager();
      manager.pushContext('base');
      manager.pushContext('modal');
      expect(manager.getCurrentContext()).toBe('modal');
      manager.popContext();
      expect(manager.getCurrentContext()).toBe('base');
    });
  });

  describe('matches', () => {
    let manager: KeybindingsManager;

    beforeEach(() => {
      const defs: KeybindingDefinitions = {
        select: [
          {
            id: 'select.up',
            defaultKeys: ['up', 'k'],
            keys: ['up', 'k'],
            context: 'select',
            enabled: true,
          },
          {
            id: 'select.down',
            defaultKeys: ['down', 'j'],
            keys: ['down', 'j'],
            context: 'select',
            enabled: false,
          },
        ],
      };
      manager = new KeybindingsManager(defs);
    });

    it('should return false for disabled binding', () => {
      const parsed = parseKey('down');
      const result = manager.matches(parsed, 'select.down');
      expect(result).toBe(false);
    });

    it('should return false for non-existent binding', () => {
      const parsed = parseKey('up');
      const result = manager.matches(parsed, 'non.existent');
      expect(result).toBe(false);
    });

    it('should check context when binding has context', () => {
      manager.setContext('select');
      const parsed = parseKey('up');
      const result = manager.matches(parsed, 'select.up');
      expect(result).toBe(true);
    });

    it('should return false when context does not match', () => {
      manager.setContext('editor');
      const parsed = parseKey('up');
      const result = manager.matches(parsed, 'select.up');
      expect(result).toBe(false);
    });

    it('should match against any of the binding keys', () => {
      manager.setContext('select');
      const parsed1 = parseKey('up');
      const parsed2 = parseKey('k');
      expect(manager.matches(parsed1, 'select.up')).toBe(true);
      expect(manager.matches(parsed2, 'select.up')).toBe(true);
    });
  });

  describe('findMatch', () => {
    let manager: KeybindingsManager;

    beforeEach(() => {
      const defs: KeybindingDefinitions = {
        select: [
          { id: 'select.up', defaultKeys: ['up'], keys: ['up'], context: 'select', enabled: true },
          { id: 'select.down', defaultKeys: ['down'], keys: ['down'], context: 'select', enabled: true },
          { id: 'select.confirm', defaultKeys: ['enter'], keys: ['enter'], context: 'select', enabled: true },
        ],
        editor: [
          { id: 'editor.save', defaultKeys: ['ctrl+s'], keys: ['ctrl+s'], context: 'editor', enabled: true },
        ],
      };
      manager = new KeybindingsManager(defs);
    });

    it('should find matching binding by ID', () => {
      manager.setContext('select');
      const result = manager.findMatch('up');
      expect(result).toBe('select.up');
    });

    it('should return null when no match', () => {
      manager.setContext('select');
      const result = manager.findMatch('ctrl+x');
      expect(result).toBeNull();
    });

    it('should filter by context', () => {
      manager.setContext('select');
      const result = manager.findMatch('enter');
      expect(result).toBe('select.confirm');

      const inEditor = manager.findMatch('enter', 'editor');
      expect(inEditor).toBeNull();
    });

    it('should not match disabled bindings', () => {
      manager.setEnabled('select.up', false);
      manager.setContext('select');
      const result = manager.findMatch('up');
      expect(result).toBeNull();
    });

    it('should find matching binding in editor context', () => {
      manager.setContext('editor');
      const result = manager.findMatch('ctrl+s');
      expect(result).toBe('editor.save');
    });
  });

  describe('getBindingsForContext', () => {
    it('should return bindings for specific context', () => {
      const defs: KeybindingDefinitions = {
        select: [
          { id: 'select.up', defaultKeys: ['up'], keys: ['up'], enabled: true },
          { id: 'select.down', defaultKeys: ['down'], keys: ['down'], enabled: true },
        ],
        editor: [
          { id: 'editor.save', defaultKeys: ['ctrl+s'], keys: ['ctrl+s'], enabled: true },
        ],
      };
      const manager = new KeybindingsManager(defs);
      const selectBindings = manager.getBindingsForContext('select');
      expect(selectBindings.length).toBe(2);
      expect(selectBindings.map(b => b.id)).toContain('select.up');
    });

    it('should return empty array for non-existent context', () => {
      const manager = new KeybindingsManager();
      const result = manager.getBindingsForContext('unknown');
      expect(result).toEqual([]);
    });
  });

  describe('getAllBindings', () => {
    it('should return all registered bindings', () => {
      const defs: KeybindingDefinitions = {
        ctx1: [
          { id: 'b1', defaultKeys: ['a'], keys: ['a'], enabled: true },
        ],
        ctx2: [
          { id: 'b2', defaultKeys: ['b'], keys: ['b'], enabled: true },
        ],
      };
      const manager = new KeybindingsManager(defs);
      const all = manager.getAllBindings();
      expect(all.length).toBe(2);
    });

    it('should return empty array when no bindings registered', () => {
      const manager = new KeybindingsManager();
      expect(manager.getAllBindings()).toEqual([]);
    });
  });

  describe('getBinding', () => {
    it('should return binding by ID', () => {
      const defs: KeybindingDefinitions = {
        test: [
          { id: 'test.binding', defaultKeys: ['a'], keys: ['a'], enabled: true },
        ],
      };
      const manager = new KeybindingsManager(defs);
      const binding = manager.getBinding('test.binding');
      expect(binding?.id).toBe('test.binding');
    });

    it('should return undefined for non-existent ID', () => {
      const manager = new KeybindingsManager();
      expect(manager.getBinding('unknown')).toBeUndefined();
    });
  });

  describe('setBinding', () => {
    it('should update binding keys', () => {
      const defs: KeybindingDefinitions = {
        test: [
          { id: 'test.binding', defaultKeys: ['a'], keys: ['a'], enabled: true },
        ],
      };
      const manager = new KeybindingsManager(defs);
      manager.setBinding('test.binding', ['b', 'c']);
      const binding = manager.getBinding('test.binding');
      expect(binding?.keys).toEqual(['b', 'c']);
    });

    it('should accept single key as string', () => {
      const defs: KeybindingDefinitions = {
        test: [
          { id: 'test.binding', defaultKeys: ['a'], keys: ['a'], enabled: true },
        ],
      };
      const manager = new KeybindingsManager(defs);
      manager.setBinding('test.binding', 'x');
      const binding = manager.getBinding('test.binding');
      expect(binding?.keys).toEqual(['x']);
    });

    it('should do nothing for non-existent binding', () => {
      const manager = new KeybindingsManager();
      expect(() => manager.setBinding('unknown', 'a')).not.toThrow();
    });
  });

  describe('setEnabled', () => {
    it('should enable a binding', () => {
      const defs: KeybindingDefinitions = {
        test: [
          { id: 'test.binding', defaultKeys: ['a'], keys: ['a'], enabled: false },
        ],
      };
      const manager = new KeybindingsManager(defs);
      manager.setEnabled('test.binding', true);
      expect(manager.getBinding('test.binding')?.enabled).toBe(true);
    });

    it('should disable a binding', () => {
      const defs: KeybindingDefinitions = {
        test: [
          { id: 'test.binding', defaultKeys: ['a'], keys: ['a'], enabled: true },
        ],
      };
      const manager = new KeybindingsManager(defs);
      manager.setEnabled('test.binding', false);
      expect(manager.getBinding('test.binding')?.enabled).toBe(false);
    });

    it('should do nothing for non-existent binding', () => {
      const manager = new KeybindingsManager();
      expect(() => manager.setEnabled('unknown', false)).not.toThrow();
    });
  });

  describe('findConflicts', () => {
    it('should detect key conflicts in same context', () => {
      const defs: KeybindingDefinitions = {
        select: [
          { id: 'select.up', defaultKeys: ['up'], keys: ['up'], context: 'select', enabled: true },
          { id: 'select.down', defaultKeys: ['down'], keys: ['up'], context: 'select', enabled: true }, // Conflict!
        ],
      };
      const manager = new KeybindingsManager(defs);
      const conflicts = manager.findConflicts();
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].key).toBe('up');
    });

    it('should not flag conflicts across different contexts', () => {
      const defs: KeybindingDefinitions = {
        select: [
          { id: 'select.up', defaultKeys: ['up'], keys: ['up'], context: 'select', enabled: true },
        ],
        editor: [
          { id: 'editor.up', defaultKeys: ['up'], keys: ['up'], context: 'editor', enabled: true },
        ],
      };
      const manager = new KeybindingsManager(defs);
      const conflicts = manager.findConflicts();
      expect(conflicts.length).toBe(0);
    });

    it('should not flag conflicts with disabled bindings', () => {
      const defs: KeybindingDefinitions = {
        select: [
          { id: 'select.up', defaultKeys: ['up'], keys: ['up'], context: 'select', enabled: true },
          { id: 'select.down', defaultKeys: ['down'], keys: ['up'], context: 'select', enabled: false },
        ],
      };
      const manager = new KeybindingsManager(defs);
      const conflicts = manager.findConflicts();
      expect(conflicts.length).toBe(0);
    });

    it('should detect multi-key conflicts', () => {
      const defs: KeybindingDefinitions = {
        select: [
          { id: 'select.a', defaultKeys: ['a', 'b'], keys: ['a', 'b'], context: 'select', enabled: true },
          { id: 'select.b', defaultKeys: ['c', 'd'], keys: ['b', 'c'], context: 'select', enabled: true }, // 'b' conflicts
        ],
      };
      const manager = new KeybindingsManager(defs);
      const conflicts = manager.findConflicts();
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const defs: KeybindingDefinitions = {
        select: [
          { id: 'select.up', defaultKeys: ['UP'], keys: ['UP'], context: 'select', enabled: true },
          { id: 'select.down', defaultKeys: ['down'], keys: ['up'], context: 'select', enabled: true },
        ],
      };
      const manager = new KeybindingsManager(defs);
      const conflicts = manager.findConflicts();
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('should return empty array when no bindings', () => {
      const manager = new KeybindingsManager();
      expect(manager.findConflicts()).toEqual([]);
    });
  });

  describe('loadConfig', () => {
    it('should apply key overrides', () => {
      const defs: KeybindingDefinitions = {
        select: [
          { id: 'select.up', defaultKeys: ['up'], keys: ['up'], context: 'select', enabled: true },
        ],
      };
      const manager = new KeybindingsManager(defs);
      manager.loadConfig({
        overrides: { 'select.up': 'ctrl+up' },
      });
      expect(manager.getBinding('select.up')?.keys).toEqual(['ctrl+up']);
    });

    it('should apply array overrides', () => {
      const defs: KeybindingDefinitions = {
        select: [
          { id: 'select.up', defaultKeys: ['up'], keys: ['up'], context: 'select', enabled: true },
        ],
      };
      const manager = new KeybindingsManager(defs);
      manager.loadConfig({
        overrides: { 'select.up': ['up', 'k'] },
      });
      expect(manager.getBinding('select.up')?.keys).toEqual(['up', 'k']);
    });

    it('should apply disabled list', () => {
      const defs: KeybindingDefinitions = {
        select: [
          { id: 'select.up', defaultKeys: ['up'], keys: ['up'], context: 'select', enabled: true },
        ],
      };
      const manager = new KeybindingsManager(defs);
      manager.loadConfig({
        disabled: ['select.up'],
      });
      expect(manager.getBinding('select.up')?.enabled).toBe(false);
    });

    it('should combine overrides and disabled', () => {
      const defs: KeybindingDefinitions = {
        select: [
          { id: 'select.up', defaultKeys: ['up'], keys: ['up'], context: 'select', enabled: true },
          { id: 'select.down', defaultKeys: ['down'], keys: ['down'], context: 'select', enabled: true },
        ],
      };
      const manager = new KeybindingsManager(defs);
      manager.loadConfig({
        overrides: { 'select.up': 'ctrl+up' },
        disabled: ['select.down'],
      });
      expect(manager.getBinding('select.up')?.keys).toEqual(['ctrl+up']);
      expect(manager.getBinding('select.down')?.enabled).toBe(false);
    });
  });

  describe('exportConfig', () => {
    it('should export overrides and disabled settings', () => {
      const defs: KeybindingDefinitions = {
        select: [
          { id: 'select.up', defaultKeys: ['up'], keys: ['up'], context: 'select', enabled: true },
          { id: 'select.down', defaultKeys: ['down'], keys: ['down'], context: 'select', enabled: true },
        ],
      };
      const manager = new KeybindingsManager(defs);
      manager.setBinding('select.up', ['ctrl+up']);
      manager.setEnabled('select.down', false);

      const config = manager.exportConfig();
      expect(config.overrides?.['select.up']).toEqual(['ctrl+up']);
      expect(config.disabled).toContain('select.down');
    });

    it('should not export unchanged bindings', () => {
      const defs: KeybindingDefinitions = {
        select: [
          { id: 'select.up', defaultKeys: ['up'], keys: ['up'], context: 'select', enabled: true },
        ],
      };
      const manager = new KeybindingsManager(defs);
      const config = manager.exportConfig();
      expect(config.overrides).toBeUndefined();
      expect(config.disabled).toBeUndefined();
    });

    it('should export single key as string not array', () => {
      const defs: KeybindingDefinitions = {
        select: [
          { id: 'select.up', defaultKeys: ['up'], keys: ['up'], context: 'select', enabled: true },
        ],
      };
      const manager = new KeybindingsManager(defs);
      manager.setBinding('select.up', 'ctrl+up');
      const config = manager.exportConfig();
      expect(config.overrides?.['select.up']).toBe('ctrl+up');
    });
  });

  describe('TUI_KEYBINDINGS', () => {
    it('should have default select keybindings', () => {
      expect(TUI_KEYBINDINGS['tui.select']).toBeDefined();
      const select = TUI_KEYBINDINGS['tui.select'];
      expect(select.length).toBeGreaterThan(0);
    });

    it('should have default editor keybindings', () => {
      expect(TUI_KEYBINDINGS['tui.editor']).toBeDefined();
      const editor = TUI_KEYBINDINGS['tui.editor'];
      expect(editor.length).toBeGreaterThan(0);
    });

    it('should include expected default keys', () => {
      const select = TUI_KEYBINDINGS['tui.select'];
      const up = select.find(b => b.id === 'tui.select.up');
      const down = select.find(b => b.id === 'tui.select.down');
      expect(up?.defaultKeys).toContain('up');
      expect(up?.defaultKeys).toContain('k');
      expect(down?.defaultKeys).toContain('down');
      expect(down?.defaultKeys).toContain('j');
    });

    it('should all have proper structure', () => {
      for (const ctx of Object.values(TUI_KEYBINDINGS)) {
        for (const binding of ctx) {
          expect(binding.id).toBeDefined();
          expect(binding.defaultKeys).toBeDefined();
          expect(Array.isArray(binding.defaultKeys)).toBe(true);
          expect(binding.keys).toBeDefined();
          expect(binding.enabled).toBeDefined();
        }
      }
    });
  });

  describe('Global Manager', () => {
    it('getKeybindings should return singleton', () => {
      const mgr1 = getKeybindings();
      const mgr2 = getKeybindings();
      expect(mgr1).toBe(mgr2);
    });

    it('setKeybindings should replace global instance', () => {
      const custom = new KeybindingsManager();
      setKeybindings(custom);
      expect(getKeybindings()).toBe(custom);
    });

    it('should initialize with TUI_KEYBINDINGS', () => {
      const mgr = getKeybindings();
      expect(mgr.getAllBindings().length).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle realistic keybinding workflow', () => {
      const defs: KeybindingDefinitions = {
        explorer: [
          { id: 'exp.up', defaultKeys: ['up', 'k'], keys: ['up', 'k'], context: 'explorer', enabled: true },
          { id: 'exp.down', defaultKeys: ['down', 'j'], keys: ['down', 'j'], context: 'explorer', enabled: true },
          { id: 'exp.open', defaultKeys: ['enter'], keys: ['enter'], context: 'explorer', enabled: true },
          { id: 'exp.back', defaultKeys: ['escape'], keys: ['escape'], context: 'explorer', enabled: true },
        ],
      };

      const manager = new KeybindingsManager(defs);
      manager.setContext('explorer');

      // Simulate key presses
      expect(manager.findMatch('up')).toBe('exp.up');
      expect(manager.findMatch('k')).toBe('exp.up');
      expect(manager.findMatch('down')).toBe('exp.down');
      expect(manager.findMatch('j')).toBe('exp.down');
      expect(manager.findMatch('enter')).toBe('exp.open');
      expect(manager.findMatch('escape')).toBe('exp.back');
      expect(manager.findMatch('space')).toBeNull();
    });

    it('should handle user customization workflow', () => {
      const defs: KeybindingDefinitions = {
        editor: [
          { id: 'editor.save', defaultKeys: ['ctrl+s'], keys: ['ctrl+s'], context: 'editor', enabled: true },
          { id: 'editor.undo', defaultKeys: ['ctrl+z'], keys: ['ctrl+z'], context: 'editor', enabled: true },
        ],
      };

      const manager = new KeybindingsManager(defs);
      manager.loadConfig({
        overrides: {
          'editor.save': 'ctrl+shift+s',
          'editor.undo': 'ctrl+u',
        },
      });

      expect(manager.getBinding('editor.save')?.keys).toEqual(['ctrl+shift+s']);
      expect(manager.getBinding('editor.undo')?.keys).toEqual(['ctrl+u']);

      const exported = manager.exportConfig();
      expect(exported.overrides?.['editor.save']).toBe('ctrl+shift+s');
    });

    it('should detect conflicts after customization', () => {
      const defs: KeybindingDefinitions = {
        select: [
          { id: 'select.up', defaultKeys: ['up'], keys: ['up'], context: 'select', enabled: true },
          { id: 'select.down', defaultKeys: ['down'], keys: ['down'], context: 'select', enabled: true },
        ],
      };

      const manager = new KeybindingsManager(defs);
      manager.setBinding('select.down', 'up'); // Conflict!

      const conflicts = manager.findConflicts();
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].bindingId).toBe('select.up');
      expect(conflicts[0].conflictingWith).toBe('select.down');
    });
  });
});
