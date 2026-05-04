import { describe, it, expect, vi } from 'vitest';
import { SettingsList, SettingsItem } from '../settings-list';
import { KeybindingHints } from '../keybinding-hints';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('SettingsList', () => {
  const items: SettingsItem[] = [
    { id: 'theme', label: 'Theme', type: 'select', value: 'dark' },
    { id: 'font', label: 'Font Size', type: 'number', value: '14' },
  ];

  it('should create', () => { expect(new SettingsList(items, 10)).toBeDefined(); });
  it('should render items', () => { expect(new SettingsList(items, 10).draw(ctx()).length).toBeGreaterThan(0); });
  it('should fit width', () => { const lines = new SettingsList(items, 10).draw(ctx(30, 24)); for (const l of lines) expect(l.length).toBeLessThanOrEqual(30); });
  it('should navigate', () => { const s = new SettingsList(items, 10); s.setFocus(true); s.keypress(k('ArrowDown')); expect(s.draw(ctx()).join('')).toContain('Theme'); });
});

describe('KeybindingHints', () => {
  it('should create', () => { expect(new KeybindingHints()).toBeDefined(); });
  it('should render hints', () => { expect(new KeybindingHints().render('test', [])).toBeDefined(); });
});