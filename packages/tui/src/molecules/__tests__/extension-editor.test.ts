import { describe, it, expect, vi } from 'vitest';
import { ExtensionEditor } from '../extension-editor';
import { Footer } from '../footer';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('ExtensionEditor', () => {
  it('should create', () => { expect(new ExtensionEditor({} as any)).toBeDefined(); });
  it('should render', () => { expect(new ExtensionEditor({ extension: {}, config: {} } as any).draw(ctx()).length).toBeGreaterThan(0); });
  it('should fit width', () => { const lines = new ExtensionEditor({ extension: {}, config: {} } as any).draw(ctx(40, 24)); for (const l of lines) expect(l.length).toBeLessThanOrEqual(40); });
});

describe('Footer', () => {
  it('should create with message', () => { expect(new Footer('Test', { width: 80 })).toBeDefined(); });
  it('should render', () => { expect(new Footer('Test', { width: 80 }).draw(ctx()).length).toBeGreaterThan(0); });
  it('should fit width', () => { const lines = new Footer('Test message', { width: 20 }).draw(ctx(20, 24)); for (const l of lines) expect(l.length).toBeLessThanOrEqual(20); });
});