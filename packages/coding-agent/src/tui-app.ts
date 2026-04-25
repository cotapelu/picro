#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { TerminalUI, ProcessTerminal, Text, SelectList, SettingsList, BorderedLoader, Markdown, CURSOR_MARKER } from '@picro/tui';
import type { UIElement, InteractiveElement, KeyEvent, RenderContext, SelectItem, SettingItem } from '@picro/tui';
import { AgentMemoryApp, MemoryStore, type MemoryEntry } from '@picro/memory';
import { Agent, type ToolDefinition, type AIModel, type MemoryRetrievalEvent, type ToolCallStartEvent, type ToolProgressEvent, type ToolCallEndEvent, type ToolErrorEvent } from '@picro/agent';
import clipboard from 'clipboardy';
import { createLLMInstance } from './llm-adapter.js';
import { ConfigManager } from './config/config.js';
import { getModel, getProviders, getModels, stream } from '@picro/llm';
import { FileTools } from './tools/file-tools.js';
import { CodeTools } from './tools/code-tools.js';
import * as os from 'os';
import { ConfigValidator } from './config/validation.js';
import { HistoryStore } from './history-store.js';
import { CommandTools } from './tools/command-tools.js';
import { SearchTools } from './tools/search-tools.js';
import { createMemoryStoreAdapter } from './memory-store-adapter.js';
import { DebugCollector } from './debug.js';
import { InputBox } from './input-box.js';
import { computeBM25, type SearchDoc, type ScoredDoc } from './search/bm25.js';
import { pushConfig as remotePushConfig, pullConfig as remotePullConfig } from './config-remote.js';

interface ChatMessage { role: 'user'|'assistant'|'system'|'tool'; content: string; timestamp: Date; }

interface Theme {
  accent: string;
  green: string;
  red: string;
  yellow: string;
  cyan: string;
  magenta: string;
  blue: string;
  dim: string;
  bold: string;
  reset: string;
}

const darkTheme: Theme = {
  accent: '\x1b[36m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', magenta: '\x1b[35m', blue: '\x1b[34m', dim: '\x1b[2m',
  bold: '\x1b[1m', reset: '\x1b[0m',
};

const lightTheme: Theme = {
  accent: '\x1b[34m', // blue
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

function getTheme(name: 'dark' | 'light'): Theme {
  return name === 'light' ? lightTheme : darkTheme;
}

function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = error.message || String(error);
  return (
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('ECONNRESET') ||
    msg.includes('EHOSTUNREACH') ||
    msg.includes('NetworkError') ||
    msg.includes('fetch failed') ||
    msg.includes('Failed to fetch')
  );
}

export class MessageList implements UIElement, InteractiveElement {
  private messages: ChatMessage[] = [];
  private _scrollOffset = 0;
  private _maxVisibleRows = 0;
  public isFocused = false;
  private lineCache: string[] = [];
  private tui: TerminalUI;
  private theme: Theme;
  // Track markdown instances per message for copy functionality
  private markdownInstances: (Markdown | null)[] = [];
  // Mapping: lineCache index -> message index
  private lineToMessageIndex: number[] = [];
  constructor(tui: TerminalUI, theme: Theme, maxVisibleRows: number) {
    this.tui = tui; this.theme = theme; this.maxVisibleRows = maxVisibleRows;
  }
  set maxVisibleRows(v: number) { this._maxVisibleRows = v; this.lineCache = []; }
  get maxVisibleRows(): number { return this._maxVisibleRows; }
  set scrollOffset(v: number) { this._scrollOffset = v; this.lineCache = []; }
  get scrollOffset(): number { return this._scrollOffset; }
  setMessages(messages: ChatMessage[]): void {
    this.messages = messages;
    this.markdownInstances = messages.map(msg => msg.role === 'assistant' ? new Markdown(msg.content) : null);
    this.scrollOffset = 0; this.lineCache = []; this.lineToMessageIndex = [];
  }
  addMessage(role: ChatMessage['role'], content: string): void {
    const msg: ChatMessage = { role, content, timestamp: new Date() };
    this.messages.push(msg);
    // Create Markdown instance for assistant messages for later copy
    if (role === 'assistant') {
      this.markdownInstances.push(new Markdown(content));
    } else {
      this.markdownInstances.push(null as any);
    }
    this.scrollOffset = 0; this.lineCache = [];
  }
  scroll(delta: number): void { const total = this.getTotalLines(); const max = Math.max(0, total - this.maxVisibleRows); this.scrollOffset = Math.max(0, Math.min(this.scrollOffset + delta, max)); this.tui.requestRender(true); }
  private getTotalLines(): number { if (!this.lineCache.length) this.rebuildCache(9999); return this.lineCache.length; }
  draw(context: RenderContext): string[] {
    const w = context.width;
    if (!this.lineCache.length) this.rebuildCache(w);
    const total = this.lineCache.length;
    const display = Math.min(this.maxVisibleRows, total);
    const start = Math.max(0, total - display - this.scrollOffset);
    const visible = this.lineCache.slice(start, start + display);
    while (visible.length < display) visible.push('');
    return visible;
  }
  clearCache(): void { this.lineCache = []; }
  private rebuildCache(width: number): void {
    this.lineCache = [];
    this.lineToMessageIndex = [];
    const prefixWidth = 4;
    let msgIdx = 0;
    for (const msg of this.messages) {
      const { emoji, color } = this.getStyle(msg.role);
      const prefix = emoji + ' ';
      const cw = width - prefixWidth - 2;

      if (msg.role === 'assistant') {
        try {
          const md = this.markdownInstances[msgIdx] || new Markdown(msg.content, 0, 0);
          const mdLines = md.draw({ width: cw, height: 9999 });
          if (mdLines.length > 0) {
            this.lineCache.push(color + prefix + mdLines[0] + this.theme.reset);
            this.lineToMessageIndex.push(msgIdx);
            for (let i = 1; i < mdLines.length; i++) {
              this.lineCache.push(' '.repeat(prefixWidth + 2) + mdLines[i]);
              this.lineToMessageIndex.push(msgIdx);
            }
          } else {
            this.lineCache.push(color + prefix + '>' + this.theme.reset);
            this.lineToMessageIndex.push(msgIdx);
          }
        } catch (e) {
          const wrapped = this.wrap(msg.content, cw);
          if (wrapped.length) {
            this.lineCache.push(color + prefix + '> ' + wrapped[0] + this.theme.reset);
            this.lineToMessageIndex.push(msgIdx);
            for (let i = 1; i < wrapped.length; i++) {
              this.lineCache.push(' '.repeat(prefixWidth + 2) + wrapped[i]);
              this.lineToMessageIndex.push(msgIdx);
            }
          }
        }
      } else {
        const wrapped = this.wrap(msg.content, cw);
        if (!wrapped.length) {
          this.lineCache.push(color + prefix + '>' + this.theme.reset);
          this.lineToMessageIndex.push(msgIdx);
        } else {
          this.lineCache.push(color + prefix + '> ' + wrapped[0] + this.theme.reset);
          this.lineToMessageIndex.push(msgIdx);
          for (let i = 1; i < wrapped.length; i++) {
            this.lineCache.push(' '.repeat(prefixWidth + 2) + wrapped[i]);
            this.lineToMessageIndex.push(msgIdx);
          }
        }
      }
      this.lineCache.push('');
      this.lineToMessageIndex.push(msgIdx);
      msgIdx++;
    }
  }
  private getStyle(role: ChatMessage['role']) {
    switch (role) {
      case 'user': return { emoji: '👤', color: this.theme.cyan };
      case 'assistant': return { emoji: '🤖', color: this.theme.green };
      case 'system': return { emoji: '🔧', color: this.theme.magenta };
      case 'tool': return { emoji: '🔨', color: this.theme.yellow };
      default: return { emoji: '•', color: this.theme.reset };
    }
  }
  private wrap(text: string, max: number): string[] {
    if (max <= 0) return [text];
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > max) { if (cur) lines.push(cur.trim()); cur = w; }
      else cur += (cur ? ' ' : '') + w;
    }
    if (cur) lines.push(cur.trim());
    return lines.length ? lines : [''];
  }
  handleKey?(key: KeyEvent): void {
    if (key.name === 'ArrowUp' || key.raw === '\x1b[A') this.scroll(1);
    else if (key.name === 'ArrowDown' || key.raw === '\x1b[B') this.scroll(-1);
  }

  handleMouse?(event: { row: number; col: number }): void {
    const total = this.getTotalLines();
    const display = Math.min(this.maxVisibleRows, total);
    const start = Math.max(0, total - display - this.scrollOffset);
    const localRow = start + event.row; // index in lineCache
    if (localRow < 0 || localRow >= this.lineCache.length) return;
    const msgIdx = this.lineToMessageIndex[localRow];
    if (msgIdx === undefined) return;
    const md = this.markdownInstances[msgIdx];
    if (md && md.hasCopyHint(localRow)) {
      const code = md.popAndGetClickedCode();
      if (code) {
        try {
          clipboard.writeSync(code);
          if (this.onCopyCallback) this.onCopyCallback();
        } catch (e) {
          console.error('Copy failed:', e);
        }
      }
    }
  }

  private onCopyCallback: (() => void) | null = null;
  setCopySuccessCallback(cb: () => void) { this.onCopyCallback = cb; }

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.clearCache();
  }
}

