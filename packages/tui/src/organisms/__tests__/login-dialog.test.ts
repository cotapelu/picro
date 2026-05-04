import { describe, it, expect, vi } from 'vitest';
import { LoginDialog, LoginProvider } from '../login-dialog';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('LoginDialog', () => {
  const providers: LoginProvider[] = [
    { id: 'google', name: 'Google', authUrl: 'https://google.com', cliCallbackUrl: 'http://localhost' },
    { id: 'github', name: 'GitHub', authUrl: 'https://github.com', cliCallbackUrl: 'http://localhost' },
  ];

  describe('Constructor', () => {
    it('should create login dialog', () => {
      const dialog = new LoginDialog(providers);
      expect(dialog).toBeDefined();
    });
  });

  describe('draw', () => {
    it('should render providers', () => {
      const dialog = new LoginDialog(providers);
      const lines = dialog.draw(ctx());
      expect(lines.join('')).toContain('Google');
    });

    it('should fit width', () => {
      const dialog = new LoginDialog(providers);
      const lines = dialog.draw(ctx(30, 24));
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(30);
      }
    });

    it('should show title', () => {
      const dialog = new LoginDialog(providers);
      const lines = dialog.draw(ctx());
      expect(lines.join('')).toContain('Login');
    });
  });

  describe('keyboard', () => {
    it('should navigate providers', () => {
      const dialog = new LoginDialog(providers);
      dialog.setFocus(true);
      dialog.keypress(k('ArrowDown'));
      const lines = dialog.draw(ctx());
      expect(lines.join('')).toContain('GitHub');
    });

    it('should close with Escape', () => {
      const onClose = vi.fn();
      const dialog = new LoginDialog(providers, { onClose });
      dialog.setFocus(true);
      dialog.keypress(k('Escape'));
      expect(onClose).toHaveBeenCalled();
    });
  });
});