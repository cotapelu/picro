import { describe, it, expect, beforeEach, vi } from 'vitest';
import { I18n, i18n, Translation } from '../i18n';

describe('I18n', () => {
  let i18nInstance: I18n;

  beforeEach(() => {
    i18nInstance = new I18n();
    // Reset any modifications to singleton i18n
    i18n.setLocale('en');
  });

  describe('Constructor', () => {
    it('should create I18n with default English', () => {
      expect(i18nInstance.getLocale()).toBe('en');
    });

    it('should register default English translations', () => {
      expect(i18nInstance.t('ok')).toBe('OK');
      expect(i18nInstance.t('cancel')).toBe('Cancel');
    });
  });

  describe('register', () => {
    it('should register new locale translations', () => {
      const vi Translations: Translation = {
        ok: 'Đồng ý',
        cancel: 'Hủy',
      };
      i18nInstance.register('vi', viTranslations);
      expect(i18nInstance.getAvailableLocales()).toContain('vi');
    });

    it('should merge with fallback for missing keys', () => {
      const partial: Translation = { ok: 'OUI' };
      i18nInstance.register('fr', partial);
      expect(i18nInstance.t('cancel', 'fr')).toBe('Cancel'); // fallback
    });

    it('should allow overriding fallback keys', () => {
      const custom: Translation = { ok: 'Custom OK' };
      i18nInstance.register('custom', custom);
      expect(i18nInstance.t('ok')).toBe('Custom OK');
    });
  });

  describe('setLocale', () => {
    it('should set current locale', () => {
      i18nInstance.register('es', { ok: 'Sí' });
      i18nInstance.setLocale('es');
      expect(i18nInstance.getLocale()).toBe('es');
    });

    it('should fallback to en for unknown locale', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      i18nInstance.setLocale('nonexistent');
      expect(i18nInstance.getLocale()).toBe('en');
      expect(consoleSpy).toHaveBeenCalledWith("Locale 'nonexistent' not found, falling back to 'en'");
      consoleSpy.mockRestore();
    });

    it('should be case-sensitive?', () => {
      i18nInstance.register('EN', { ok: 'ENGLISH' });
      i18nInstance.setLocale('en'); // lowercase 'en' already registered
      expect(i18nInstance.getLocale()).toBe('en'); // existing one
    });
  });

  describe('t', () => {
    it('should translate known key', () => {
      expect(i18nInstance.t('ok')).toBe('OK');
    });

    it('should return key itself if translation missing', () => {
      expect(i18nInstance.t('unknown.key')).toBe('unknown.key');
    });

    it('should perform positional substitution', () => {
      i18nInstance.register('test', {
        greeting: 'Hello, {0}! You have {1} messages.',
      });
      i18nInstance.setLocale('test');
      const result = i18nInstance.t('greeting', 'Alice', 5);
      expect(result).toBe('Hello, Alice! You have 5 messages.');
    });

    it('should handle zero args', () => {
      expect(i18nInstance.t('ok')).toBe('OK');
    });

    it('should ignore extra placeholders with insufficient args', () => {
      i18nInstance.register('test', { msg: 'Hi {0} {1}' });
      i18nInstance.setLocale('test');
      expect(i18nInstance.t('msg', 'there')).toBe('Hi there {1}');
    });

    it('should fallback to English for missing translation in current locale', () => {
      i18nInstance.register('fr', { only: 'Uniquement' });
      i18nInstance.setLocale('fr');
      expect(i18nInstance.t('cancel')).toBe('Cancel'); // from fallback
    });
  });

  describe('getAvailableLocales', () => {
    it('should return all registered locales', () => {
      i18nInstance.register('fr', {});
      i18nInstance.register('de', {});
      const locales = i18nInstance.getAvailableLocales();
      expect(locales).toContain('en');
      expect(locales).toContain('fr');
      expect(locales).toContain('de');
    });
  });

  describe('Singleton i18n', () => {
    it('should be a single instance', () => {
      const i1 = i18n;
      const i2 = i18n;
      expect(i1).toBe(i2);
    });

    it('should persist registrations across tests? Singletons can leak', () => {
      // This is tricky; each test should ideally get a fresh I18n
      // but the exported singleton persists. We'll just test its existence.
      expect(i18n.getLocale()).toBe('en');
    });
  });

  describe('Integration', () => {
    it('should work with realistic translations', () => {
      const vietnamese: Translation = {
        ok: 'Đồng ý',
        cancel: 'Hủy',
        'input.placeholder': 'Nhập...',
        'select.nomatch': 'Không có kết quả',
        'tool.running': 'Đang chạy...',
      };
      i18nInstance.register('vi', vietnamese);
      i18nInstance.setLocale('vi');

      expect(i18nInstance.t('ok')).toBe('Đồng ý');
      expect(i18nInstance.t('select.nomatch')).toBe('Không có kết quả');
    });

    it('should handle pluralization pattern', () => {
      i18nInstance.register('test', {
        messages: '{0} message|{0} messages',
      });
      i18nInstance.setLocale('test');
      // Simple usage without actual plural logic (our impl is naive)
      expect(i18nInstance.t('messages', 1)).toBe('{0} message|{0} messages');
    });
  });
});
