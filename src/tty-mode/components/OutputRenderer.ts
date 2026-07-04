// OutputRenderer – Manages output to terminal (assistant responses, status, errors)
export class OutputRenderer {
  private showCursorOnWrite: boolean;

  constructor(showCursorOnWrite?: boolean) {
    this.showCursorOnWrite = showCursorOnWrite ?? false;
  }

  clearLine(): void {
    process.stdout.write('\x1b[2K\r');
  }

  clearScreen(): void {
    process.stdout.write('\x1b[2J\x1b[H');
  }

  showThinking(): void {
    this.clearLine();
    process.stdout.write('\r\x1b[2K⏳ Thinking...');
    if (this.showCursorOnWrite) process.stdout.write('\x1b[?25h'); // show cursor
  }

  showAssistantResponse(text: string): void {
    process.stdout.write('\n');
    process.stdout.write(text);
    process.stdout.write('\n');
  }

  showError(message: string): void {
    process.stdout.write(`\r\x1b[2K❌ Error: ${message}\n`);
  }

  showInfo(message: string): void {
    process.stdout.write(`\r\x1b[2Kℹ️ ${message}\n`);
  }

  showSuccess(message: string): void {
    process.stdout.write(`\r\x1b[2K✅ ${message}\n`);
  }

  showPrompt(prompt: string): void {
    process.stdout.write(prompt);
  }

  hideCursor(): void {
    process.stdout.write('\x1b[?25l');
  }

  showCursor(): void {
    process.stdout.write('\x1b[?25h');
  }

  moveUp(lines: number): void {
    process.stdout.write(`\x1b[${lines}A`);
  }
}
