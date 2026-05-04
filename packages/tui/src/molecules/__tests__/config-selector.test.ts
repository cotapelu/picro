import { describe, it, expect, vi } from 'vitest';
import { ConfigSelector, ConfigOption } from '../config-selector';
import { ExtensionInput } from '../extension-input';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('ConfigSelector', () => {
  const options: ConfigOption[] = [
    { key: 'apiKey', label: 'API Key', type: 'password', value: '' },
    { key: 'model', label: 'Model', type: 'select', value: 'gpt-4' },
  ];

  it('should create', () => { expect(new ConfigSelector(options, 10)).toBeDefined(); });
  it('should render', () => { expect(new ConfigSelector(options, 10).draw(ctx()).length).toBeGreaterThan(0); });
  it('should fit width', () => { const lines = new ConfigSelector(options, 10).draw(ctx(30, 24)); for (const l of lines) expect(l.length).toBeLessThanOrEqual(30); });
  it('should navigate', () => { const s = new ConfigSelector(options, 10); s.setFocus(true); s.keypress(k('ArrowDown')); expect(s.draw(ctx()).join('')).toContain('API'); });
});

describe('ExtensionInput', () => {
  it('should create', () => { expect(new ExtensionInput()).toBeDefined(); });
  it('should render', () => { expect(new ExtensionInput().draw(ctx()).length).toBeGreaterThan(0); });
});