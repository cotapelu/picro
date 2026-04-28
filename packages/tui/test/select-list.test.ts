import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SelectList, type SelectItem } from '../src/components/select-list.js';
import { getKeybindings } from '../src/components/keybindings.js';

describe('SelectList', () => {
  beforeAll(() => {
    getKeybindings().setContext('tui.select');
  });

  afterAll(() => {
    getKeybindings().setContext('');
  });

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

  it('should select first item by default and onEnter trigger onSelect with its value', () => {
    const onSelect = vi.fn();
    const list = new SelectList(items, 5, {}, onSelect);
    list.handleKey({ raw: '\r' });
    expect(onSelect).toHaveBeenCalledWith('a');
  });

  it('should move selection down with down arrow', () => {
    const onSelect = vi.fn();
    const list = new SelectList(items, 5, {}, onSelect);
    list.handleKey({ raw: '\x1b[B' });
    list.handleKey({ raw: '\r' });
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('should move selection up with up arrow', () => {
    const onSelect = vi.fn();
    const list = new SelectList(items, 5, {}, onSelect);
    list.handleKey({ raw: '\x1b[A' });
    list.handleKey({ raw: '\r' });
    expect(onSelect).toHaveBeenCalledWith('a');
    // move down then up
    list.handleKey({ raw: '\x1b[B' });
    list.handleKey({ raw: '\x1b[A' });
    onSelect.mockClear();
    list.handleKey({ raw: '\r' });
    expect(onSelect).toHaveBeenCalledWith('a');
  });

  it('should call onCancel when Escape is pressed', () => {
    const onCancel = vi.fn();
    const list = new SelectList(items, 5, {}, undefined, onCancel);
    list.handleKey({ raw: '\x1b' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('should filter items on type', () => {
    const moreItems: SelectItem[] = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
      { value: 'g', label: 'Gamma' },
      { value: 'd', label: 'Delta' },
    ];
    const list = new SelectList(moreItems, 5);
    list.handleKey({ raw: 'a', name: 'a' });
    let output = list.draw({ width: 30, height: 10 }).join('\n');
    expect(output).toContain('Alpha');
    list.handleKey({ raw: 'b', name: 'b' });
    output = list.draw({ width: 30, height: 10 }).join('\n');
    expect(output).toContain('No matches');
  });

  it('should clear filter on Backspace', () => {
    const list = new SelectList(items, 5);
    list.handleKey({ raw: 'a', name: 'a' });
    let output = list.draw({ width: 30, height: 10 }).join('\n');
    expect(output).toContain('Option A');
    list.handleKey({ raw: '\x7f', name: 'Backspace' });
    output = list.draw({ width: 30, height: 10 }).join('\n');
    expect(output).toContain('Option B');
    expect(output).toContain('Option C');
  });

  it('should toggle selection in multi-select mode with Space', () => {
    const list = new SelectList(items, 5);
    list.setMultiSelect(true);
    // Toggle first item (selectedIndex starts at 0)
    list.handleKey({ raw: ' ' });
    let selected = list.getSelectedIndices();
    expect(selected).toContain(0);
    // Move to next item and toggle
    list.handleKey({ raw: '\x1b[B' });
    list.handleKey({ raw: ' ' });
    selected = list.getSelectedIndices();
    expect(selected).toHaveLength(2);
    expect(selected).toEqual(expect.arrayContaining([0, 1]));
    // Toggle again to deselect current
    list.handleKey({ raw: ' ' });
    selected = list.getSelectedIndices();
    expect(selected).toHaveLength(1);
    expect(selected).toContain(0);
  });

  it('should scroll when selection goes beyond visible rows', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ value: `x${i}`, label: `Item ${i}` }));
    const list = new SelectList(many, 5);
    list.setSelectedIndex(19);
    const lines = list.draw({ width: 30, height: 10 });
    const text = lines.join('\n');
    expect(text).toContain('Item 19');
    expect(text).not.toContain('Item 0');
  });

  it('setSelectedIndex should update selection for confirm', () => {
    const onSelect = vi.fn();
    const list = new SelectList(items, 5, {}, onSelect);
    list.setSelectedIndex(2);
    list.handleKey({ raw: '\r' });
    expect(onSelect).toHaveBeenCalledWith('c');
  });
});