export class HelpOverlay implements UIElement, InteractiveElement {
  public isFocused = false;
  private text: string;
  private onClose: () => void;
  constructor(text: string, onClose: () => void) {
    this.text = text;
    this.onClose = onClose;
  }
  draw(context: RenderContext): string[] {
    const w = context.width;
    const lines = this.text.split('\n');
    const pad = Math.max(0, Math.floor((context.height - lines.length) / 2));
    const result: string[] = [];
    for (let i = 0; i < pad; i++) result.push('');
    for (const line of lines) {
      result.push(line.padEnd(w).slice(0, w));
    }
    return result;
  }
  handleKey?(key: KeyEvent): void {
    this.onClose();
  }
  clearCache(): void {}
}

export class ChatUI implements UIElement, InteractiveElement {
  private messages: ChatMessage[] = [];
  private inputBuffer = '';
  private cursorPos = 0;
  private messageList!: MessageList;
  private inputText!: Text;
  private tui: TerminalUI;
  private theme: Theme;
  private onExit: () => void;
  private agent: Agent;
  private memory: AgentMemoryApp;
  private commandPanelHandle: any = null;
  private settingsPanelHandle: any = null;
  private sessionPanelHandle: any = null;
  private helpHandle: any = null;
  private memoryPanelHandle: any = null;
  private currentMemoryList: SelectList | null = null;
  private actionPanelHandle: any = null;
  private debugPanelHandle: any = null;
  private searchPanelHandle: any = null;
  private debugCollector: DebugCollector;
  private retrievedMemories: any[] = [];
  private memoryEventListener: (() => void) | null = null;
  private toolProgressListener: (() => void) | null = null;
  private commandHistory: string[] = [];
  getCommandHistory(): string[] { return this.commandHistory; }
  private currentTool: string | null = null;
  private toolProgress: string = '';  // for progress bar display
  private historyIndex = -1;
  private status = 'Ready';
  private statusColor: keyof Theme = 'green';
  private lastError: Error | null = null;
  private pendingInput: string | null = null;
  public isFocused = false;
  private announcement: string = '';
  private toolStartTime: number | null = null;
  private toolInterval: any = null;
  private toolPartial: string = '';
  private toolMessageIndex: number | null = null;
  // Tool progress
  private toolUpdateInterval: any = null;
  private isAgentRunning: boolean = false;

  constructor(agent: Agent, memory: AgentMemoryApp, tui: TerminalUI, theme: Theme, commandHistory: string[] = [], onExit: () => void) {
    this.agent = agent; this.memory = memory; this.tui = tui; this.theme = theme; this.commandHistory = commandHistory; this.onExit = onExit;
    this.inputText = new Text('', { wrap: true });
    this.messageList = new MessageList(tui, theme, 10);
    // Listen for memory retrieval events
    const emitter = this.agent.getEmitter();
    this.memoryEventListener = emitter.on('memory:retrieve', (event: MemoryRetrievalEvent) => {
      this.retrievedMemories = event.memories ?? []; // Use the memories array if available
      this.tui.requestRender(true);
    });
    // Listen for tool progress
    this.toolProgressListener = emitter.on('tool:call:start', (event: ToolCallStartEvent) => {
      this.currentTool = event.toolName;
      this.toolStartTime = Date.now();
      this.toolPartial = '';
      // Create a tool message to stream output
      this.toolMessageIndex = this.messages.length;
      this.addMessage('tool', `⚙️ ${this.currentTool}: `);
      this.startToolInterval();
      this.tui.requestRender(true);
    });
    emitter.on('tool:progress', (event: ToolProgressEvent) => {
      this.toolPartial = event.partialResult || '';
      if (this.toolMessageIndex !== null) {
        this.messages[this.toolMessageIndex].content = `⚙️ ${this.currentTool}: ${this.toolPartial}`;
        this.messageList.clearCache();
      }
      this.tui.requestRender(true);
    });
    emitter.on('tool:call:end', (event: ToolCallEndEvent) => {
      if (this.toolMessageIndex !== null) {
        const isError = event.result.isError;
        const icon = isError ? '❌' : '✅';
        // For successful tool result, the result is in event.result.result (string)
        // For failed, it's in event.result.error (string)
        let resultText = '';
        if (!isError && typeof event.result.result === 'string') {
          resultText = event.result.result;
        } else if (isError && typeof event.result.error === 'string') {
          resultText = event.result.error;
        }
        this.messages[this.toolMessageIndex].content = `${icon} ${this.currentTool}: ${resultText}`;
        this.messageList.clearCache();
      }
      this.clearToolState();
    });
    emitter.on('tool:error', (event: ToolErrorEvent) => {
      if (this.toolMessageIndex !== null) {
        const msg = event.errorMessage;
        this.messages[this.toolMessageIndex].content = `❌ ${this.currentTool}: Error: ${msg}`;
        this.messageList.clearCache();
      }
      this.clearToolState();
    });
    // Initialize debug collector
    const config = ConfigManager.getInstance();
    this.debugCollector = new DebugCollector(emitter, config.getSetting('debugMode'));
  }

  addMessage(role: ChatMessage['role'], content: string): void {
    this.messages.push({ role, content, timestamp: new Date() });
    this.messageList.addMessage(role, content);
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.messageList.setTheme(theme);
    this.tui.requestRender(true);
  }

  announce(message: string): void {
    this.announcement = message;
    this.tui.requestRender(true);
  }

  draw(context: RenderContext): string[] {
    const lines: string[] = [];
    const memCount = this.memory.getMemoryCount();
    lines.push(this.theme.accent + `🤖 Coding Agent | ${this.messages.length} msgs | ${memCount} memories` + this.theme.reset);
    if (this.announcement) {
      lines.push(this.theme.dim + this.announcement + this.theme.reset);
      this.announcement = '';
    }
    lines.push('─'.repeat(context.width));

    const available = context.height - 1 - 1 - 2;
    if (available > 0) {
      this.messageList.maxVisibleRows = available;
      this.messageList.setMessages(this.messages);
      lines.push(...this.messageList.draw({ width: context.width, height: available }));
    }

    lines.push('─'.repeat(context.width));
    const prompt = this.theme.accent + '❯ ' + this.theme.reset;
    this.inputText.setContent(prompt + this.inputBuffer);
    const inputLines = this.inputText.draw({ width: context.width, height: 1 });
    // Add cursor marker to last input line if focused
    if (this.isFocused && inputLines.length > 0) {
      const lastIdx = inputLines.length - 1;
      inputLines[lastIdx] = inputLines[lastIdx] + CURSOR_MARKER;
    }
    lines.push(...inputLines);
    // Tool progress bar
    if (this.currentTool) {
      const partial = this.toolPartial ? ` - ${this.toolPartial}` : '';
      const progressLine = `${this.theme.yellow}⚙️ ${this.currentTool}: ${this.toolProgress}${partial}${this.theme.reset}`;
      lines.push(progressLine.slice(0, context.width));
    }
    let hint: string;
    if (this.lastError) {
      const color = this.theme.red || this.theme.reset;
      hint = `${color}[${this.status}] Press R to retry${this.theme.reset}`;
    } else {
      hint = this.theme.dim + ' ↳ Enter=Send  Ctrl+Enter=Newline  ↑↓=Scroll  Ctrl+P=Menu  F5=Debug  Ctrl+M=Memories  Ctrl+C=Exit ' + this.theme.reset;
    }
    lines.push(hint);
    return lines;
  }

