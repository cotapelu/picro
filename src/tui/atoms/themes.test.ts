// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for themes atom
 */

import { describe, it, expect } from 'vitest';
import { darkTheme, lightTheme, highContrastTheme, ThemeManager } from './themes';

describe('themes', () => {
  describe('darkTheme', () => {
    it('should define all required properties', () => {
      expect(darkTheme.primary).toBeDefined();
      expect(darkTheme.background).toBeDefined();
      expect(darkTheme.foreground).toBeDefined();
    });
  });

  describe('lightTheme', () => {
    it('should define all required properties', () => {
      expect(lightTheme.primary).toBeDefined();
      expect(lightTheme.background).toBeDefined();
    });
  });

  describe('highContrastTheme', () => {
    it('should define all required properties', () => {
      expect(highContrastTheme.accent).toBeDefined();
    });
  });

  describe('ThemeManager', () => {
    it('should create singleton', () => {
      const manager = new ThemeManager();
      expect(manager).toBeInstanceOf(ThemeManager);
    });
  });
});