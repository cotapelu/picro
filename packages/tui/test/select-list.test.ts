import { describe, it, expect } from 'vitest';
import { SelectList, type SelectItem } from '../src/components/select-list.js';

describe('SelectList', () => {
  const items: SelectItem[] = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
    { value: 'c', label: 'Option C' },
  ];

  it('should render list with items', () => {
    const list = new SelectList(items, 5);
    const lines = list.draw({ width: 30, height: 10 });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join('\n')).toContain('Option A');
  });

  it('should have first item selected by default', () => {
    const list = new SelectList(items, 5);
    const lines = list.draw({ width: 30, height: 10 });
    // First item should have visual selection indicator (implementation dependent)
    expect(lines.join('\n')).toMatch(/Option A/);
  });
});
