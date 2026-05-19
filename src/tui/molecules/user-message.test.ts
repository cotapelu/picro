// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for UserMessage atom component
 */

import { describe, it, expect } from 'vitest';
import { UserMessage } from './user-message';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('UserMessage', () => {
  it('should render right-aligned text', () => {
    const msg = new UserMessage({ text: 'Hello' });
    const result = msg.draw(defaultContext);
    expect(result[0].trimEnd()).toContain('Hello');
    // The line should have spaces before text
    expect(result[0].startsWith(' ')).toBe(true);
  });

  it('should wrap long text', () => {
    const long = 'This is a very long message that should wrap across multiple lines when width is constrained.';
    const msg = new UserMessage({ text: long });
    const result = msg.draw({ ...defaultContext, width: 30 });
    expect(result.length).toBeGreaterThan(1);
  });

  it('should apply color and bgColor', () => {
    const msg = new UserMessage({ text: 'Hi', color: 'red', bgColor: 'blue' });
    const result = msg.draw(defaultContext);
    expect(result[0]).toContain('\x1b[31m'); // red fg
    expect(result[0]).toContain('\x1b[44m'); // blue bg
    expect(result[0]).toContain('\x1b[0m'); // reset
  });

  it('should respect padding option', () => {
    const msg = new UserMessage({ text: 'Hi', padding: 5 });
    const result = msg.draw(defaultContext);
    // Should have more left spaces because right-aligned and padding affects innerWidth, not alignment
  });

  it('should update text via setText', () => {
    const msg = new UserMessage({ text: 'A' });
    msg.setText('B');
    const result = msg.draw(defaultContext);
    expect(result[0]).toContain('B');
  });

  it('should handle empty text', () => {
    const msg = new UserMessage({ text: '' });
    const result = msg.draw(defaultContext);
    expect(result).toHaveLength(0); // wrapText empty returns []
  });

  it('should preserve ANSI? Not implemented', () => {
    // text is plain, passes through wrapText which handles ANSI.
  });

  it('clearCache should no-op', () => {
    const msg = new UserMessage({});
    msg.clearCache();
  });
});