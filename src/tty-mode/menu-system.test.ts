import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MenuSystem } from './menu-system.js';
import { InputHandler } from './components/input-handler.js';

describe('MenuSystem', () => {
  let input: InputHandler;
  let menu: MenuSystem;
  let mockWrite: vi.Mock;

  beforeEach(() => {
    mockWrite = vi.fn();
    vi.stubGlobal('process', {
      stdout: { write: mockWrite },
    });
    input = new InputHandler();
    menu = new MenuSystem(input);
  });

  it('should render menu items and prompt', () => {
    const items = [
      { id: '1', label: 'First' },
      { id: '2', label: 'Second' },
    ];
    menu.show(items, vi.fn());
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('=== Menu ==='));
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('> First'));
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('  Second'));
  });

  it('should navigate down', () => {
    const items = [
      { id: '1', label: 'A' },
      { id: '2', label: 'B' },
      { id: '3', label: 'C' },
    ];
    menu.show(items, vi.fn());
    // simulate down key
    menu['handleKey']({ name: 'down', sequence: '\x1b[B' }, undefined);
    // second item selected
    expect(menu['selectedIndex']).toBe(1);
  });

  it('should navigate up', () => {
    const items = [
      { id: '1', label: 'A' },
      { id: '2', label: 'B' },
      { id: '3', label: 'C' },
    ];
    menu.show(items, vi.fn());
    // move down twice
    menu['handleKey']({ name: 'down' }, undefined);
    menu['handleKey']({ name: 'down' }, undefined);
    expect(menu['selectedIndex']).toBe(2);
    // up once
    menu['handleKey']({ name: 'up' }, undefined);
    expect(menu['selectedIndex']).toBe(1);
  });

  it('should not go below 0 or above length-1', () => {
    const items = [
      { id: '1', label: 'A' },
      { id: '2', label: 'B' },
    ];
    menu.show(items, vi.fn());
    menu['handleKey']({ name: 'up' }, undefined);
    expect(menu['selectedIndex']).toBe(0);
    menu['handleKey']({ name: 'down' }, undefined);
    menu['handleKey']({ name: 'down' }, undefined);
    expect(menu['selectedIndex']).toBe(1);
  });

  it('should call onSelect with selected item on return', () => {
    const items = [
      { id: '1', label: 'A' },
      { id: '2', label: 'B' },
    ];
    const onSelect = vi.fn();
    menu.show(items, onSelect);
    // move to second
    menu['handleKey']({ name: 'down' }, undefined);
    menu['handleKey']({ name: 'return' }, undefined);
    expect(onSelect).toHaveBeenCalledWith(items[1]);
  });

  it('should call onCancel on escape', () => {
    const onCancel = vi.fn();
    menu.show([{ id: '1', label: 'A' }], vi.fn(), onCancel);
    menu['handleKey']({ name: 'escape' }, undefined);
    expect(onCancel).toHaveBeenCalled();
  });

  it('should unsubscribe on close', () => {
    const unsub = vi.fn();
    vi.spyOn(input, 'onKeypress').mockReturnValue(unsub);
    menu.show([{ id: '1', label: 'A' }], vi.fn());
    menu.close();
    expect(unsub).toHaveBeenCalled();
  });
});
