// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for AuthSelectorStatus atom
 */

import { describe, it, expect } from 'vitest';
import { AuthSelectorStatus, type AuthStatusDisplay } from './auth-selector-status';
import type { RenderContext } from './base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('AuthSelectorStatus', () => {
  describe('constructor', () => {
    it('should default to two providers with none status', () => {
      const auth = new AuthSelectorStatus();
      expect(auth['statuses']).toHaveLength(2);
    });

    it('should accept custom statuses', () => {
      const statuses: AuthStatusDisplay[] = [
        { providerId: 'google', status: 'authenticated', email: 'user@example.com' },
      ];
      const auth = new AuthSelectorStatus({ statuses });
      expect(auth['statuses'][0].providerId).toBe('google');
    });
  });

  describe('draw()', () => {
    it('should render a bordered box with title', () => {
      const auth = new AuthSelectorStatus();
      const result = auth.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result.some(l => l.includes('Authentication Status'))).toBe(true);
    });

    it('should display provider status with appropriate icon', () => {
      const statuses: AuthStatusDisplay[] = [
        { providerId: 'anthropic', status: 'authenticated' },
        { providerId: 'openai', status: 'expired' },
        { providerId: 'google', status: 'error' },
        { providerId: 'aws', status: 'none' },
      ];
      const auth = new AuthSelectorStatus({ statuses });
      const result = auth.draw(defaultContext);
      expect(result.some(l => l.includes('✓'))).toBe(true);
      expect(result.some(l => l.includes('⚠'))).toBe(true);
      expect(result.some(l => l.includes('✗'))).toBe(true);
      expect(result.some(l => l.includes('○'))).toBe(true);
    });

    it('should show email if provided', () => {
      const statuses: AuthStatusDisplay[] = [
        { providerId: 'test', status: 'authenticated', email: 'test@example.com' },
      ];
      const auth = new AuthSelectorStatus({ statuses });
      const result = auth.draw(defaultContext);
      expect(result.some(l => l.includes('test@example.com'))).toBe(true);
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      const auth = new AuthSelectorStatus();
      expect(() => auth.clearCache()).not.toThrow();
    });
  });
});