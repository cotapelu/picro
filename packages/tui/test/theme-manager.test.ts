import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeManager } from '../src/components/themes.js';
import { darkTheme, lightTheme, highContrastTheme } from '../src/components/themes.js';

describe('ThemeManager', () => {
  beforeEach(() => {
    // Reset to dark theme before each test by re-getting? The singleton persists across tests.
    // We can set to dark to have known state.
    ThemeManager.getInstance().setTheme('dark');
  });

  it('should return singleton instance', () => {
    const tm1 = ThemeManager.getInstance();
    const tm2 = ThemeManager.getInstance();
    expect(tm1).toBe(tm2);
  });

  it('should set theme by name', () => {
    const tm = ThemeManager.getInstance();
    tm.setTheme('light');
    // Check via fg method: light theme primary color is \x1b[38;5;25m
    const colored = tm.fg('primary', 'test');
    expect(colored).toContain('\x1b[38;5;25m');
  });

  it('should set custom theme object', () => {
    const tm = ThemeManager.getInstance();
    const custom = { ...darkTheme, primary: '\x1b[31m' };
    tm.setTheme(custom);
    const colored = tm.fg('primary', 'test');
    expect(colored).toContain('\x1b[31m');
  });

  it('should notify listeners on theme change', () => {
    const tm = ThemeManager.getInstance();
    const listener = vi.fn();
    const unsubscribe = tm.onChange(listener);
    // Initial call not invoked
    expect(listener).not.toHaveBeenCalled();
    // Change theme
    tm.setTheme('light');
    expect(listener).toHaveBeenCalledWith(lightTheme);
    // Unsubscribe
    unsubscribe();
    tm.setTheme('dark');
    expect(listener).toHaveBeenCalledTimes(1); // no additional call
  });

  it('should apply background via bg method', () => {
    const tm = ThemeManager.getInstance();
    tm.setTheme('dark');
    const colored = tm.bg('background', 'text');
    // dark background is \x1b[48;5;235m
    expect(colored).toContain('\x1b[48;5;235m');
    // It should also reset at end
    expect(colored).toContain('\x1b[0m');
  });

  it('should handle unknown theme name by falling back to dark', () => {
    const tm = ThemeManager.getInstance();
    tm.setTheme('unknown' as any); // force unknown
    // Should still have dark theme properties
    const colored = tm.fg('primary', 'test');
    // dark primary is \x1b[38;5;111m
    expect(colored).toContain('\x1b[38;5;111m');
  });
});
