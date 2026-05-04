import { describe, it, expect, vi } from 'vitest';
import { Form, FormField } from '../form';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('Form', () => {
  const fields: FormField[] = [
    { name: 'username', label: 'Username', type: 'text' },
    { name: 'password', label: 'Password', type: 'password' },
  ];

  it('should create', () => { expect(new Form(fields)).toBeDefined(); });
  it('should render fields', () => { expect(new Form(fields).draw(ctx()).length).toBeGreaterThan(0); });
  it('should fit width', () => { const lines = new Form(fields).draw(ctx(30, 24)); for (const l of lines) expect(l.length).toBeLessThanOrEqual(30); });
  it('should navigate', () => { const f = new Form(fields); f.setFocus(true); f.keypress(k('Tab')); expect(f.draw(ctx()).join('')).toContain('Username'); });
});