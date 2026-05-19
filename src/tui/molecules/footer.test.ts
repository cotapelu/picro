// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for Footer atom component (additional)
 */

import { describe, it, expect } from 'vitest';
import { Footer } from './footer';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('Footer', () => {
  it('should render with left and right items', () => {
    const footer = new Footer({
      leftItems: [{ label: 'Left' }],
      rightItems: [{ label: 'Right' }],
    });
    const result = footer.draw(defaultContext);
    expect(result.some(l => l.includes('Left'))).toBe(true);
    expect(result.some(l => l.includes('Right'))).toBe(true);
  });

  it('should handle no items', () => {
    const footer = new Footer({});
    const result = footer.draw(defaultContext);
    expect(result).toBeDefined();
  });

  it('should apply default theme if none provided', () => {
    const footer = new Footer({ leftItems: [{ label: 'X' }] });
    expect(footer['theme']).toBeDefined();
  });

  it('should clearCache no-op', () => {
    const footer = new Footer({});
    expect(() => footer.clearCache()).not.toThrow();
  });

  it('should update status on the right side', () => {
    const footer = new Footer({});
    (footer as any).setStatus('api', 'API: Connected');
    const result = footer.draw(defaultContext);
    expect(result.some(l => l.includes('API: Connected'))).toBe(true);
  });

  it('should clear specific status', () => {
    const footer = new Footer({});
    (footer as any).setStatus('api', 'API: Connected');
    (footer as any).clearStatus('api');
    const result = footer.draw(defaultContext);
    expect(result.some(l => l.includes('API: Connected'))).toBe(false);
  });

  it('should show working message on left', () => {
    const footer = new Footer({});
    (footer as any).setWorkingMessage('Processing...');
    const result = footer.draw(defaultContext);
    expect(result.some(l => l.includes('Processing...'))).toBe(true);
  });

  it('should hide working message when cleared', () => {
    const footer = new Footer({});
    (footer as any).setWorkingMessage('Processing...');
    (footer as any).setWorkingMessage(null);
    const result = footer.draw(defaultContext);
    expect(result.some(l => l.includes('Processing...'))).toBe(false);
  });
});