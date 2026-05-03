import { describe, it, expect } from 'vitest';
import { AuthSelectorStatus } from '../auth-selector-status.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('AuthSelectorStatus', () => {
  it('should render default statuses', () => {
    const comp = new AuthSelectorStatus();
    const ctx = createContext(80, 24);
    const result = comp.draw(ctx);

    expect(result.some(l => l.includes('Authentication Status'))).toBe(true);
    expect(result.join('\n')).toContain('anthropic');
    expect(result.join('\n')).toContain('openai');
  });

  it('should render custom statuses', () => {
    const comp = new AuthSelectorStatus({
      statuses: [
        { providerId: 'google', status: 'authenticated', email: 'user@example.com' },
      ],
    });
    const ctx = createContext(80, 24);
    const result = comp.draw(ctx);

    expect(result.join('\n')).toContain('google');
    expect(result.join('\n')).toContain('✓');
  });

  it('should show appropriate icons', () => {
    const comp = new AuthSelectorStatus({
      statuses: [
        { providerId: 'p1', status: 'authenticated' },
        { providerId: 'p2', status: 'expired' },
        { providerId: 'p3', status: 'error' },
        { providerId: 'p4', status: 'none' },
      ],
    });
    const ctx = createContext(80, 24);
    const result = comp.draw(ctx);

    expect(result.join('\n')).toContain('✓');
    expect(result.join('\n')).toContain('⚠');
    expect(result.join('\n')).toContain('✗');
    expect(result.join('\n')).toContain('○');
  });
});