  handleKey?(key: KeyEvent): void {
    const d = key.raw;
    // Ctrl+C: cancel agent if running, else exit
    if (d === '\x03') {
      if (this.isAgentRunning) {
        this.agent.abort();
        this.setStatus('Cancelling...', 'yellow');
      } else {
        this.onExit();
      }
      return;
    }

    // Quick copy last code (press C when no input)
    if ((key.name === 'c' || key.name === 'C') && !this.inputBuffer && !this.isFocused) {
      this.copyLastCodeBlock();
      return;
    }

    if ((key.name === 'Enter' || d === '\r') && !key.modifiers?.ctrl && !key.modifiers?.alt && !key.modifiers?.shift) {
      if (this.inputBuffer.trim()) {
        const input = this.inputBuffer.trim();
        this.commandHistory.push(input);
        this.historyIndex = this.commandHistory.length;
        this.inputBuffer = ''; this.cursorPos = 0;
        this.addMessage('user', input);
        this.processAgentResponse(input);
      } else {
        // No input: copy last code block
        this.copyLastCodeBlock();
      }
      return;
    }

    if (key.modifiers?.ctrl && (key.name === 'Enter' || d === '\r')) {
      this.insertAtCursor('\n');
      return;
    }
    if (key.modifiers?.ctrl && key.modifiers?.shift && key.name === 'r') {
      this.showBulkRenameSessions();
      return;
    }

    // Batch delete memories when memory panel open with multi-select
    if ((key.name === 'd' || key.name === 'D') && this.memoryPanelHandle && this.currentMemoryList?.isMultiSelect()) {
      const selected = this.currentMemoryList.getSelectedIndices();
      if (selected.length > 0) {
        // Perform delete
        (async () => {
          for (const idx of selected) {
            const mem = this.retrievedMemories[idx];
            if (mem) {
              await this.memory.deleteMemory(mem.id);
            }
          }
          // Refresh list and clear selection
          this.retrievedMemories = this.retrievedMemories.filter((_, i) => !selected.includes(i));
          this.currentMemoryList?.setItems(this.retrievedMemories.map((mem, idx) => ({
            value: idx.toString(),
            label: mem.content.slice(0, 50) + (mem.content.length > 50 ? '...' : ''),
            description: `Retrieved memory #${idx + 1}`,
          })));
          this.currentMemoryList?.setMultiSelect(true); // maintain multi-select
          this.addMessage('system', `Deleted ${selected.length} memories.`);
          this.tui.requestRender(true);
        })();
      }
      return;
    }

    if (key.name === 'ArrowUp') {
      if (this.cursorPos === this.inputBuffer.length && this.commandHistory.length > 0) {
        this.historyIndex = Math.max(0, this.historyIndex - 1);
        this.inputBuffer = this.commandHistory[this.historyIndex] || '';
        this.cursorPos = this.inputBuffer.length;
      } else {
        this.messageList.scroll(1);
      }
      return;
    }

    if (key.name === 'ArrowDown') {
      if (this.cursorPos === this.inputBuffer.length && this.commandHistory.length > 0) {
        this.historyIndex = Math.min(this.commandHistory.length - 1, this.historyIndex + 1);
        this.inputBuffer = this.commandHistory[this.historyIndex] || '';
        this.cursorPos = this.inputBuffer.length;
      } else {
        this.messageList.scroll(-1);
      }
      return;
    }

    if (key.name === 'Backspace' || d === '\x7f') { if (this.cursorPos > 0) { this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos-1) + this.inputBuffer.slice(this.cursorPos); this.cursorPos--; } return; }
    if (key.name === 'ArrowLeft') { if (this.cursorPos > 0) this.cursorPos--; return; }
    if (key.name === 'ArrowRight') { if (this.cursorPos < this.inputBuffer.length) this.cursorPos++; return; }
    if (key.name === 'Home') { this.cursorPos = 0; return; }
    if (key.name === 'End') { this.cursorPos = this.inputBuffer.length; return; }

