import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Markdown as TuiMarkdown } from '@picro/tui';
import clipboard from 'clipboardy';
import { ChatUI } from '../src/tui-app.ts';
import type { BaseAgent } from '@picro/agent';
import { AgentMemoryApp } from '@picro/memory';
import type { TerminalUI } from '@picro/tui';

// ----- Syntax Highlighting Tests -----

describe('Syntax Highlighting', () => {
  it('should render code block with language specification and border', () => {
    const md = new TuiMarkdown('```typescript\nconst x = 1;\n```');
    const lines = md.draw({ width: 80, height: 9999 });
    const text = lines.join('\n');
    // Check for code block border
    expect(text).toContain('┌');
    expect(text).toContain('└');
    // Check for language label
    expect(text).toContain('TYPESCRIPT');
    // Check copy button appears
    expect(text).toContain('[Copy]');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('should render multiple code blocks with different languages', () => {
    const content = 'First:\n```js\nconsole.log(1);\n```\n\nSecond:\n```py\nprint(2)\n```';
    const md = new TuiMarkdown(content);
    const lines = md.draw({ width: 80, height: 9999 });
    const text = lines.join('\n');
    expect(text).toContain('JS');
    expect(text).toContain('PY');
    // Check borders exist for both blocks
    expect((text.match(/┌/g) || []).length).toBeGreaterThanOrEqual(2);
    expect((text.match(/└/g) || []).length).toBeGreaterThanOrEqual(2);
    // Copy buttons
    const copyMatches = text.match(/\[Copy\]/g);
    expect(copyMatches).not.toBeNull();
    expect(copyMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it('should render plain text without code blocks', () => {
    const md = new TuiMarkdown('Just a plain message');
    const lines = md.draw({ width: 80, height: 9999 });
    expect(lines.join('\n')).toContain('Just a plain message');
  });
});

// ----- Copy Code Functionality Tests -----

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

function createMockAgent(): BaseAgent {
  const emitter = new (require('events').EventEmitter)();
  return {
    getEmitter: () => emitter,
    abort: vi.fn(),
    run: vi.fn().mockResolvedValue({ finalAnswer: 'test', success: true, totalRounds: 1 }),
  } as any;
}

function createMockMemory(): AgentMemoryApp {
  return {
    init: vi.fn(),
    recallWithScores: vi.fn().mockResolvedValue({ memories: [], scores: [] }),
    getMemoryCount: vi.fn().mockReturnValue(0),
    getStats: vi.fn().mockReturnValue({}),
    clear: vi.fn(),
    deleteMemory: vi.fn().mockResolvedValue(true),
    updateMemory: vi.fn().mockResolvedValue(true),
  } as any;
}

describe('Copy Code Functionality', () => {
  let chat: ChatUI;

  beforeEach(() => {
    vi.restoreAllMocks();
    const tui = createMockTUI();
    const agent = createMockAgent();
    const memory = createMockMemory();
    const theme = {
      accent: '', green: '', red: '', yellow: '', cyan: '', magenta: '', blue: '', dim: '', bold: '', reset: ''
    };
    chat = new ChatUI(agent, memory, tui, theme, () => {});
  });

  it('should copy last code block from assistant message', async () => {
    const code = 'console.log("hello");';
    chat.addMessage('assistant', `Here is code:\n\`\`\`javascript\n${code}\n\`\`\``);

    const writeSpy = vi.spyOn(clipboard, 'write');
    await chat.copyLastCodeBlock();

    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining(code));
  });

  it('should not call clipboard when no code block present', async () => {
    chat.addMessage('assistant', 'No code here');
    const writeSpy = vi.spyOn(clipboard, 'write');
    await chat.copyLastCodeBlock();
    expect(writeSpy).not.toHaveBeenCalled();
  });
});
