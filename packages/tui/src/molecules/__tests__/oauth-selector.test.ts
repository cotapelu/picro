import { describe, it, expect, vi } from 'vitest';
import { OauthSelector } from '../oauth-selector';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('OauthSelector', () => {
  const providers = [
    { id: 'google', name: 'Google', authUrl: 'https://google.com', clientId: 'id' },
    { id: 'github', name: 'GitHub', authUrl: 'https://github.com', clientId: 'id' },
  ];

  it('should create', () => { expect(new OauthSelector(providers, 10)).toBeDefined(); });
  it('should render', () => { expect(new OauthSelector(providers, 10).draw(ctx()).length).toBeGreaterThan(0); });
  it('should fit width', () => { const lines = new OauthSelector(providers, 10).draw(ctx(30, 24)); for (const l of lines) expect(l.length).toBeLessThanOrEqual(30); });
  it('should navigate', () => { const s = new OauthSelector(providers, 10); s.setFocus(true); s.keypress(k('ArrowDown')); expect(s.draw(ctx()).join('')).toContain('Google'); });
});