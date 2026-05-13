/**
 * Internationalization (i18n) support for TUI
 * Simple key-value translation system with fallback.
 */

export interface Translation {
  [key: string]: string;
}

const defaultEnglish: Translation = {
  // Common UI strings
  'ok': 'OK',
  'cancel': 'Cancel',
  'submit': 'Submit',
  'close': 'Close',
  'search': 'Search',
  'loading': 'Loading...',
  'error': 'Error',
  'success': 'Success',
  'warning': 'Warning',
  // Input
  'input.placeholder': 'Type...',
  // SelectList
  'select.nomatch': 'No matches',
  // TreeView
  'tree.expand': '[+]',
  'tree.collapse': '[-]',
  // Misc
  'tool.running': 'Running...',
  'tool.success': 'Completed',
  'tool.error': 'Failed',
};

export class I18n {
  private currentLocale = 'en';
  private translations: Map<string, Translation> = new Map();
  private fallback: Translation = defaultEnglish;

  constructor() {
    this.translations.set('en', defaultEnglish);
  }

  /** Register a translation dictionary for a locale */
  register(locale: string, translations: Translation): void {
    this.translations.set(locale, { ...this.fallback, ...translations });
  }

  /** Set the current locale */
  setLocale(locale: string): void {
    if (this.translations.has(locale)) {
      this.currentLocale = locale;
    } else {
      console.warn(`Locale '${locale}' not found, falling back to 'en'`);
      this.currentLocale = 'en';
    }
  }

  /** Get the current locale */
  getLocale(): string {
    return this.currentLocale;
  }

  /** Translate a key. Falls back to the key itself if missing. */
  t(key: string, ...args: any[]): string {
    // Allow locale override as the last argument if it's a registered locale
    let locale = this.currentLocale;
    let substitutionArgs: any[] = args;
    if (args.length > 0 && typeof args[args.length - 1] === 'string' && this.translations.has(args[args.length - 1])) {
      locale = args[args.length - 1];
      substitutionArgs = args.slice(0, -1);
    }
    const localeData = this.translations.get(locale) || this.fallback;
    let msg = localeData[key] || this.fallback[key] || key;
    // Simple positional substitution: {0}, {1}, ...
    if (substitutionArgs.length > 0) {
      msg = msg.replace(/{(\d+)}/g, (match, index) => {
        const idx = parseInt(index, 10);
        return idx < substitutionArgs.length ? String(substitutionArgs[idx]) : match;
      });
    }
    return msg;
  }

  /** Get all registered locales */
  getAvailableLocales(): string[] {
    return Array.from(this.translations.keys());
  }
}

export const i18n = new I18n();
