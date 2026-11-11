// Terminal - tương tác terminal thật qua process.stdin/stdout
// Bắt chước nguyên tắc pi-tui terminal.ts:
//   - start(): bật raw mode, bracketed paste, hỏi giao thức bàn phím
//   - stop(): trả terminal về chế độ thường
//   - StdinBuffer tách sequence rời mảnh
//   - diwindoInput(): chờ dữ liệu cạn trước khi thoát
//   - Các lệnh con trỏ/màn hình/quản lý tiêu đề/tiến độ
// Port sang TSX riêng, khong copy code truc iep.

import * as fs from "node:fs";
import { StdinBuffer } from "./StdinBuffer.js";
import { setKittyProtocolActive } from "./Keys.js";
import { parseKeyboardProtocolFlags } from "./TerminalProtocol.js";
import { formatProgramStatus, isProgramStatusReply, PROGRAM_STATUS_QUERY, type ProgramStatus } from "./ProgramStatus.js";

const TERMINAL_PROGRESS_ACTIVE = "\x1b]9;4;3\x07";
const TERMINAL_PROGRESS_CLEAR = "\x1b]9;4;0\x07";
const PROGRESS_KEEPALIVE_MS = 1000;
const NATIVE_SHIFT_ENTER = "\x1b[13;2u";
const DESIRED_KITTY_FLAGS = 7;
const KITTY_QUERY = `\x1b[>${DESIRED_KITTY_FLAGS}u\x1b[?u`;
const DEVICE_ATTRIBUTES = "\x1b[c";

export interface Terminal {
  start(onInput: (data: string) => void, onResize: () => void): void;
  stop(): void;
  restoreOnExit?(before: string, after: string): void;
  drainInput(maxMs?: number, idleMs?: number): Promise<void>;
  write(data: string): void;
  readonly columns: number;
  readonly rows: number;
  readonly kittyProtocolActive: boolean;
  moveBy(lines: number): void;
  hideCursor(): void;
  showCursor(): void;
  clearLine(): void;
  clearFromCursor(): void;
  clearScreen(): void;
  setTitle(title: string): void;
  setProgress(active: boolean): void;
  setProgramStatus(status: ProgramStatus): void;
}

function isAppleTerminal(): boolean {
  return process.platform === "darwin" && process.env.TERM_PROGRAM === "Apple_Terminal";
}

/** Làm mới kíchh thước terminal bằng cách gửi SIGWINCH cho chính mình. */
function refreshDimensions(): void {
  if (process.platform === "win32" || process.pid <= 0) return;
  try {
    process.kill(process.pid, "SIGWINCH");
  } catch {
    // Không cho phép gửi tín hiệu -> bỏ qua.
  }
}

const DEFAULT_ESCAPE_TIMEOUT_MS = 10;
const DEFAULT_SSH_ESCAPE_TIMEOUT_MS = 100;

function resolveEscapeTimeout(): number {
  const configured = Number(process.env.PI_TUI_ESC_TIMEOUT);
  if (Number.isFinite(configured) && configured > 0) return configured;
  if (process.env.SSH_CONNECTION || process.env.SSH_TTY) return DEFAULT_SSH_ESCAPE_TIMEOUT_MS;
  return DEFAULT_ESCAPE_TIMEOUT_MS;
}

export class ProcessTerminal implements Terminal {
  private wasRaw = false;
  private inputHandler?: (data: string) => void;
  private resizeHandler?: () => void;
  private kittyActive = false;
  private modifyOtherKeysActive = false;
  private pendingDeviceAttributes = 0;
  private stdinBuffer?: StdinBuffer;
  private stdinDataHandler?: (data: string) => void;
  private progressInterval?: ReturnType<typeof setInterval>;
  private programStatus?: ProgramStatus;
  private programStatusSupported = false;
  private programStatusPending = false;
  private writeLogPath: string;

  constructor(logPath = process.env.PI_TUI_WRITE_LOG ?? "") {
    this.writeLogPath = logPath;
  }

