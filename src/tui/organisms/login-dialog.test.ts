// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for LoginDialog organism component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoginDialog } from './login-dialog';
import type { RenderContext, KeyEvent } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(keyName: string): KeyEvent {
  const keyMap: Record<string, { raw: string; name: string }> = {
    Enter: { raw: '\r', name: 'Enter' },
    Escape: { raw: '\x1b', name: 'Escape' },
    Backspace: { raw: '\x7f', name: 'Backspace' },
  };
  const mapped = keyMap[keyName];
  if (mapped) return { raw: mapped.raw, name: mapped.name, modifiers: {} };
  return { raw: keyName, name: keyName, modifiers: {} };
}

describe('LoginDialog', () => {
  let onSubmit: vi.Mock;
  let onCancel: vi.Mock;
  let dialog: LoginDialog;

  beforeEach(() => {
    onSubmit = vi.fn();
    onCancel = vi.fn();
  });

  describe('constructor', () => {
    it('should create with default provider "anthropic"', () => {
      dialog = new LoginDialog();
      expect(dialog['provider']).toBe('anthropic');
    });

    it('should accept custom provider', () => {
      dialog = new LoginDialog({ provider: 'openai' });
      expect(dialog['provider']).toBe('openai');
    });

    it('should default title to "Login"', () => {
      dialog = new LoginDialog();
      expect(dialog['title']).toBe('Login');
    });

    it('should accept custom title', () => {
      dialog = new LoginDialog({ title: 'API Key' });
      expect(dialog['title']).toBe('API Key');
    });

    it('should set callbacks', () => {
      dialog = new LoginDialog({ onSubmit, onCancel });
      expect(dialog['onSubmit']).toBe(onSubmit);
      expect(dialog['onCancel']).toBe(onCancel);
    });

    it('should initialize isFocused false by default? Actually default false, but often focused when shown.', () => {
      dialog = new LoginDialog();
      expect(dialog.isFocused).toBe(false);
    });

    it('should start with empty apiKey', () => {
      dialog = new LoginDialog();
      expect(dialog.getApiKey()).toBe('');
    });

    it('should start in provider stage', () => {
      dialog = new LoginDialog();
      expect(dialog['stage']).toBe('provider');
    });
  });

  describe('getApiKey() / setApiKey()', () => {
    it('should get current apiKey', () => {
      dialog = new LoginDialog();
      dialog.setApiKey('secret');
      expect(dialog.getApiKey()).toBe('secret');
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      dialog = new LoginDialog({ title: 'Login', provider: 'anthropic' });
    });

    it('should render a bordered box', () => {
      const result = dialog.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result[result.length - 1].startsWith('└')).toBe(true);
    });

    it('should display title centered', () => {
      const result = dialog.draw(defaultContext);
      expect(result.some(line => line.includes(' Login '))).toBe(true);
    });

    it('should display provider', () => {
      const result = dialog.draw(defaultContext);
      expect(result.some(line => line.includes('Provider: anthropic'))).toBe(true);
    });

    it('should show masked key placeholder when not in input stage', () => {
      dialog['stage'] = 'provider';
      const result = dialog.draw(defaultContext);
      expect(result.some(line => line.includes('(press Enter to enter)'))).toBe(true);
    });

    it('should show asterisks for key when in input stage', () => {
      dialog['stage'] = 'input';
      dialog.setApiKey('abcd');
      const result = dialog.draw(defaultContext);
      expect(result.some(line => line.includes('****'))).toBe(true);
    });

    it('should add cursor marker when focused and in input stage', () => {
      dialog.isFocused = true;
      dialog['stage'] = 'input';
      const result = dialog.draw(defaultContext);
      expect(result.some(line => line.includes('\x1b_pi:c\x07'))).toBe(true);
    });

    it('should show help text at bottom', () => {
      const result = dialog.draw(defaultContext);
      expect(result.some(line => line.includes('Enter: submit  Esc: cancel'))).toBe(true);
    });

    it('should fill height with empty lines if needed', () => {
      dialog = new LoginDialog({});
      const result = dialog.draw({ ...defaultContext, height: 30 });
      expect(result.length).toBe(30);
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      dialog = new LoginDialog({ onSubmit, onCancel });
      dialog.isFocused = true;
    });

    it('should advance to input stage on Enter in provider stage', () => {
      expect(dialog['stage']).toBe('provider');
      dialog.handleKey(createKeyEvent('Enter'));
      expect(dialog['stage']).toBe('input');
    });

    it('should submit apiKey on Enter in input stage', () => {
      dialog['stage'] = 'input';
      dialog.setApiKey('mykey');
      dialog.handleKey(createKeyEvent('Enter'));
      expect(onSubmit).toHaveBeenCalledWith('mykey');
    });

    it('should call onCancel on Escape', () => {
      dialog.handleKey(createKeyEvent('Escape'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('should handle backspace to delete key chars', () => {
      dialog['stage'] = 'input';
      dialog.setApiKey('abc');
      dialog.handleKey(createKeyEvent('Backspace'));
      expect(dialog.getApiKey()).toBe('ab');
      dialog.handleKey(createKeyEvent('Backspace'));
      expect(dialog.getApiKey()).toBe('a');
    });

    it('should append printable characters in input stage', () => {
      dialog['stage'] = 'input';
      dialog.handleKey(createKeyEvent('a'));
      dialog.handleKey(createKeyEvent('b'));
      expect(dialog.getApiKey()).toBe('ab');
    });

    it('should ignore non-printable keys in input stage', () => {
      dialog['stage'] = 'input';
      dialog.handleKey(createKeyEvent('\x01')); // Ctrl+A
      expect(dialog.getApiKey()).toBe('');
    });

    it('should not accept input in provider stage', () => {
      dialog.handleKey(createKeyEvent('a'));
      expect(dialog.getApiKey()).toBe('');
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      dialog = new LoginDialog({});
      expect(() => dialog.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty apiKey submission', () => {
      dialog = new LoginDialog({ onSubmit });
      dialog['stage'] = 'input';
      dialog.handleKey(createKeyEvent('Enter'));
      expect(onSubmit).toHaveBeenCalledWith('');
    });

    it('should handle many characters', () => {
      dialog = new LoginDialog({});
      dialog['stage'] = 'input';
      const long = 'a'.repeat(1000);
      for (const ch of long) {
        dialog.handleKey(createKeyEvent(ch));
      }
      expect(dialog.getApiKey().length).toBe(1000);
    });

    it('should handle unicode in apiKey', () => {
      dialog = new LoginDialog({});
      dialog['stage'] = 'input';
      dialog.handleKey(createKeyEvent('😀'));
      expect(dialog.getApiKey()).toBe('😀');
    });

    it('should handle narrow width', () => {
      dialog = new LoginDialog({ title: 'X', provider: 'Y' });
      const result = dialog.draw({ width: 10, height: 5, theme: {} });
      expect(result).toBeDefined();
    });
  });
});