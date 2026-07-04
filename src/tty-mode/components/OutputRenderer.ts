// OutputRenderer – Rich terminal output with colors, markdown, spinners
import { formatSize, truncateTail } from '../../utils/truncate.js';

export interface Theme {
  user: string;
  assistant: string;
  system: string;
  tool: string;
  error: string;
  success: string;
  info: string;
  codeBg: string;
  codeText: string;
}

export const DARK_THEME: Theme = {
  user: '\x1b[36m',    // Cyan
  assistant: '\x1b[32m', // Green
  system: '\x1b[33m',   // Yellow
  tool: '\x1b[90m',     // Gray
  error: '\x1b[31m',    // Red
  success: '\x1b[32;1m', // Bright Green
  info: '\x1b[34m',     // Blue
  codeBg: '\x1b[48;5;235m',
  codeText: '\x1b[36m',
};

export const LIGHT_THEME: Theme = {
  user: '\x1b[36m',
  assistant: '\x1b[32m',
  system: '\x1b[33m',
  tool: '\x1b[90m',
  error: '\x1b[31m',
  success: '\x1b[32;1m',
  info: '\x1b[34m',
  codeBg: '\x1b[48;5;255m',
  codeText: '\x1b[34m',
};

export const MATRIX_THEME: Theme = {
  user: '\x1b[32m', // green
  assistant: '\x1b[33m', // yellow
  system: '\x1b[36m', // cyan
  tool: '\x1b[90m',
  error: '\x1b[31m',
  success: '\x1b[32;1m',
  info: '\x1b[34m',
  codeBg: '\x1b[48;5;22m', // dark green background
  codeText: '\x1b[32;1m',
};

export class OutputRenderer {
  private theme: Theme;
  private spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private spinnerIndex = 0;
  private spinnerInterval?: NodeJS.Timeout;
  private showSpinner = false;

  constructor(theme: Theme = DARK_THEME) {
    this.theme = theme;
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
  }

  reset(): void {
    process.stdout.write('\x1b[0m');
  }

  clearLine(): void {
    process.stdout.write('\x1b[2K\r');
  }

  clearScreen(): void {
    process.stdout.write('\x1b[2J\x1b[H');
  }

  hideCursor(): void {
    process.stdout.write('\x1b[?25l');
  }

  showCursor(): void {
    process.stdout.write('\x1b[?25h');
  }

  moveUp(lines: number = 1): void {
    process.stdout.write(`\x1b[${lines}A`);
  }

  showThinking(message?: string): void {
    this.clearLine();
    process.stdout.write(`\r\x1b[2K⏳ ${message || 'Thinking...'}\x1b[0m`);
  }

  // Spinner
  startSpinner(message?: string): void {
    if (this.showSpinner) return;
    this.showSpinner = true;
    const msg = message || 'Processing';
    this.spinnerIndex = 0;
    const write = () => {
      process.stdout.write(`\r\x1b[2K${this.theme.info}${msg} ${this.spinnerFrames[this.spinnerIndex]}\x1b[0m`);
      this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
    };
    write();
    this.spinnerInterval = setInterval(write, 80);
  }

  stopSpinner(success: boolean = true, finalMessage?: string): void {
    if (!this.showSpinner) return;
    this.showSpinner = false;
    if (this.spinnerInterval) clearInterval(this.spinnerInterval);
    const prefix = success ? this.theme.success : this.theme.error;
    const status = success ? '✓' : '✗';
    const msg = finalMessage || (success ? 'Done' : 'Failed');
    process.stdout.write(`\r\x1b[2K${prefix}${status} ${msg}\x1b[0m\n`);
  }

  // Structured output
  user(text: string): void {
    this.writeSection(this.theme.user, `👤 You:\n${this.indent(text)}`);
  }

  assistant(text: string): void {
    const rendered = this.renderMarkdown(text);
    this.writeSection(this.theme.assistant, `🤖 Assistant:\n${rendered}`);
  }

  showAssistantResponse(text: string): void {
    this.assistant(text);
  }

  system(text: string): void {
    this.writeSection(this.theme.system, `⚙️  System:\n${this.indent(text)}`);
  }

  tool(name: string, content: string, truncated: boolean = false): void {
    let msg = `🛠️  [${name}]\n`;
    if (truncated) {
      msg += `${this.theme.tool}${this.indent(content)}\n\x1b[0m\x1b[33m[output truncated]\x1b[0m`;
    } else {
      msg += `${this.theme.tool}${this.indent(content)}\x1b[0m`;
    }
    process.stdout.write(msg);
  }

  error(message: string): void {
    this.writeSection(this.theme.error, `❌ Error:\n${this.indent(message)}`);
  }

  showError(message: string): void {
    this.error(message);
  }

  success(message: string): void {
    this.writeSection(this.theme.success, `✅ ${message}`);
  }

  info(message: string): void {
    this.writeSection(this.theme.info, `ℹ️  ${message}`);
  }

  // Code formatting
  codeBlock(language: string, code: string): void {
    process.stdout.write(`${this.theme.codeBg}${this.theme.codeText}`);
    process.stdout.write(`\n┌─ ${language} ─${'─'.repeat(50)}\n`);
    process.stdout.write(this.indent(code.trimEnd()));
    process.stdout.write(`\n└${'─'.repeat(55)}\n`);
    this.reset();
  }

  table(headers: string[], rows: string[][]): void {
    const widths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => r[i]?.length || 0)));
    const line = '┌' + widths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
    const header = '│' + headers.map((h, i) => h.padEnd(widths[i] + 2)).join('│') + '│';
    const sep = '├' + widths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
    process.stdout.write(`\n${line}\n`);
    process.stdout.write(`${header}\n`);
    process.stdout.write(`${sep}\n`);
    for (const row of rows) {
      const cells = row.map((c, i) => (c || '').padEnd(widths[i] + 2));
      process.stdout.write('│' + cells.join('│') + '│\n');
    }
    process.stdout.write(line + '\n');
  }

  // Progress bar
  progress(current: number, total: number, label?: string): void {
    const percent = Math.round((current / total) * 100);
    const width = 40;
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const msg = label ? ` ${label}` : '';
    process.stdout.write(`\r\x1b[2K[${bar}] ${percent}%${msg}`);
    if (current >= total) process.stdout.write('\n');
  }

  // Helpers
  private writeSection(color: string, content: string): void {
    process.stdout.write(`\n${color}${content}\x1b[0m\n`);
  }

  private indent(text: string): string {
    return text.split('\n').map(l => '  ' + l).join('\n');
  }

  private renderMarkdown(text: string): string {
    // Very simple markdown: code blocks, bold, inline code
    let html = text
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => `\n${this.theme.codeBg}${this.theme.codeText}${this.indent(code.trimEnd())}\x1b[0m\n`)
      .replace(/\*\*(.*?)\*\*/g, `${this.theme.assistant}**$1**\x1b[0m`)
      .replace(/`([^`]+)`/g, `${this.theme.codeBg}${this.theme.codeText}` + '`$1`' + '\x1b[0m');
    return html;
  }
}