  get kittyProtocolActive(): boolean {
    return this.kittyActive;
  }

  start(onInput: (data: string) => void, onResize: () => void): void {
    this.inputHandler = onInput;
    this.resizeHandler = onResize;

    this.wasRaw = process.stdin.isRaw || false;
    if (process.stdin.setRawMode) process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();

    process.stdout.write("\x1b[?2004h"); // bracketed paste
    process.stdout.on("resize", this.resizeHandler);
    refreshDimensions();
    this.queryKeyboardProtocol();
  }

  private setupStdinBuffer(): void {
    this.stdinBuffer = new StdinBuffer({ escapeTimeout: resolveEscapeTimeout() });

    this.stdinBuffer.on("data", (sequence) => {
      if (isProgramStatusReply(sequence)) {
        if (this.programStatusPending) {
          this.programStatusPending = false;
          this.programStatusSupported = true;
          this.writeProgramStatus();
        }
        return;
      }
      const flags = parseKeyboardProtocolFlags(sequence);
      if (flags !== undefined) {
        this.handleKeyboardFlags(flags);
        return;
      }
      if (sequence === DEVICE_ATTRIBUTES) {
        if (this.pendingDeviceAttributes === 0) return;
        this.pendingDeviceAttributes -= 1;
        if (this.pendingDeviceAttributes === 0) this.programStatusPending = false;
        if (!this.kittyActive) this.enableModifyOtherKeys();
        return;
      }
      this.forwardInput(sequence);
    });

    this.stdinBuffer.on("paste", (content) => {
      this.inputHandler?.(`\x1b[200~${content}\x1b[201~`);
    });

    this.stdinDataHandler = (data) => this.stdinBuffer!.process(data);
  }

  private queryKeyboardProtocol(): void {
    this.setupStdinBuffer();
    process.stdin.on("data", this.stdinDataHandler!);
    this.pendingDeviceAttributes += 1;
    const override = process.env.PI_PROGRAM_STATUS;
    this.programStatusSupported = override === "1";
    this.programStatusPending = override !== "1" && override !== "0";
    process.stdout.write(`${KITTY_QUERY}${this.programStatusPending ? PROGRAM_STATUS_QUERY : ""}${DEVICE_ATTRIBUTES}`);
    this.writeProgramStatus();
  }

  private handleKeyboardFlags(flags: number): void {
    if (flags !== 0) {
      if (!this.kittyActive) {
        this.kittyActive = true;
        setKittyProtocolActive(true);
      }
    } else {
      this.enableModifyOtherKeys();
    }
  }

  private forwardInput(sequence: string): void {
    if (!this.inputHandler) return;
    let input = sequence;
    if ((sequence === "\r" || sequence === "\x1b\r") && isAppleTerminal()) {
      // Apple Terminal gửi ESC+CR cho Shift+Enter.
      input = NATIVE_SHIFT_ENTER;
    }
    this.inputHandler(input);
  }

  private enableModifyOtherKeys(): void {
    if (this.kittyActive || this.modifyOtherKeysActive) return;
    process.stdout.write("\x1b[>4;2m");
    this.modifyOtherKeysActive = true;
  }

  private disableModifyOtherKeys(): void {
    if (!this.modifyOtherKeysActive) return;
    process.stdout.write("\x1b[>4;0m");
    this.modifyOtherKeysActive = false;
  }

  async drainInput(maxMs = 1000, idleMs = 50): Promise<void> {
    const shouldDisableKitty = this.kittyActive;
    if (shouldDisableKitty) {
      process.stdout.write("\x1b[<u");
      this.kittyActive = false;
      setKittyProtocolActive(false);
    }
    this.disableModifyOtherKeys();

    const previous = this.inputHandler;
    this.inputHandler = undefined;

    let lastData = Date.now();
    const onData = () => {
      lastData = Date.now();
    };
    process.stdin.on("data", onData);
    const endTime = Date.now() + maxMs;

    try {
      while (true) {
        const now = Date.now();
        if (now >= endTime) break;
        if (now - lastData >= idleMs) break;
        await new Promise((resolve) => setTimeout(resolve, Math.min(idleMs, endTime - now)));
      }
    } finally {
      process.stdin.removeListener("data", onData);
      this.inputHandler = previous;
    }
  }

