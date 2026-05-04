import { describe, it, expect, vi } from 'vitest';
import { SessionSelector, SessionOption } from '../session-selector';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('SessionSelector', () => {
  const sessions: SessionOption[] = [
    { id: 's1', name: 'Session 1', lastActive: Date.now() },
    { id: 's2', name: 'Session 2', lastActive: Date.now() },
  ];

  it('should create', () => { expect(new SessionSelector(sessions, 10)).toBeDefined(); });
  it('should render', () => { expect(new SessionSelector(sessions, 10).draw(ctx()).length).toBeGreaterThan(0); });
  it('should fit width', () => {
    const lines = new SessionSelector(sessions, 10).draw(ctx(30, 24));
    expect(lines.join('').length).toBeLessThanOrEqual(30);
  });
  it('should navigate', () => { const s = new SessionSelector(sessions, 10); s.setFocus(true); s.keypress(k('ArrowDown')); expect(s.draw(ctx()).join('')).toContain('Session'); });
});