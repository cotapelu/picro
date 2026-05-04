import { describe, it, expect, vi } from 'vitest';
import { ShowImagesSelector } from '../show-images-selector';
import { UserMessageSelector } from '../user-message-selector';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('ShowImagesSelector', () => {
  it('should create', () => { expect(new ShowImagesSelector(10)).toBeDefined(); });
  it('should render', () => { expect(new ShowImagesSelector(10).draw(ctx())).toBeDefined(); });
  it('should fit width', () => { const lines = new ShowImagesSelector(10).draw(ctx(30, 24)); for (const l of lines) expect(l.length).toBeLessThanOrEqual(30); });
});

describe('UserMessageSelector', () => {
  it('should create', () => { expect(new UserMessageSelector([], 10)).toBeDefined(); });
  it('should render', () => { expect(new UserMessageSelector([], 10).draw(ctx())).toBeDefined(); });
  it('should fit width', () => { const lines = new UserMessageSelector([], 10).draw(ctx(30, 24)); for (const l of lines) expect(l.length).toBeLessThanOrEqual(30); });
  it('should navigate', () => { const s = new UserMessageSelector([{id:'1',content:'a'},{id:'2',content:'b'}], 10); s.setFocus(true); s.keypress(k('ArrowDown')); expect(s.draw(ctx()).length).toBeGreaterThan(0); });
});