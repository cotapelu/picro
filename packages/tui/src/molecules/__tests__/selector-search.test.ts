import { describe, it, expect, vi } from 'vitest';
import { SessionSelectorSearch } from '../session-selector-search';
import { ScopedModelsSelector } from '../scoped-models-selector';
import { SettingsSelector } from '../settings-selector';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('SessionSelectorSearch', () => {
  it('should create', () => { expect(new SessionSelectorSearch()).toBeDefined(); });
  it('should render', () => { expect(new SessionSelectorSearch().draw(ctx())).toBeDefined(); });
  it('should fit width', () => { const lines = new SessionSelectorSearch().draw(ctx(30, 24)); for (const l of lines) expect(l.length).toBeLessThanOrEqual(30); });
});

describe('ScopedModelsSelector', () => {
  it('should create', () => { expect(new ScopedModelsSelector([], '')).toBeDefined(); });
  it('should render', () => { expect(new ScopedModelsSelector([], '').draw(ctx())).toBeDefined(); });
  it('should fit width', () => { const lines = new ScopedModelsSelector([], '').draw(ctx(30, 24)); for (const l of lines) expect(l.length).toBeLessThanOrEqual(30); });
});

describe('SettingsSelector', () => {
  it('should create', () => { expect(new SettingsSelector([], '')).toBeDefined(); });
  it('should render', () => { expect(new SettingsSelector([], '').draw(ctx())).toBeDefined(); });
  it('should fit width', () => { const lines = new SettingsSelector([], '').draw(ctx(30, 24)); for (const l of lines) expect(l.length).toBeLessThanOrEqual(30); });
});