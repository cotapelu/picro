import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { TerminalUI, KeyEvent } from '@picro/tui';
import { MessageList } from '../src/tui-app.js';

// Minimal mock of TerminalUI with just required methods
function createMockTUI(): TerminalUI {
  return {
    showPanel: vi.fn().mockReturnValue({ close: vi.fn() }),
    requestRender: vi.fn(),
    stop: vi.fn(),
    append: vi.fn(),
    setFocus: vi.fn(),
    addKeyHandler: vi.fn(),
  } as any;
}

const mockTheme = {
  accent: '', green: '', red: '', yellow: '',
  cyan: '', magenta: '', blue: '', dim: '',
  bold: '', reset: '',
};

describe('MessageList', () => {
  let tui: TerminalUI;
  let ml: MessageList;

  beforeEach(() => {
    tui = createMockTUI();
    ml = new MessageList(tui, mockTheme, 10);
  });

  it('should start with empty messages', () => {
    expect(ml['messages']).toHaveLength(0);
    expect(ml.scrollOffset).toBe(0);
  });

  it('setMessages should replace messages and reset scroll', () => {
    const messages = [
      { role: 'user' as const, content: 'Hello', timestamp: new Date() },
      { role: 'assistant' as const, content: 'Hi', timestamp: new Date() },
    ];
    ml.setMessages(messages);
    expect(ml['messages']).toHaveLength(2);
    expect(ml.scrollOffset).toBe(0);
  });

  it('addMessage should append and reset scroll', () => {
    ml.addMessage('user', 'First');
    ml.addMessage('assistant', 'Second');
    expect(ml['messages']).toHaveLength(2);
    expect(ml.scrollOffset).toBe(0);
  });

  it('scroll should update offset within bounds', () => {
    // Setup realistic messages to produce predictable line cache
    ml.setMessages([
      { role: 'user', content: 'Hello world', timestamp: new Date() },
      { role: 'assistant', content: 'Hi there!', timestamp: new Date() },
      { role: 'system', content: 'Note', timestamp: new Date() },
    ]);
    // Force a small visible height to create a non-zero max offset
    ml['maxVisibleRows'] = 2;

    // Determine total lines by forcing a cache rebuild via getTotalLines
    const total = ml['getTotalLines'](); // fills lineCache
    const maxOffset = Math.max(0, total - ml.maxVisibleRows);

    // Scroll up (increase offset)
    (ml as any).scroll(1);
    expect(ml.scrollOffset).toBe(1);
    (ml as any).scroll(1);
    expect(ml.scrollOffset).toBe(2);
    (ml as any).scroll(1);
    expect(ml.scrollOffset).toBe(3);

    // Continue until we reach max offset
    (ml as any).scroll(1);
    expect(ml.scrollOffset).toBe(Math.min(4, maxOffset));

    // Scroll past max should clamp
    (ml as any).scroll(100);
    expect(ml.scrollOffset).toBe(maxOffset);

    // Scroll down (negative delta)
    (ml as any).scroll(-1);
    expect(ml.scrollOffset).toBe(maxOffset - 1);
    (ml as any).scroll(-1);
    expect(ml.scrollOffset).toBe(maxOffset - 2);

    // Scroll below 0 should clamp
    (ml as any).scroll(-100);
    expect(ml.scrollOffset).toBe(0);
  });

  it('handleKey should scroll on arrow keys', () => {
    const upKey = { name: 'ArrowUp', raw: '\x1b[A', modifiers: undefined } as KeyEvent;
    const downKey = { name: 'ArrowDown', raw: '\x1b[B', modifiers: undefined } as KeyEvent;
    const otherKey = { name: 'a', raw: 'a', modifiers: undefined } as KeyEvent;

    // Provide messages to generate lineCache
    ml.setMessages([
      { role: 'user', content: 'Hello world', timestamp: new Date() },
      { role: 'assistant', content: 'Hi there!', timestamp: new Date() },
      { role: 'system', content: 'System message', timestamp: new Date() },
    ]);
    ml['maxVisibleRows'] = 2;

    // Initial total > visible, so scrolling possible
    const total = ml['getTotalLines'](); // triggers rebuild

    ml.handleKey?.(upKey);
    expect(ml.scrollOffset).toBe(1);
    ml.handleKey?.(downKey);
    expect(ml.scrollOffset).toBe(0);
    ml.handleKey?.(otherKey);
    expect(ml.scrollOffset).toBe(0); // unchanged
  });

  it('clearCache should empty lineCache', () => {
    ml['lineCache'] = ['line1', 'line2'];
    ml.clearCache();
    expect(ml['lineCache']).toHaveLength(0);
  });
});
