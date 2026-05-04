import { describe, it, expect, vi } from 'vitest';
import { ExtensionSelector } from '../extension-selector';
import { ExtensionSelectorItem } from '../extension-selector';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('ExtensionSelector', () => {
  const items: ExtensionSelectorItem[] = [
    { id: 'ext1', name: 'Ext 1', description: 'Test', enabled: false },
    { id: 'ext2', name: 'Ext 2', description: 'Test 2', enabled: true },
  ];

  it('should create', () => { expect(new ExtensionSelector(items, 10)).toBeDefined(); });
  it('should render', () => { expect(new ExtensionSelector(items, 10).draw(ctx()).length).toBeGreaterThan(0); });
  it('should fit width', () => { const lines = new ExtensionSelector(items, 10).draw(ctx(30, 24)); for (const l of lines) expect(l.length).toBeLessThanOrEqual(30); });
  it('should navigate', () => { const s = new ExtensionSelector(items, 10); s.setFocus(true); s.keypress(k('ArrowDown')); expect(s.draw(ctx()).join('')).toContain('Ext'); });
});