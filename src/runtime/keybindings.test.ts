// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mkdirSync,
  rmdirSync,
  unlinkSync,
  existsSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  KEYBINDINGS,
  KeybindingsManager,
  createKeybindingsManager,
  loadCustomKeybindings,
} from './keybindings';

function createTempDir(): string {
  const dir = join(tmpdir(), `picro-test-${Date.now()}-${Math.random().toString(36).substring(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}
function cleanupTempDir(dir: string) {
  if (existsSync(dir)) {
    rmdirSync(dir, { recursive: true, force: true });
  }
}

describe('KEYBINDINGS', () => {
  it('defines default keys for app.interrupt', () => {
    expect(KEYBINDINGS['app.interrupt'].defaultKeys).toBe('escape');
  });

  it('defines default keys for app.clear', () => {
    expect(KEYBINDINGS['app.clear'].defaultKeys).toBe('ctrl+c');
  });

  it('defines default keys for app.session.new', () => {
    expect(KEYBINDINGS['app.session.new'].defaultKeys).toBe('ctrl+n');
  });

  it('descriptions are provided', () => {
    expect(KEYBINDINGS['app.interrupt'].description).toBe('Cancel or abort');
    expect(KEYBINDINGS['app.session.tree'].description).toBe('Show session tree');
  });

  it('has all required keys with defaultKeys defined', () => {
    const requiredKeys: (keyof typeof KEYBINDINGS)[] = [
      'app.interrupt', 'app.clear', 'app.exit', 'app.suspend',
      'app.thinking.cycle', 'app.model.cycleForward', 'app.model.cycleBackward',
      'app.model.select', 'app.tools.expand', 'app.thinking.toggle',
      'app.session.toggleNamedFilter', 'app.editor.external',
      'app.message.followUp', 'app.message.dequeue',
      'app.clipboard.pasteImage', 'app.session.new', 'app.session.tree',
      'app.session.fork', 'app.session.resume', 'app.tree.foldOrUp',
      'app.tree.unfoldOrDown', 'app.tree.editLabel',
      'app.tree.toggleLabelTimestamp', 'app.session.togglePath',
      'app.session.toggleSort', 'app.session.rename', 'app.session.delete',
      'app.models.save', 'app.models.enableAll', 'app.models.clearAll',
      'app.models.toggleProvider', 'app.tree.filter.default',
      'app.tree.filter.noTools', 'app.tree.filter.userOnly',
      'app.tree.filter.all', 'app.tree.filter.cycleForward',
      'app.tree.filter.cycleBackward',
    ];
    for (const key of requiredKeys) {
      expect(KEYBINDINGS[key]).toBeDefined();
      expect(KEYBINDINGS[key].defaultKeys).toBeDefined();
    }
  });
});

describe('KeybindingsManager', () => {
  let manager: KeybindingsManager;

  beforeEach(() => {
    manager = new KeybindingsManager(KEYBINDINGS);
  });

  it('get returns default binding for known key', () => {
    expect(manager.get('app.interrupt')).toBe(KEYBINDINGS['app.interrupt']);
  });

  it('get returns undefined for unknown key', () => {
    expect(manager.get('unknown')).toBeUndefined();
  });

  it('setCustom overrides default binding', () => {
    const custom = { defaultKeys: 'ctrl+alt+z' as const };
    manager.setCustom('app.interrupt', custom);
    expect(manager.get('app.interrupt')).toBe(custom);
  });

  it('clearCustom removes custom override, reverting to default', () => {
    const original = KEYBINDINGS['app.interrupt'];
    const custom = { defaultKeys: 'ctrl+alt+z' as const };
    manager.setCustom('app.interrupt', custom);
    manager.clearCustom('app.interrupt');
    expect(manager.get('app.interrupt')).toBe(original);
  });

  it('getAll returns all bindings with size equal to default count', () => {
    const all = manager.getAll();
    expect(all.size).toBe(Object.keys(KEYBINDINGS).length);
  });

  it('custom overrides persist in getAll', () => {
    const custom = { defaultKeys: 'ctrl+alt+z' as const };
    manager.setCustom('app.interrupt', custom);
    const all = manager.getAll();
    expect(all.get('app.interrupt')).toBe(custom);
  });

  it('default KEYBINDINGS object remains unchanged after custom set', () => {
    const originalDefault = KEYBINDINGS['app.interrupt'].defaultKeys;
    const custom = { defaultKeys: 'ctrl+alt+z' as const };
    manager.setCustom('app.interrupt', custom);
    expect(KEYBINDINGS['app.interrupt'].defaultKeys).toBe(originalDefault);
  });
});

describe('createKeybindingsManager', () => {
  it('creates manager with default KEYBINDINGS', () => {
    const manager = createKeybindingsManager();
    expect(manager.get('app.interrupt').defaultKeys).toBe('escape');
    expect(manager.get('app.session.new').defaultKeys).toBe('ctrl+n');
  });
});

describe('loadCustomKeybindings', () => {
  let agentDir: string;

  afterEach(() => {
    if (agentDir && existsSync(agentDir)) {
      cleanupTempDir(agentDir);
    }
  });

  it('loads custom keybindings from existing file', () => {
    agentDir = createTempDir();
    const configPath = join(agentDir, 'keybindings.json');
    const content = '{\n  "app.interrupt": { "defaultKeys": "ctrl+alt+z" }\n}';
    writeFileSync(configPath, content, 'utf-8');

    const manager = createKeybindingsManager();
    loadCustomKeybindings(agentDir, manager);

    expect(manager.get('app.interrupt').defaultKeys).toBe('ctrl+alt+z');
    // other keys unchanged
    expect(manager.get('app.clear').defaultKeys).toBe(KEYBINDINGS['app.clear'].defaultKeys);
  });

  it('does nothing if config file does not exist', () => {
    // Use a directory path that doesn't exist
    agentDir = join(tmpdir(), `nonexistent-${Date.now()}`);

    const manager = createKeybindingsManager();
    loadCustomKeybindings(agentDir, manager);

    expect(manager.get('app.interrupt').defaultKeys).toBe(KEYBINDINGS['app.interrupt'].defaultKeys);
  });

  it('handles invalid JSON and warns without throwing', () => {
    agentDir = createTempDir();
    const configPath = join(agentDir, 'keybindings.json');
    const invalidJson = '{ invalid json }';
    writeFileSync(configPath, invalidJson, 'utf-8');

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const manager = createKeybindingsManager();
    expect(() => loadCustomKeybindings(agentDir, manager)).not.toThrow();

    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load keybindings'),
      expect.any(Error)
    );

    // Ensure no custom binding was applied
    expect(manager.get('app.interrupt').defaultKeys).toBe(KEYBINDINGS['app.interrupt'].defaultKeys);

    consoleWarn.mockRestore();
  });

  it('handles partial custom file (only some keys)', () => {
    agentDir = createTempDir();
    const configPath = join(agentDir, 'keybindings.json');
    const partial = '{\n  "app.session.new": { "defaultKeys": "ctrl+alt+n" }\n}';
    writeFileSync(configPath, partial, 'utf-8');

    const manager = createKeybindingsManager();
    loadCustomKeybindings(agentDir, manager);

    expect(manager.get('app.session.new').defaultKeys).toBe('ctrl+alt+n');
    expect(manager.get('app.interrupt').defaultKeys).toBe(KEYBINDINGS['app.interrupt'].defaultKeys);
  });

  // Optional: test that readFileSync throwing is handled. Simulate by creating a file with no read permissions.
  // However, this is platform-specific and may require elevated permissions, so skip for portability.
});
