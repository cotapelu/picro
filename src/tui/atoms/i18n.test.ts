// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for i18n atom
 */

import { describe, it, expect } from 'vitest';
import { I18n, defaultEnglish } from './i18n';

describe('I18n', () => {
  describe('constructor', () => {
    it('should default to en locale', () => {
      const i18n = new I18n();
      expect(i18n.getLocale()).toBe('en');
    });

    it('should register en with defaultEnglish', () => {
      // Already registered in constructor
      const i18n = new I18n();
      expect(i18n.t('ok')).toBe('OK');
    });
  });

  describe('register()', () => {
    it('should add new locale', () => {
      const i18n = new I18n();
      i18n.register('fr', { ok: 'D\'accord' });
      expect(i18n.t('ok', {}, 'fr')).toBe('D\'accord');
    });

    it('should merge with fallback', () => {
      const i18n = new I18n();
      i18n.register('es', { cancel: 'Cancelar' });
      // ok still from fallback
      expect(i18n.t('ok', {}, 'es')).toBe('OK');
    });
  });

  describe('setLocale()', () => {
    it('should change current locale', () => {
      const i18n = new I18n();
      i18n.register('de', { ok: 'OK' });
      i18n.setLocale('de');
      expect(i18n.getLocale()).toBe('de');
    });

    it('should fallback to en if locale not registered', () => {
      const i18n = new I18n();
      i18n.setLocale('nonexistent');
      expect(i18n.getLocale()).toBe('en');
    });
  });

  describe('t()', () => {
    it('should translate known key', () => {
      const i18n = new I18n();
      expect(i18n.t('loading')).toBe('Loading...');
    });

    it('should fallback to key if missing', () => {
      const i18n = new I18n();
      expect(i18n.t('missing.key')).toBe('missing.key');
    });

    it('should support positional arguments', () => {
      const i18n = new I18n();
      // Not in default, but test interpolation: key -> msg with {0}
      i18n.register('test', { greeting: 'Hello {0}, you have {1} messages' });
      const result = i18n.t('greeting', 'Alice', 5, 'test');
      expect(result).toBe('Hello Alice, you have 5 messages');
    });

    it('should ignore extra args', () => {
      const i18n = new I18n();
      i18n.register('test', { ok: 'OK' });
      expect(i18n.t('ok', 'extra', 'test')).toBe('OK');
    });
  });

  describe('getAvailableLocales()', () => {
    it('should list registered locales', () => {
      const i18n = new I18n();
      i18n.register('fr', {});
      i18n.register('es', {});
      expect(i18n.getAvailableLocales()).toContain('en');
      expect(i18n.getAvailableLocales()).toContain('fr');
    });
  });
});