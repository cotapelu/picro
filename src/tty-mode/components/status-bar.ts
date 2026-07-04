// StatusBar – Shows runtime status (model, context usage, etc.)
export class StatusBar {
  private static readonly WIDTH = 80;

  print(model?: string, contextUsage?: { tokens: number; contextWindow: number; percent: number }, message?: string): void {
    process.stdout.write('\r\x1b[2K');
    const parts: string[] = [];

    if (model) {
      parts.push(`📦 ${model}`);
    }

    if (contextUsage) {
      const bar = this.renderBar(contextUsage.percent);
      parts.push(`🧠 ${contextUsage.tokens}/${contextUsage.contextWindow} ${bar}`);
    }

    if (message) {
      parts.push(message);
    }

    const line = parts.join(' │ ');
    process.stdout.write(line.padEnd(80));
  }

  private renderBar(percent: number): string {
    const width = 20;
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}] ${Math.round(percent)}%`;
  }

  clear(): void {
    process.stdout.write('\r\x1b[2K');
  }
}
