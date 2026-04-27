import { describe, it, expect } from 'vitest';
import { Footer, type FooterItem } from '../src/components/footer.js';

describe('Footer', () => {
  it('should render left items', () => {
    const footer = new Footer({
      leftItems: [{ label: 'Status: Ready' }],
    });
    const lines = footer.draw({ width: 60, height: 1 });
    expect(lines[0]).toContain('Status: Ready');
  });

  it('should render right items', () => {
    const footer = new Footer({
      rightItems: [{ label: 'Ctrl+C to exit' }],
    });
    const lines = footer.draw({ width: 60, height: 1 });
    expect(lines[0]).toContain('Ctrl+C to exit');
  });

  it('should render both left and right items', () => {
    const footer = new Footer({
      leftItems: [{ label: 'Left' }],
      rightItems: [{ label: 'Right' }],
    });
    const lines = footer.draw({ width: 60, height: 1 });
    expect(lines[0]).toContain('Left');
    expect(lines[0]).toContain('Right');
  });

  it('should apply key styling', () => {
    const footer = new Footer({
      leftItems: [{ key: 'Enter', label: 'Submit' }],
    });
    const lines = footer.draw({ width: 60, height: 1 });
    // The key should be styled, but we just check presence
    expect(lines[0]).toContain('Enter');
    expect(lines[0]).toContain('Submit');
  });

  it('should update items via setItems', () => {
    const footer = new Footer({ leftItems: [{ label: 'A' }] });
    footer.setItems([{ label: 'B' }]);
    const lines = footer.draw({ width: 20, height: 1 });
    expect(lines[0]).toContain('B');
    expect(lines[0]).not.toContain('A');
  });

  it('should clear cache on clearCache', () => {
    const footer = new Footer();
    expect(() => footer.clearCache()).not.toThrow();
  });
});