    if (key.modifiers?.ctrl && (key.name === 'a' || key.name === 'A')) { this.cursorPos = 0; return; }
    if (key.modifiers?.ctrl && key.name === 'k') { this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos); return; }
    if (key.name === 'Tab') { return; }

    if (d.length === 1 && d.charCodeAt(0) >= 32 && d.charCodeAt(0) <= 126) {
      this.insertAtCursor(d);
      return;
    }
    if (key.modifiers?.ctrl && key.name === 'p') { this.showCommandFinder(); return; }
    if (key.modifiers?.ctrl && key.name === 'm') { this.toggleMemoryPanel(); return; }
    if (key.name === 'F1') { this.showHelpOverlay(); return; }
    if (key.name === 'F5') { this.toggleDebugPanel(); return; }

    // Retry on error
    if ((key.name === 'r' || key.name === 'R') && this.lastError) {
      this.retryLast();
      return;
    }
  }

  private insertAtCursor(ch: string): void {
    this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos) + ch + this.inputBuffer.slice(this.cursorPos);
    this.cursorPos++;
  }

  setStatus(status: string, color: keyof Theme = 'green'): void {
    this.status = status;
    this.statusColor = color;
    this.tui.requestRender(true);
  }

  showHelpOverlay(): void {
    const helpText = 
`\x1b[1m🚀 CODING AGENT TUI\x1b[0m\n` +
    `\nChat:\n` +
    `  \x1b[36mEnter\x1b[0m        Send message\n` +
    `  \x1b[36mCtrl+Enter\x1b[0m   Newline\n` +
    `  \x1b[36m↑↓\x1b[0m          Scroll/History\n` +
    `  \x1b[36mCtrl+A/E\x1b[0m      Line start/end\n` +
    `  \x1b[36mCtrl+K\x1b[0m        Delete to end\n` +
    `  \x1b[36mBackspace\x1b[0m    Delete char\n` +
    `  \x1b[36m←→\x1b[0m            Cursor navigation\n` +
    `  \x1b[36mHome/End\x1b[0m      Jump to ends\n` +
    `\nSystem:\n` +
    `  \x1b[33mCtrl+P\x1b[0m        Command palette\n` +
    `  \x1b[33mF1\x1b[0m            This help\n` +
    `  \x1b[33mCtrl+C\x1b[0m        Exit\n` +
    `\nPalette Commands:\n` +
    `  • Provider & Model\n` +
    `  • App Settings (maxRounds)\n` +
    `  • Save/Load/List/Delete Sessions\n` +
    `  • Clear Memory, Stats, Exit\n` +
    `\nPress any key to close...`;

    const overlay = new HelpOverlay(helpText, () => {
      this.helpHandle?.close();
      this.helpHandle = null;
    });
    this.helpHandle = this.tui.showPanel(overlay, { anchor: 'center', offsetY: -5, width: 70, minWidth: 50 });
  }

  showMemoryPanel(): void {
    if (this.memoryPanelHandle) {
      this.memoryPanelHandle.close();
      this.memoryPanelHandle = null;
      return;
    }
    const memories = this.retrievedMemories;
    if (memories.length === 0) {
      const empty = new Text('No memories retrieved yet.', { color: this.theme.dim });
      this.memoryPanelHandle = this.tui.showPanel(empty, { anchor: 'right-center', offsetY: -5, width: 40, minWidth: 20 });
      return;
    }
    const items: SelectItem[] = memories.map((mem, idx) => ({
      value: idx.toString(),
      label: mem.content.slice(0, 50) + (mem.content.length > 50 ? '...' : ''),
      description: `Retrieved memory #${idx + 1}`,
    }));
    const list = new SelectList(items, Math.min(memories.length + 2, 10), {}, (v: string) => {
      // In multi-select mode, Enter toggles selection instead of closing
      if (this.currentMemoryList?.isMultiSelect()) {
        const idx = parseInt(v, 10);
        if (!isNaN(idx)) this.currentMemoryList?.toggleSelection(idx);
        return;
      }
      // Single-select mode: open actions
      this.memoryPanelHandle?.close();
      this.memoryPanelHandle = null;
      this.currentMemoryList = null;
      const idx = parseInt(v, 10);
      if (!isNaN(idx)) {
        this.showMemoryActions(idx);
      }
    }, () => {
      this.memoryPanelHandle?.close();
      this.memoryPanelHandle = null;
      this.currentMemoryList = null;
    });
    list.setMultiSelect(true);
    this.currentMemoryList = list;
    this.memoryPanelHandle = this.tui.showPanel(list, { anchor: 'right-center', offsetY: -5, panelHeight: Math.min(memories.length + 4, 15), minWidth: 30, width: 50 });
    // When panel is closed via other means, clear currentMemoryList
    this.memoryPanelHandle.focus = () => {};
    // override close to also clear reference
    const originalClose = this.memoryPanelHandle.close.bind(this.memoryPanelHandle);
    this.memoryPanelHandle.close = () => {
      this.currentMemoryList = null;
      originalClose();
    };
  }

  private showMemoryActions(memIdx: number): void {
    if (this.actionPanelHandle) {
      this.actionPanelHandle.close();
      this.actionPanelHandle = null;
      return;
    }
    const memories = this.retrievedMemories;
    if (!memories[memIdx]) {
      this.addMessage('system', `Memory #${memIdx + 1} not found.`);
      return;
    }
    const actions: SelectItem[] = [
      { value: 'edit', label: 'Edit', description: 'Change memory content' },
      { value: 'delete', label: 'Delete', description: 'Remove this memory' },
      { value: 'cancel', label: 'Cancel', description: 'Back' },
    ];
    const list = new SelectList(actions, 5, {}, (action: string) => {
      this.actionPanelHandle?.close();
      this.actionPanelHandle = null;
      this.handleMemoryAction(memIdx, action);
    }, () => { this.actionPanelHandle?.close(); this.actionPanelHandle = null; });
    this.actionPanelHandle = this.tui.showPanel(list, { anchor: 'center', offsetY: -5, panelHeight: 7, minWidth: 30 });
  }

  private async handleMemoryAction(memIdx: number, action: string): Promise<void> {
    const memories = this.retrievedMemories;
    const mem = memories[memIdx];
    if (!mem) return;
    if (action === 'delete') {
      const success = await this.memory.deleteMemory(mem.id);
      if (success) {
        this.addMessage('system', `Memory #${memIdx + 1} deleted.`);
        this.retrievedMemories = this.retrievedMemories.filter((_, i) => i !== memIdx);
      } else {
        this.addMessage('system', `Failed to delete memory #${memIdx + 1}.`);
      }
    } else if (action === 'edit') {
      await this.editMemoryContent(memIdx);
    }
  }

  private editMemoryContent(memIdx: number): void {
    const mem = this.retrievedMemories[memIdx];
    if (!mem) return;
    const onEnter = async (newContent: string) => {
      this.actionPanelHandle?.close();
      this.actionPanelHandle = null;
      if (!newContent.trim()) {
        this.addMessage('system', 'Edit cancelled.');
        return;
      }
      const success = await this.memory.updateMemory(mem.id, newContent, undefined);
      if (success) {
        this.addMessage('system', `Memory #${memIdx + 1} updated.`);
        this.retrievedMemories[memIdx].content = newContent;
      } else {
        this.addMessage('system', `Failed to update memory #${memIdx + 1}.`);
      }
    };
    const onCancel = () => {
      this.actionPanelHandle?.close();
      this.actionPanelHandle = null;
      this.addMessage('system', 'Edit cancelled.');
    };
    const input = new InputBox(`Edit memory #${memIdx + 1}: `, onEnter, onCancel, this.theme);
    this.actionPanelHandle = this.tui.showPanel(input, { anchor: 'center', offsetY: -5, width: 60, minWidth: 30 });
  }

  toggleMemoryPanel(): void {
    this.showMemoryPanel();
  }

  showDebugPanel(): void {
    if (this.debugPanelHandle) {
      this.debugPanelHandle.close();
      this.debugPanelHandle = null;
      return;
    }
    const metrics = this.debugCollector.getMetricsSnapshot();
    const formatNum = (n: any) => n != null ? `${Math.round(Number(n))}ms` : 'N/A';
    const lines: string[] = [
      this.theme.bold + '🔧 Debug Metrics' + this.theme.reset,
      '',
      `Uptime: ${formatNum(metrics.uptime)}`,
      `LLM Avg Latency: ${formatNum(metrics.llmLatencyAvg)}`,
      `Total Tokens: ${metrics.llmTokenTotal ?? 'N/A'}`,
      `Tool Calls: ${metrics.toolCallsCount}`,
      `Tool Errors: ${metrics.toolErrorsCount}`,
      `Memory Retrievals: ${metrics.memoryRetrievalCount}`,
      `Avg Memories Retrieved: ${typeof metrics.memoryCountAvg === 'number' ? metrics.memoryCountAvg.toFixed(1) : 'N/A'}`,
      `Rounds: ${metrics.totalRounds}`,
      `Debug Log: ${this.debugCollector.isEnabled() ? this.theme.green + 'enabled' + this.theme.reset : this.theme.red + 'disabled' + this.theme.reset}`,
    ];
    const text = new Text(lines.join('\n'), { color: this.theme.cyan });
    this.debugPanelHandle = this.tui.showPanel(text, { anchor: 'left-center', offsetY: -5, width: 50, minWidth: 30 });
  }

  toggleDebugPanel(): void {
    // Toggle debug logging
    if (this.debugCollector.isEnabled()) {
      this.debugCollector.disable();
    } else {
      this.debugCollector.enable();
    }
    // Update config
    const config = ConfigManager.getInstance();
    config.updateSettings({ debugMode: this.debugCollector.isEnabled() });
    // Toggle panel visibility
    if (this.debugPanelHandle) {
      this.debugPanelHandle.close();
      this.debugPanelHandle = null;
      return;
    }
    this.showDebugPanel();
  }

  private async copyLastCodeBlock(): Promise<void> {
    // Find last assistant message containing a code block
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i];
      if (msg.role === 'assistant') {
        // Extract code blocks from markdown
        const codeBlockRegex = /```(?:\w*)\n([\s\S]*?)```/g;
        let match;
        let lastCode = '';
        while ((match = codeBlockRegex.exec(msg.content)) !== null) {
          lastCode = match[1];
        }
        if (lastCode) {
          try {
            await clipboard.write(lastCode);
            this.addMessage('system', 'Last code block copied to clipboard.');
          } catch (e) {
            this.addMessage('system', `Failed to copy: ${e}`);
          }
          return;
        }
      }
    }
    this.addMessage('system', 'No code block found in recent messages.');
  }

  clearCache(): void { this.messageList.clearCache(); this.inputText.clearCache(); }

  private startToolInterval(): void {
    if (this.toolInterval) clearInterval(this.toolInterval);
    this.toolInterval = setInterval(() => {
      if (this.currentTool && this.toolStartTime) {
        const config = ConfigManager.getInstance().getConfig();
        const timeout = config.settings.toolTimeout; // ms
        const elapsedMs = Date.now() - this.toolStartTime;
        const elapsed = elapsedMs / 1000;
        const remaining = (timeout - elapsedMs) / 1000;
        const partial = this.toolPartial ? ` - ${this.toolPartial}` : '';
        this.toolProgress = `${elapsed.toFixed(1)}s (${Math.max(0, remaining).toFixed(1)}s remaining)${partial}`;
        this.tui.requestRender(true);
      }
    }, 1000);
  }

  private clearToolState(): void {
    if (this.toolInterval) {
      clearInterval(this.toolInterval);
      this.toolInterval = null;
    }
    this.currentTool = null;
    this.toolStartTime = null;
    this.toolPartial = '';
    this.toolProgress = '';
    this.toolMessageIndex = null;
    this.tui.requestRender(true);
  }

  private showCommandPalette(): void {
    const cmds: SelectItem[] = [
      { value: 'provider-settings', label: 'Provider & Model', description: 'Change LLM provider and model' },
      { value: 'app-settings', label: 'App Settings', description: 'Max rounds, timeout, logging' },
      { value: 'search-recent-messages', label: 'Search Recent Messages', description: 'Search chat history (last 7 days)' },
      { value: 'search-messages', label: 'Search Messages', description: 'Full-text search in chat history' },
      { value: 'save-session', label: 'Save Session', description: 'Save current conversation' },
      { value: 'load-session', label: 'Load Session', description: 'Restore a conversation' },
      { value: 'delete-session', label: 'Delete Session', description: 'Delete a saved session' },
      { value: 'list-sessions', label: 'List Sessions', description: 'Show all saved sessions' },
      { value: 'copy-last-code', label: 'Copy Last Code', description: 'Copy last code block to clipboard' },
      { value: 'find-command', label: 'Find Command', description: 'Search commands by keyword' },
      { value: 'clear-memory', label: 'Clear Memory', description: 'Remove all memories' },
      { value: 'memory-stats', label: 'Memory Stats', description: 'Show memory statistics' },
{ value: 'config-push', label: 'Push Config', description: 'Upload config to URL' },      { value: 'config-pull', label: 'Pull Config', description: 'Download config from URL' },
{ value: 'config-push', label: 'Push Config', description: 'Upload config to URL' },      { value: 'config-pull', label: 'Pull Config', description: 'Download config from URL' },
{ value: 'export-config', label: 'Export Config', description: 'Save config to file' },      { value: 'import-config', label: 'Import Config', description: 'Load config from file' },
      { value: 'toggle-theme', label: 'Toggle Theme', description: 'Switch between dark and light' },
      { value: 'exit', label: 'Exit', description: 'Quit the application' },
    ];
    const list = new SelectList(cmds, Math.min(cmds.length + 2, 10), {}, (v: string) => { this.commandPanelHandle?.close(); this.handleCommand(v); }, () => { this.commandPanelHandle?.close(); });
    this.commandPanelHandle = this.tui.showPanel(list, { anchor: 'center', offsetY: -5, panelHeight: Math.min(cmds.length + 4, 15), minWidth: 30 });
  }

  private showCommandFinder(): void {
    const allCmds: SelectItem[] = [
      { value: 'provider-settings', label: 'Provider & Model', description: 'Change LLM provider and model' },
      { value: 'app-settings', label: 'App Settings', description: 'Max rounds, timeout, logging' },
      { value: 'search-recent-messages', label: 'Search Recent Messages', description: 'Search chat history (last 7 days)' },
      { value: 'search-messages', label: 'Search Messages', description: 'Full-text search in chat history' },
      { value: 'save-session', label: 'Save Session', description: 'Save current conversation' },
      { value: 'load-session', label: 'Load Session', description: 'Restore a saved conversation' },
      { value: 'delete-session', label: 'Delete Session', description: 'Delete a saved session' },
      { value: 'list-sessions', label: 'List Sessions', description: 'Show all saved sessions' },
      { value: 'copy-last-code', label: 'Copy Last Code', description: 'Copy last code block to clipboard' },
      { value: 'find-command', label: 'Find Command', description: 'Search commands by keyword' },
      { value: 'clear-memory', label: 'Clear Memory', description: 'Remove all memories' },
      { value: 'memory-stats', label: 'Memory Stats', description: 'Show memory statistics' },
{ value: 'config-push', label: 'Push Config', description: 'Upload config to URL' },      { value: 'config-pull', label: 'Pull Config', description: 'Download config from URL' },
{ value: 'config-push', label: 'Push Config', description: 'Upload config to URL' },      { value: 'config-pull', label: 'Pull Config', description: 'Download config from URL' },
{ value: 'export-config', label: 'Export Config', description: 'Save config to file' },      { value: 'import-config', label: 'Import Config', description: 'Load config from file' },
      { value: 'toggle-theme', label: 'Toggle Theme', description: 'Switch between dark and light' },
      { value: 'exit', label: 'Exit', description: 'Quit the application' },
    ];
    const onSearch = (query: string) => {
      this.commandPanelHandle?.close();
      if (!query.trim()) return;
      const filtered = allCmds.filter(item => 
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
      );
      if (filtered.length === 0) {
        this.addMessage('system', `No commands match "${query}"`);
        return;
      }
      const list = new SelectList(filtered, Math.min(filtered.length + 2, 10), {}, (v: string) => {
        this.handleCommand(v);
        this.commandPanelHandle?.close();
      }, () => { this.commandPanelHandle?.close(); });
      this.commandPanelHandle = this.tui.showPanel(list, { anchor: 'center', offsetY: -5, panelHeight: Math.min(filtered.length + 4, 15), minWidth: 30 });
    };
    const onCancel = () => {
      this.commandPanelHandle?.close();
      this.commandPanelHandle = null;
      this.announce('Command finder closed');
    };
    const input = new InputBox('Search commands: ', onSearch, onCancel, this.theme);
    this.commandPanelHandle = this.tui.showPanel(input, { anchor: 'center', offsetY: -5, width: 50, minWidth: 30 });
    this.announce('Command finder opened');
  }

  private showSearchPanel(): void {
    if (this.searchPanelHandle) {
      this.searchPanelHandle.close();
      this.searchPanelHandle = null;
      return;
    }
    const onSearch = (input: string) => {
      this.searchPanelHandle?.close();
      this.searchPanelHandle = null;
      if (!input.trim()) return;
      const { query: cleanQuery, role, since, until } = this.parseSearchFilters(input);
      // Prepare docs for BM25
      const docs: SearchDoc[] = this.messages.map((msg, idx) => ({
        idx,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      }));
      let scored = computeBM25(cleanQuery, docs);
      scored = scored.filter(s => {
        if (s.score <= 0) return false;
        if (role && s.doc.role !== role) return false;
        const ts = s.doc.timestamp instanceof Date ? s.doc.timestamp.getTime() : s.doc.timestamp;
        if (since && ts < since.getTime()) return false;
        if (until && ts > until.getTime()) return false;
        return true;
      });
      const top = scored.slice(0, 10);
      if (top.length === 0) {
        this.addMessage('system', `No messages found for "${cleanQuery}"`);
        return;
      }
      const results: SelectItem[] = top.map(s => ({
        value: s.doc.idx.toString(),
        label: `[${s.doc.role}] ${s.doc.content.length > 60 ? s.doc.content.slice(0,60) + '...' : s.doc.content}`,
        description: new Date(s.doc.timestamp).toLocaleTimeString() + ` (${s.score.toFixed(2)})`,
      }));
      // Show results selection
      const resultList = new SelectList(results, Math.min(results.length + 2, 10), {}, (sel: string) => {
        const idx = parseInt(sel, 10);
        if (!isNaN(idx) && this.messages[idx]) {
          const msg = this.messages[idx];
          this.addMessage('system', `Message #${idx} [${msg.role}]: ${msg.content.slice(0, 100)}...`);
        }
        this.sessionPanelHandle?.close();
      }, () => { this.sessionPanelHandle?.close(); });
      this.sessionPanelHandle = this.tui.showPanel(resultList, { anchor: 'center', offsetY: -5, panelHeight: Math.min(results.length + 4, 15), minWidth: 60 });
    };
    const onCancel = () => {
      this.searchPanelHandle?.close();
      this.searchPanelHandle = null;
      this.announce('Search closed');
    };
    const input = new InputBox('Search: ', onSearch, onCancel, this.theme);
    this.searchPanelHandle = this.tui.showPanel(input, { anchor: 'center', offsetY: -5, width: 60, minWidth: 30 });
  }

  private showRecentSearchPanel(days: number = 7): void {
    if (this.searchPanelHandle) {
      this.searchPanelHandle.close();
      this.searchPanelHandle = null;
      return;
    }
    const onSearch = (query: string) => {
      this.searchPanelHandle?.close();
      this.searchPanelHandle = null;
      if (!query.trim()) return;
      const docs: SearchDoc[] = this.messages.map((msg, idx) => ({
        idx,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      }));
      const scored = computeBM25(query, docs);
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const filtered = scored.filter(s => s.score > 0 && (s.doc.timestamp instanceof Date ? s.doc.timestamp.getTime() : s.doc.timestamp) >= cutoff).slice(0, 10);
      if (filtered.length === 0) {
        this.addMessage('system', `No recent messages (last ${days} days) match "${query}"`);
        return;
      }
      const results: SelectItem[] = filtered.map(s => ({
        value: s.doc.idx.toString(),
        label: `[${s.doc.role}] ${s.doc.content.length > 60 ? s.doc.content.slice(0,60) + '...' : s.doc.content}`,
        description: new Date(s.doc.timestamp).toLocaleTimeString() + ` (${s.score.toFixed(2)})`,
      }));
      const resultList = new SelectList(results, Math.min(results.length + 2, 10), {}, (sel: string) => {
        const idx = parseInt(sel, 10);
        if (!isNaN(idx) && this.messages[idx]) {
          const msg = this.messages[idx];
          this.addMessage('system', `Message #${idx} [${msg.role}]: ${msg.content.slice(0, 100)}...`);
        }
        this.sessionPanelHandle?.close();
      }, () => { this.sessionPanelHandle?.close(); });
      this.sessionPanelHandle = this.tui.showPanel(resultList, { anchor: 'center', offsetY: -5, panelHeight: Math.min(results.length + 4, 15), minWidth: 60 });
    };
    const onCancel = () => {
      this.searchPanelHandle?.close();
      this.searchPanelHandle = null;
      this.announce('Search closed');
    };
    const input = new InputBox(`Search recent (last ${days} days): `, onSearch, onCancel, this.theme);
    this.searchPanelHandle = this.tui.showPanel(input, { anchor: 'center', offsetY: -5, width: 60, minWidth: 30 });
  }

  private parseSearchFilters(input: string): { query: string; role?: string; since?: Date; until?: Date } {
    const parts = input.trim().split(/\s+/);
    const queryParts: string[] = [];
    let role: string | undefined;
    let since: Date | undefined;
    let until: Date | undefined;
    for (const part of parts) {
      if (part.startsWith('role:')) {
        const r = part.substring(5);
        if (['user', 'assistant', 'tool'].includes(r)) {
          role = r;
        } else {
          queryParts.push(part);
        }
      } else if (part.startsWith('since:')) {
        const dateStr = part.substring(6);
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          since = d;
        } else {
          queryParts.push(part);
        }
      } else if (part.startsWith('until:')) {
        const dateStr = part.substring(6);
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          until = d;
        } else {
          queryParts.push(part);
        }
      } else {
        queryParts.push(part);
      }
    }
    return { query: queryParts.join(' '), role, since, until };
  }

  // Session Management: Rename and Tagging

  private showBulkRenameSessions(): void {
    const sessionDir = this.getSessionDir();
    if (!fs.existsSync(sessionDir)) {
      this.addMessage('system', 'No sessions to rename.');
      return;
    }
    const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
      this.addMessage('system', 'No sessions to rename.');
      return;
    }
    const list = files.map((f, i) => `${i + 1}. ${f.replace('.json', '')}`).join('\n');
    this.addMessage('system', `Sessions:\n${list}\nEnter comma-separated numbers to rename (e.g., "1,2,3"):`);
    const onEnterIndices = (indicesStr: string) => {
      this.actionPanelHandle?.close();
      this.actionPanelHandle = null;
      const indices = indicesStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= files.length);
      if (indices.length === 0) {
        this.addMessage('system', 'No valid indices selected.');
        return;
      }
      const onEnterBase = (base: string) => {
        this.actionPanelHandle?.close();
        this.actionPanelHandle = null;
        if (!base.trim()) {
          this.addMessage('system', 'Rename cancelled.');
          return;
        }
        let successCount = 0;
        for (let i = 0; i < indices.length; i++) {
          const idx = indices[i] - 1;
          const oldFile = files[idx];
          const newName = `${base.trim()}-${i + 1}.json`;
          try {
            fs.renameSync(path.join(sessionDir, oldFile), path.join(sessionDir, newName));
            successCount++;
          } catch (e: any) {
            this.addMessage('system', `Failed to rename ${oldFile}: ${e.message}`);
          }
        }
        this.addMessage('system', `Bulk renamed ${successCount} session(s).`);
      };
      const onCancelBase = () => {
        this.actionPanelHandle?.close();
        this.actionPanelHandle = null;
        this.addMessage('system', 'Bulk rename cancelled.');
      };
      this.actionPanelHandle = this.tui.showPanel(new InputBox('New base name for selected sessions: ', onEnterBase, onCancelBase, this.theme), { anchor: 'center', offsetY: -5, width: 60, minWidth: 30 });
    };
    const onCancelIndices = () => {
      this.actionPanelHandle?.close();
      this.actionPanelHandle = null;
      this.addMessage('system', 'Bulk rename cancelled.');
    };
    this.actionPanelHandle = this.tui.showPanel(new InputBox('Enter comma-separated session numbers: ', onEnterIndices, onCancelIndices, this.theme), { anchor: 'center', offsetY: -5, width: 60, minWidth: 30 });
  }
  private showManageSessionMenu(): void {
    if (this.sessionPanelHandle) {
      this.sessionPanelHandle.close();
      this.sessionPanelHandle = null;
      this.announce('Session menu closed');
      return;
    }
    this.announce('Session menu opened');
    const sessionDir = this.getSessionDir();
    if (!fs.existsSync(sessionDir)) {
      this.addMessage('system', 'No sessions to manage.');
      return;
    }
    const files = fs.readdirSync(sessionDir).filter((f: string) => f.endsWith('.json'));
    if (files.length === 0) {
      this.addMessage('system', 'No sessions to manage.');
      return;
    }
    const items: SelectItem[] = files.map((f: string) => ({
      value: f,
      label: f.replace('.json', ''),
      description: '',
    }));
    const list = new SelectList(items, Math.min(files.length + 2, 10), {}, (file: string) => {
      this.showSessionActions(file);
    }, () => { this.sessionPanelHandle?.close(); });
    this.sessionPanelHandle = this.tui.showPanel(list, { anchor: 'center', offsetY: -5, panelHeight: Math.min(files.length + 4, 15), minWidth: 30 });
  }

  private showSessionActions(file: string): void {
    this.sessionPanelHandle?.close();
    const actions: SelectItem[] = [
      { value: 'rename', label: 'Rename', description: 'Change session name' },
      { value: 'tags', label: 'Set Tags', description: 'Add or remove tags' },
      { value: 'cancel', label: 'Cancel', description: 'Back' },
    ];
    const list = new SelectList(actions, 5, {}, (action: string) => {
      if (action === 'rename') this.handleRenameSession(file);
      else if (action === 'tags') this.handleSetTags(file);
      else this.sessionPanelHandle?.close();
    }, () => { this.sessionPanelHandle?.close(); });
    this.sessionPanelHandle = this.tui.showPanel(list, { anchor: 'center', offsetY: -5, panelHeight: 7, minWidth: 30 });
  }

  private handleRenameSession(file: string): void {
    const sessionDir = this.getSessionDir();
    const fullPath = path.join(sessionDir, file);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const session = JSON.parse(content);
      const currentName = session.name || file.replace('.json', '');
      const onEnter = (newName: string) => {
        if (!newName.trim()) {
          this.addMessage('system', 'Rename cancelled.');
          return;
        }
        session.name = newName.trim();
        fs.writeFileSync(fullPath, JSON.stringify(session, null, 2));
        this.addMessage('system', `Session renamed to: ${newName}`);
      };
      const onCancel = () => { this.addMessage('system', 'Rename cancelled.'); };
      const input = new InputBox(`Rename "${currentName}" to: `, onEnter, onCancel, this.theme);
      this.sessionPanelHandle = this.tui.showPanel(input, { anchor: 'center', offsetY: -5, width: 60, minWidth: 30 });
    } catch (e: any) {
      this.addMessage('system', `Error: ${e.message}`);
    }
  }

  private handleSetTags(file: string): void {
    const sessionDir = this.getSessionDir();
    const fullPath = path.join(sessionDir, file);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const session = JSON.parse(content);
      const currentTags = session.tags || [];
      const tagStr = currentTags.join(', ');
      const onEnter = (input: string) => {
        const newTags = input.split(',').map(t => t.trim()).filter(t => t.length > 0);
        session.tags = newTags;
        fs.writeFileSync(fullPath, JSON.stringify(session, null, 2));
        this.addMessage('system', `Tags set: ${newTags.join(', ')}`);
      };
      const onCancel = () => { this.addMessage('system', 'Tags unchanged.'); };
      const input = new InputBox(`Tags (comma-separated) [${tagStr}]: `, onEnter, onCancel, this.theme);
      this.sessionPanelHandle = this.tui.showPanel(input, { anchor: 'center', offsetY: -5, width: 60, minWidth: 30 });
    } catch (e: any) {
      this.addMessage('system', `Error: ${e.message}`);
    }
  }

  private getSessionDir(): string {
    return './.coding-agent/sessions';
  }

  private handleCommand(cmd: string): void {
    switch (cmd) {
      case 'provider-settings': this.showProviderSettings(); break;
      case 'app-settings': this.showAppSettings(); break;
      case 'search-recent-messages': this.showRecentSearchPanel(7); break;
      case 'search-messages': this.showSearchPanel(); break;
      case 'save-session': this.saveSession(); break;
      case 'load-session': this.loadSession(); break;
      case 'delete-session': this.deleteSessionDialog(); break;
      case 'list-sessions': this.showSessionListFilter(); break;
      case 'copy-last-code': this.copyLastCodeBlock(); break;
      case 'find-command': this.showCommandFinder(); break;
      case 'clear-memory': this.memory.clear(); this.addMessage('system', 'Memory cleared.'); break;
      case 'memory-stats': const s = this.memory.getStats(); this.addMessage('system', `Stats: ${JSON.stringify(s)}`); break;
case 'export-config': this.exportConfig(); break;
      case 'import-config': this.importConfig(); break;
      case 'toggle-theme': this.toggleTheme(); break;
      case 'config-push': this.pushConfig(); break;
      case 'config-pull': this.pullConfig(); break;
      case 'exit': this.onExit(); break;
    }
  }

  private toggleTheme(): void {
    const config = ConfigManager.getInstance();
    const current = config.getSetting('theme') as 'dark' | 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    config.setSetting('theme', next);
    const newColors = getTheme(next);
    this.setTheme(newColors);
    this.addMessage('system', `Theme changed to ${next}.`);
    this.announce(`Theme changed to ${next}`);
  }

  private async pushConfig(): Promise<void> {
    const onEnter = async (url: string) => {
      this.commandPanelHandle?.close();
      if (!url.trim()) return;
      try {
        const result = await remotePushConfig(url);
        this.addMessage('system', result);
      } catch (e: any) {
        this.addMessage('system', `Push failed: ${e.message}`);
      }
    };
    const onCancel = () => { this.commandPanelHandle?.close(); };
    const input = new InputBox('Push config to URL (PUT): ', onEnter, onCancel, this.theme);
    this.commandPanelHandle = this.tui.showPanel(input, { anchor: 'center', offsetY: -5, width: 60, minWidth: 30 });
  }

  private async pullConfig(): Promise<void> {
    const onEnter = async (url: string) => {
      this.commandPanelHandle?.close();
      if (!url.trim()) return;
      try {
        const result = await remotePullConfig(url);
        this.addMessage('system', result);
      } catch (e: any) {
        this.addMessage('system', `Pull failed: ${e.message}`);
      }
    };
    const onCancel = () => { this.commandPanelHandle?.close(); };
    const input = new InputBox('Pull config from URL (GET): ', onEnter, onCancel, this.theme);
    this.commandPanelHandle = this.tui.showPanel(input, { anchor: 'center', offsetY: -5, width: 60, minWidth: 30 });
  }

  private exportConfig(): void {
    const onEnter = (filePath: string) => {
      this.commandPanelHandle?.close();
      if (!filePath.trim()) return;
      try {
        const config = ConfigManager.getInstance().getConfig();
        const content = JSON.stringify(config, null, 2);
        fs.writeFileSync(filePath, content);
        this.addMessage('system', `Config exported to ${filePath}`);
      } catch (e: any) {
        this.addMessage('system', `Export failed: ${e.message}`);
      }
    };
    const onCancel = () => { this.commandPanelHandle?.close(); };
    const input = new InputBox('Export config to file: ', onEnter, onCancel, this.theme);
    this.commandPanelHandle = this.tui.showPanel(input, { anchor: 'center', offsetY: -5, width: 60, minWidth: 30 });
  }

  private importConfig(): void {
    const onEnter = async (filePath: string) => {
      this.commandPanelHandle?.close();
      if (!filePath.trim()) return;
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const config = JSON.parse(content);
        const result = ConfigValidator.validate(config);
        if (!result.valid) {
          this.addMessage('system', `Config validation errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
          return;
        }
        const dest = path.join(os.homedir(), '.picro', 'agent', 'config.json');
        fs.writeFileSync(dest, JSON.stringify(config, null, 2));
        this.addMessage('system', `Config imported from ${filePath}. Restart to apply.`);
      } catch (e: any) {
        this.addMessage('system', `Import failed: ${e.message}`);
      }
    };
    const onCancel = () => { this.commandPanelHandle?.close(); };
    const input = new InputBox('Import config from file: ', onEnter, onCancel, this.theme);
    this.commandPanelHandle = this.tui.showPanel(input, { anchor: 'center', offsetY: -5, width: 60, minWidth: 30 });
  }

  private showProviderSettings(): void {
    const config = ConfigManager.getInstance();
    const currentProvider = config.getCurrentProvider();
    const providers = getProviders();
    const providerItems: SelectItem[] = providers.map(p => ({ value: p, label: p, description: p === currentProvider ? 'current' : '' }));

    const selectProvider = new SelectList(providerItems, Math.min(providers.length + 2, 10), {}, (provider: string) => {
      const models = getModels(provider);
      const modelItems: SelectItem[] = (models as unknown as string[]).map((m: string) => ({ value: `${provider}/${m}`, label: m, description: '' }));
      const selectModel = new SelectList(modelItems, Math.min(models.length + 2, 10), {}, (fullModel: string) => {
        const [prov, model] = fullModel.split('/');
        config.setProvider(prov, model);
        this.addMessage('system', `Provider set to ${prov}/${model}. Restart TUI to apply.`);
        this.settingsPanelHandle?.close();
      }, () => { this.settingsPanelHandle?.close(); });
      this.settingsPanelHandle = this.tui.showPanel(selectModel, { anchor: 'center', offsetY: -5, panelHeight: Math.min(models.length + 4, 15), minWidth: 40 });
    }, () => { this.settingsPanelHandle?.close(); });

    this.settingsPanelHandle = this.tui.showPanel(selectProvider, { anchor: 'center', offsetY: -5, panelHeight: Math.min(providers.length + 4, 15), minWidth: 30 });
  }

  private showAppSettings(): void {
    const config = ConfigManager.getInstance();
    const settings = config.getSettings();

    const maxRoundsOptions = [1, 2, 5, 10, 20, 50];
    const maxRoundsItems: SettingItem[] = maxRoundsOptions.map(n => ({
      id: 'maxRounds',
      label: `Max Rounds: ${n}`,
      currentValue: settings.maxRounds === n ? 'on' : 'off',
      values: ['off', 'on'],
    }));

    const settingsList = new SettingsList(
      maxRoundsItems,
      Math.min(maxRoundsItems.length + 2, 10),
      {},
      (id: string, newValue: string) => {
        if (id === 'maxRounds') {
          const selected = maxRoundsItems.find(i => i.id === 'maxRounds');
          if (selected) {
            const roundStr = selected.label.split(': ')[1];
            config.updateSettings({ maxRounds: parseInt(roundStr) });
            this.addMessage('system', `Max rounds set to ${roundStr}`);
          }
        }
        this.settingsPanelHandle?.close();
      },
      () => { this.settingsPanelHandle?.close(); }
    );

    this.settingsPanelHandle = this.tui.showPanel(settingsList, { anchor: 'center', offsetY: -5, panelHeight: Math.min(maxRoundsItems.length + 4, 15), minWidth: 40 });
  }

  private saveSession(): void {
    const sessionDir = this.getSessionDir();
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
    const id = Date.now().toString(36);
    const file = `${sessionDir}/${id}.json`;
    const session = {
      id,
      messages: this.messages,
      savedAt: new Date().toISOString(),
    };
    fs.writeFileSync(file, JSON.stringify(session, null, 2));
    this.addMessage('system', `Session saved: ${id}`);
  }

  private listSessions(filterTag?: string): void {
    const sessionDir = this.getSessionDir();
    if (!fs.existsSync(sessionDir)) {
      this.addMessage('system', 'No sessions saved.');
      return;
    }
    const files = fs.readdirSync(sessionDir).filter((f: string) => f.endsWith('.json'));
    // Load session metadata (name, tags)
    const sessions: Array<{file: string, name: string, tags: string[]}> = [];
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(sessionDir, file), 'utf-8');
        const session = JSON.parse(content);
        sessions.push({
          file,
          name: session.name || file.replace('.json', ''),
          tags: Array.isArray(session.tags) ? session.tags : [],
        });
      } catch (e) {
        // ignore bad files
      }
    }
    // Apply tag filter
    const filtered = filterTag
      ? sessions.filter(s => s.tags.some(tag => tag.toLowerCase().includes(filterTag.toLowerCase())))
      : sessions;
    if (filtered.length === 0) {
      this.addMessage('system', `No sessions${filterTag ? ` with tag "${filterTag}"` : ''}.`);
      return;
    }
    const items: SelectItem[] = filtered.map(s => ({
      value: s.file,
      label: s.name,
      description: s.tags.join(', '),
    }));
    const list = new SelectList(items, Math.min(filtered.length + 2, 10), {}, () => {}, () => {});
    this.sessionPanelHandle = this.tui.showPanel(list, { anchor: 'center', offsetY: -5, panelHeight: Math.min(filtered.length + 4, 15), minWidth: 40 });
  }

  private showSessionListFilter(): void {
    if (this.sessionPanelHandle) {
      this.sessionPanelHandle.close();
      this.sessionPanelHandle = null;
      return;
    }
    const onEnter = (tag: string) => {
      this.sessionPanelHandle?.close();
      this.sessionPanelHandle = null;
      this.listSessions(tag.trim() || undefined);
    };
    const onCancel = () => {
      this.sessionPanelHandle?.close();
      this.sessionPanelHandle = null;
    };
    const input = new InputBox('Filter sessions by tag (optional): ', onEnter, onCancel, this.theme);
    this.sessionPanelHandle = this.tui.showPanel(input, { anchor: 'center', offsetY: -5, width: 60, minWidth: 30 });
  }

  private loadSession(): void {
    const sessionDir = this.getSessionDir();
    if (!fs.existsSync(sessionDir)) {
      this.addMessage('system', 'No sessions to load.');
      return;
    }
    const files = fs.readdirSync(sessionDir).filter((f: string) => f.endsWith('.json'));
    const items: SelectItem[] = files.map((f: string) => ({
      value: f,
      label: f.replace('.json', ''),
      description: '',
    }));
    const list = new SelectList(items, Math.min(items.length + 2, 10), {}, (file: string) => {
      const content = fs.readFileSync(`${sessionDir}/${file}`, 'utf-8');
      const session = JSON.parse(content);
      this.messages = session.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      this.messageList.setMessages(this.messages);
      this.addMessage('system', `Loaded session: ${session.id}`);
      this.sessionPanelHandle?.close();
    }, () => { this.sessionPanelHandle?.close(); });
    this.sessionPanelHandle = this.tui.showPanel(list, { anchor: 'center', offsetY: -5, panelHeight: Math.min(items.length + 4, 15), minWidth: 30 });
  }

  private deleteSessionDialog(): void {
    const sessionDir = this.getSessionDir();
    if (!fs.existsSync(sessionDir)) {
      this.addMessage('system', 'No sessions to delete.');
      return;
    }
    const files = fs.readdirSync(sessionDir).filter((f: string) => f.endsWith('.json'));
    const items: SelectItem[] = files.map((f: string) => ({ value: f, label: f.replace('.json', ''), description: '' }));
    const list = new SelectList(items, Math.min(items.length + 2, 10), {}, (file) => {
      // Confirm deletion
      const confirmItems: SelectItem[] = [
        { value: 'yes', label: 'Yes, delete', description: `Delete ${file.replace('.json', '')}` },
        { value: 'no', label: 'Cancel', description: 'Keep session' },
      ];
      const confirmList = new SelectList(confirmItems, 5, {}, (confirm: string) => {
        if (confirm === 'yes') {
          fs.unlinkSync(`${sessionDir}/${file}`);
          this.addMessage('system', `Deleted session: ${file.replace('.json', '')}`);
        }
        this.sessionPanelHandle?.close();
      }, () => { this.sessionPanelHandle?.close(); });
      this.sessionPanelHandle = this.tui.showPanel(confirmList, { anchor: 'center', offsetY: -5, panelHeight: 7, minWidth: 40 });
    }, () => { this.sessionPanelHandle?.close(); });
    this.sessionPanelHandle = this.tui.showPanel(list, { anchor: 'center', offsetY: -5, panelHeight: Math.min(items.length + 4, 15), minWidth: 30 });
  }

  private async processAgentResponse(userInput: string) {
    let loaderHandle: any = null;
    let offToolCall: (() => void) | null = null;
    let offToolResult: (() => void) | null = null;
    let offToolError: (() => void) | null = null;

    this.setStatus('Thinking...', 'yellow');
    this.isAgentRunning = true;
    try {
      const loader = new BorderedLoader(this.tui, this.theme, 'Starting...');
      loaderHandle = this.tui.showPanel(loader, { anchor: 'center', offsetY: -5 });

      // Listen to tool execution events for progress updates
      const emitter = (this.agent as any).emitter;
      if (emitter) {
        offToolCall = emitter.on('tool:call', (e: any) => {
          loader.setMessage(`Running: ${e.metadata?.toolName || 'tool'}`);
        });
        offToolResult = emitter.on('tool:result', (e: any) => {
          loader.setMessage(`Completed: ${e.metadata?.toolName || 'tool'}`);
        });
        offToolError = emitter.on('tool:error', (e: any) => {
          loader.setMessage(`Error: ${e.metadata?.toolName || 'tool'}`);
        });
      }

      const result = await this.agent.run(userInput);

      // Cleanup event listeners
      offToolCall?.(); offToolResult?.(); offToolError?.();
      loaderHandle?.close();

      this.setStatus('Ready', 'green');
      this.lastError = null;
      this.pendingInput = null;
      if (result.finalAnswer) {
        const memCount = this.retrievedMemories?.length || 0;
        const answer = result.finalAnswer + (memCount > 0 ? `\n\n*${memCount} memory${memCount===1?'':'ies'} retrieved*` : '');
        this.addMessage('assistant', answer);
      } else this.addMessage('assistant', 'No response.');
      if (result.toolResults?.length) {
        for (const tr of result.toolResults) {
          const icon = tr.isError ? '❌' : '✅';
          const msg = tr.isError ? this.formatUserFriendlyError({ message: tr.error }) : tr.result;
          this.addMessage('tool', `${icon} ${tr.toolName}: ${msg}`);
        }
      }
    } catch (e: any) {
      offToolCall?.(); offToolResult?.(); offToolError?.();
      loaderHandle?.close();
      // If aborted, don't treat as error
      if (e.message === 'Cancelled by user' || e.message === 'Tool execution aborted') {
        this.setStatus('Cancelled', 'yellow');
        this.addMessage('system', '⚠️ Operation cancelled');
      } else {
        this.lastError = e;
        this.pendingInput = userInput;
        const friendly = this.formatUserFriendlyError(e);
        const msg = isNetworkError(e) ? `Network error (press R to retry)` : `${friendly} (press R to retry)`;
        this.setStatus(msg, 'red');
        this.addMessage('system', `❌ ${friendly}`);
      }
    } finally {
      this.isAgentRunning = false;
    }
  }

  private retryLast(): void {
    if (this.lastError && this.pendingInput) {
      this.processAgentResponse(this.pendingInput);
    }
  }

  /** Format error into user-friendly message */
  private formatUserFriendlyError(e: any): string {
    const msg = e?.message || String(e);
    // File system errors
    if (msg.includes('ENOENT')) {
      return `File not found. Check the path and try again.`;
    }
    if (msg.includes('EACCES') || msg.includes('EPERM')) {
      return `Permission denied. Ensure you have access to the file/directory.`;
    }
    if (msg.includes('EISDIR')) {
      return `Path is a directory, but a file was expected.`;
    }
    if (msg.includes('EINVAL')) {
      return `Invalid argument. Check your input.`;
    }
    // Network errors
    if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND') || msg.includes('ECONNRESET') || msg.includes('EHOSTUNREACH')) {
      return `Network error. Check your internet connection and API configuration. Press R to retry.`;
    }
    // Out of disk space
    if (msg.includes('ENOSPC')) {
      return `Out of disk space. Free up space and try again.`;
    }
    // Default
    return msg;
  }
}

export async function startTUIMode() {
  const config = ConfigManager.getInstance();
  const modelDef = getModel(config.getCurrentProvider(), config.getCurrentModel());
  if (!modelDef) { console.error('Model not found'); process.exit(1); }

  // Auto-adjust maxContextTokens based on model's context window (90%)
  if (modelDef.contextWindow) {
    const newMax = Math.floor(modelDef.contextWindow * 0.9);
    config.updateSettings({ maxContextTokens: newMax });
  }

  const llm = createLLMInstance(modelDef);
  const memoryStore = new MemoryStore('./.coding-agent/memory.json');
  const memory = new AgentMemoryApp(memoryStore);

  const tools: ToolDefinition[] = [
    ...new FileTools().getTools(),
    ...new CodeTools().getTools(),
    ...new CommandTools().getTools(),
    ...new SearchTools().getTools(),
  ];

  // Setup TUI early with a loading spinner
  const tui = new TerminalUI(new ProcessTerminal(), false);
  const loaderTheme = getTheme(config.getSetting('theme') as 'dark' | 'light');
  const loader = new BorderedLoader(tui, loaderTheme, 'Loading memory...');
  const loaderHandle = tui.showPanel(loader, { anchor: 'center', offsetY: -5 });
  tui.append(loader);

  // History persistence and graceful exit
  let chat: ChatUI | null = null;
  const historyStore = new HistoryStore();
  const commandHistory = await historyStore.load();
  const exitCallback = async () => {
    if (chat) await historyStore.save(chat.getCommandHistory());
    tui.stop();
    process.exit(0);
  };
  process.on('SIGINT', exitCallback);
  process.on('SIGTERM', exitCallback);

  try {
    console.log('\n Starting TUI...');
    tui.start();

    // Initialize memory while TUI displays loading spinner
    await memory.init();

    // Close loader
    loaderHandle.close();

    // Create agent and chat UI after memory is ready
    const settings = config.getSettings();
    // Create an AIModel object from the model definition
    const aiModel: AIModel = {
      id: modelDef.id,
      name: modelDef.name || modelDef.id,
      api: modelDef.api || 'unknown',
      provider: modelDef.provider || 'unknown',
      baseUrl: modelDef.baseUrl,
      reasoning: modelDef.reasoning ?? false,
      contextWindow: modelDef.contextWindow ?? 32768,
      maxTokens: modelDef.maxTokens ?? 4096,
      inputCost: modelDef.cost.input,
      outputCost: modelDef.cost.output,
      cacheReadCost: modelDef.cost.cacheRead,
      cacheWriteCost: modelDef.cost.cacheWrite,
    };
    const agent = new Agent(aiModel, tools, {
      maxRounds: settings.maxRounds,
      autoSaveMemories: true,
      memoryStore: createMemoryStoreAdapter(memory),
    });
    // Set the LLM provider and stream provider
    const llmInstance = createLLMInstance(modelDef);
    agent.setLLMProvider(llmInstance.chatWithTools.bind(llmInstance));
    agent.setStreamProvider((prompt: string, tools: any[], options?: any) => {
      return stream(modelDef, { 
        messages: [{ role: 'user' as const, content: prompt, timestamp: Date.now() }],
        tools: tools
      }, options);
    });

    chat = new ChatUI(agent, memory, tui, loaderTheme, commandHistory, exitCallback);
    tui.append(chat);
    const welcomeMessage = [
      `Welcome to pi-micro! 🤖`,
      ``,
      `Provider: ${config.getCurrentProvider()}/${config.getCurrentModel()}`,
      ``,
      `Quick Actions:`,
      `  Ctrl+P  - Command palette`,
      `  Ctrl+S  - Search messages`,
      `  Ctrl+M  - Memory panel`,
      `  Ctrl+C  - Cancel/Close panel`,
      `  ↑/↓     - Navigate history`,
      ``,
      `Type your message below or use Ctrl+P for more options.`,
    ].join('\n');
    chat.addMessage('system', welcomeMessage);
    tui.setFocus(chat);
    tui.addKeyHandler((key) => {
      if (key.raw === '\x03') {
        exitCallback();
        return { consume: true };
      }
    });
  } catch (err) {
    loaderHandle.close();
    tui.stop();
    console.error('Failed to start:', err);
    process.exit(1);
  }
}