  stop(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = undefined;
      process.stdout.write(TERMINAL_PROGRESS_CLEAR);
    }
    if (this.programStatusSupported && this.programStatus) {
      process.stdout.write(formatProgramStatus({ state: "clear" }));
    }
    this.programStatusSupported = false;
    this.programStatusPending = false;
    process.stdout.write("\x1b[?2004l");

    if (this.kittyActive) {
      process.stdout.write("\x1b[<u");
      this.kittyActive = false;
      setKittyProtocolActive(false);
    }
    this.disableModifyOtherKeys();

    this.stdinBuffer?.destroy();
    this.stdinBuffer = undefined;

    if (this.stdinDataHandler) {
      process.stdin.removeListener("data", this.stdinDataHandler);
      this.stdinDataHandler = undefined;
    }
    this.inputHandler = undefined;
    if (this.resizeHandler) {
      process.stdout.removeListener("resize", this.resizeHandler);
      this.resizeHandler = undefined;
    }
    process.stdin.pause();
    if (process.stdin.setRawMode) process.stdin.setRawMode(this.wasRaw);
  }

  restoreOnExit(before: string, after: string): void {
    let sequence = before;
    if (this.progressInterval) sequence += TERMINAL_PROGRESS_CLEAR;
    sequence += "\x1b[?2004l";
    if (this.kittyActive) sequence += "\x1b[<u";
    if (this.modifyOtherKeysActive) sequence += "\x1b[>4;0m";
    sequence += after;
    try {
      fs.writeSync(process.stdout.fd, sequence);
    } catch {
      // Terminal có thể đã biến mất.
    }
  }

  write(data: string): void {
    process.stdout.write(data);
    if (this.writeLogPath) {
      try {
        fs.appendFileSync(this.writeLogPath, data, { encoding: "utf8" });
      } catch {
        // Bỏ qua lỗi ghi log.
      }
    }
  }

  get columns(): number {
    return process.stdout.columns || Number(process.env.COLUMNS) || 80;
  }

  get rows(): number {
    return process.stdout.rows || Number(process.env.LINES) || 24;
  }

  moveBy(lines: number): void {
    if (lines > 0) process.stdout.write(`\x1b[${lines}B`);
    else if (lines < 0) process.stdout.write(`\x1b[${-lines}A`);
  }

  hideCursor(): void {
    process.stdout.write("\x1b[?25l");
  }

  showCursor(): void {
    process.stdout.write("\x1b[?25h");
  }

  clearLine(): void {
    process.stdout.write("\x1b[K");
  }

  clearFromCursor(): void {
    process.stdout.write("\x1b[J");
  }

  clearScreen(): void {
    process.stdout.write("\x1b[2J\x1b[H");
  }

  setTitle(title: string): void {
    const safe = title.replace(/[\r\n\t]/g, " ");
    process.stdout.write(`\x1b]0;${safe}\x07`);
  }

  setProgramStatus(status: ProgramStatus): void {
    this.programStatus = status.state === "clear" ? undefined : status;
    if (this.programStatusSupported) process.stdout.write(formatProgramStatus(status));
  }

  private writeProgramStatus(): void {
    if (this.programStatusSupported && this.programStatus) {
      process.stdout.write(formatProgramStatus(this.programStatus));
    }
  }

  setProgress(active: boolean): void {
    if (active) {
      process.stdout.write(TERMINAL_PROGRESS_ACTIVE);
      if (!this.progressInterval) {
        this.progressInterval = setInterval(() => {
          process.stdout.write(TERMINAL_PROGRESS_ACTIVE);
        }, PROGRESS_KEEPALIVE_MS);
      }
    } else {
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = undefined;
      }
      process.stdout.write(TERMINAL_PROGRESS_CLEAR);
    }
  }
}
