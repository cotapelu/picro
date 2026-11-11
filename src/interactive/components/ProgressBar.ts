// ProgressBar component - for loading/processing indicators

export interface ProgressBarProps {
  /**
   * Progress value (0 to 1)
   */
  value: number;
  /**
   * Total width in characters
   */
  width?: number;
  /**
   * Progress bar character (default: █)
   */
  fillChar?: string;
  /**
   * Empty bar character (default: ░)
   */
  emptyChar?: string;
  /**
   * Show percentage text
   */
  showPercentage?: boolean;
  /**
   * Color for filled portion (ANSI)
   */
  fillColor?: string;
  /**
   * Color for empty portion
   */
  emptyColor?: string;
}

export function renderProgressBar(props: ProgressBarProps): string {
  const width = props.width || 40;
  const fillChar = props.fillChar || '█';
  const emptyChar = props.emptyChar || '░';
  const showPct = props.showPercentage !== false;
  const fillColor = props.fillColor || 'cyan';
  const emptyColor = props.emptyColor || 'brightBlack';

  // Clamp value
  const value = Math.max(0, Math.min(1, props.value));

  // Calculate filled width
  const filledWidth = Math.round(width * value);
  const emptyWidth = width - filledWidth;

  // Build bar
  const filled = fillChar.repeat(filledWidth);
  const empty = emptyChar.repeat(emptyWidth);

  // Colorize
  const filledColored = ansiColorize(filled, fillColor);
  const emptyColored = ansiColorize(empty, emptyColor);

  const bar = filledColored + emptyColored;

  const pctText = showPct ? ` ${Math.round(value * 100)}%` : '';

  return `[${bar}]${pctText}`;
}

function ansiColorize(text: string, colorName: string): string {
  const colorMap: Record<string, string> = {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    brightBlack: '\x1b[90m',
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',
    brightWhite: '\x1b[97m',
  };
  const color = colorMap[colorName];
  if (color) {
    return color + text + '\x1b[0m';
  }
  return text;
}

export function createSpinner(text = '', width = 40): () => string {
  const spinner = `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`;
  const frames = spinner.split('');
  let frameIndex = 0;

  return function getSpinnerFrame(): string {
    const frame = frames[frameIndex];
    frameIndex = (frameIndex + 1) % frames.length;
    return `${frame} ${text}`;
  };
}
