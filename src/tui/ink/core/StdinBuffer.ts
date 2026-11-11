// StdinBuffer - đệm đầu vào và tách chuỗi escape hoàn chỉnh
// Bắt chước nguyên tắc pi-tui stdin-buffer.ts:
//   - Gom dữ liệu stdin đến theo từng mảnh thành sequence hoàn chỉnh
//   - Nhận diện CSI/OSC/DCS/APC, chuỗi chuột SGR, bracketed paste
//   - Timeout cho ESC đơn và sequence dở dang
// Port sang TSX riêng, khong copy code truc iep.

import { EventEmitter } from "node:events";

const ESC = "\x1b";
const DEFAULT_SEQUENCE_TIMEOUT_MS = 50;
const DEFAULT_ESCAPE_TIMEOUT_MS = 10;
const BRACKETED_PASTE_START = "\x1b[200~";
const BRACKETED_PASTE_END = "\x1b[201~";

const TERMINAL_REPLY_HEADER_PATTERN =
  /^\x1b(?:\](?:1[01];|4;\d{1,3};|7501;\?)|P>\||_G(?:[a-z]=\d+,)*[a-z]=\d+;)/;

function isControlString(data: string): boolean {
  return data.startsWith(`${ESC}]`) || data.startsWith(`${ESC}P`) || data.startsWith(`${ESC}_`);
}

function isCompleteSequence(data: string): "complete" | "incomplete" | "not-escape" {
  if (!data.startsWith(ESC)) return "not-escape";
  if (data.length === 1) return "incomplete";
  const after = data.slice(1);

  if (after.startsWith("[")) {
    if (after.startsWith("[M")) return data.length >= 6 ? "complete" : "incomplete";
    return isCompleteCsi(data);
  }
  if (after.startsWith("]")) return isCompleteOsc(data);
  if (after.startsWith("P")) return data.endsWith(`${ESC}\\`) ? "complete" : "incomplete";
  if (after.startsWith("_")) return data.endsWith(`${ESC}\\`) ? "complete" : "incomplete";
  if (after.startsWith("O")) return after.length >= 2 ? "complete" : "incomplete";
  if (after.length === 1) return "complete";
  return "complete";
}

function isCompleteCsi(data: string): "complete" | "incomplete" {
  if (!data.startsWith(`${ESC}[`)) return "complete";
  if (data.length < 3) return "incomplete";
  const payload = data.slice(2);
  const last = payload[payload.length - 1]!;
  const lastCode = last.charCodeAt(0);
  if (lastCode >= 0x40 && lastCode <= 0x7e) {
    if (payload.startsWith("<")) {
      if (/^<\d+;\d+;\d+[Mm]$/.test(payload)) return "complete";
      if (last === "M" || last === "m") {
        const parts = payload.slice(1, -1).split(";");
        if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) return "complete";
      }
      return "incomplete";
    }
    return "complete";
  }
  return "incomplete";
}

function isCompleteOsc(data: string): "complete" | "incomplete" {
  if (!data.startsWith(`${ESC}]`)) return "complete";
  return data.endsWith(`${ESC}\\`) || data.endsWith("\x07") ? "complete" : "incomplete";
}

function parseUnmodifiedKittyPrintable(sequence: string): number | undefined {
  const match = /^\x1b\[(\d+)(?::\d*)?(?::\d+)?u$/.exec(sequence);
  if (!match) return undefined;
  const cp = Number.parseInt(match[1]!, 10);
  return cp >= 32 ? cp : undefined;
}

function extractCompleteSequences(buffer: string): { sequences: string[]; remainder: string } {
  const sequences: string[] = [];
  let pos = 0;

  while (pos < buffer.length) {
    const remaining = buffer.slice(pos);
    if (remaining.startsWith(ESC)) {
      const terminalReply = isControlString(remaining) && TERMINAL_REPLY_HEADER_PATTERN.test(remaining);
      let seqEnd = 1;
      while (seqEnd <= remaining.length) {
        if (terminalReply && seqEnd > 2) {
          const char = remaining[seqEnd - 1];
          if (char === "\x18" || char === "\x1a") {
            pos += seqEnd;
            break;
          }
          if (char === ESC && seqEnd < remaining.length && remaining[seqEnd] !== "\\") {
            pos += seqEnd - 1;
            break;
          }
        }
        const candidate = remaining.slice(0, seqEnd);
        if (isCompleteSequence(candidate) === "complete") {
          if (candidate === "\x1b\x1b") {
            const nextChar = remaining[seqEnd];
            if (nextChar === "[" || nextChar === "]" || nextChar === "O" || nextChar === "P" || nextChar === "_") {
              sequences.push(ESC);
              pos += 1;
              break;
            }
          }
          sequences.push(candidate);
          pos += seqEnd;
          break;
        }
        seqEnd++;
      }
      if (seqEnd > remaining.length) return { sequences, remainder: remaining };
    } else {
      sequences.push(remaining[0]!);
      pos++;
    }
  }
  return { sequences, remainder: "" };
}

export interface StdinBufferEvents {
  data: [string];
  paste: [string];
}

export class StdinBuffer extends EventEmitter {
  private buffer = "";
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private readonly timeoutMs: number;
  private readonly escapeTimeoutMs: number;
  private pasteMode = false;
  private pasteBuffer = "";
  private pendingKittyPrintable: number | undefined;

  constructor(options: { timeout?: number; escapeTimeout?: number } = {}) {
    super();
    this.timeoutMs = options.timeout ?? DEFAULT_SEQUENCE_TIMEOUT_MS;
    this.escapeTimeoutMs = options.escapeTimeout ?? DEFAULT_ESCAPE_TIMEOUT_MS;
  }

  process(data: string | Buffer): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    let str: string;
    if (Buffer.isBuffer(data)) {
      if (data.length === 1 && data[0]! > 127) str = `${ESC}${String.fromCharCode(data[0]! - 128)}`;
      else str = data.toString();
    } else {
      str = data;
    }
    if (str.length === 0 && this.buffer.length === 0) {
      this.emit("data", "");
      return;
    }
    this.buffer += str;

    if (this.pasteMode) {
      this.pasteBuffer += this.buffer;
      this.buffer = "";
      const end = this.pasteBuffer.indexOf(BRACKETED_PASTE_END);
      if (end !== -1) {
        const content = this.pasteBuffer.slice(0, end);
        const rest = this.pasteBuffer.slice(end + BRACKETED_PASTE_END.length);
        this.pasteMode = false;
        this.pasteBuffer = "";
        this.pendingKittyPrintable = undefined;
        this.emit("paste", content);
        if (rest.length > 0) this.process(rest);
      }
      return;
    }

    const start = this.buffer.indexOf(BRACKETED_PASTE_START);
    if (start !== -1) {
      if (start > 0) {
        const before = this.buffer.slice(0, start);
        for (const seq of extractCompleteSequences(before).sequences) this.emitData(seq);
      }
      this.pendingKittyPrintable = undefined;
      this.buffer = this.buffer.slice(start + BRACKETED_PASTE_START.length);
      this.pasteMode = true;
      this.pasteBuffer = this.buffer;
      this.buffer = "";
      const end = this.pasteBuffer.indexOf(BRACKETED_PASTE_END);
      if (end !== -1) {
        const content = this.pasteBuffer.slice(0, end);
        const rest = this.pasteBuffer.slice(end + BRACKETED_PASTE_END.length);
        this.pasteMode = false;
        this.pasteBuffer = "";
        this.pendingKittyPrintable = undefined;
        this.emit("paste", content);
        if (rest.length > 0) this.process(rest);
      }
      return;
    }

    const result = extractCompleteSequences(this.buffer);
    this.buffer = result.remainder;
    for (const seq of result.sequences) this.emitData(seq);

    if (this.buffer.length > 0) {
      if (TERMINAL_REPLY_HEADER_PATTERN.test(this.buffer)) return;
      const wait = this.buffer === ESC ? this.escapeTimeoutMs : this.timeoutMs;
      this.timeout = setTimeout(() => {
        const flushed = this.flush();
        for (const seq of flushed) {
          if (seq.length > 2 && isControlString(seq)) {
            this.emitData(seq.slice(0, 2));
            this.process(seq.slice(2));
          } else {
            this.emitData(seq);
          }
        }
      }, wait);
    }
  }

  private emitData(sequence: string): void {
    const raw = sequence.length === 1 ? sequence.codePointAt(0) : undefined;
    if (raw !== undefined && raw === this.pendingKittyPrintable) {
      this.pendingKittyPrintable = undefined;
      return;
    }
    this.pendingKittyPrintable = parseUnmodifiedKittyPrintable(sequence);
    this.emit("data", sequence);
  }

  flush(): string[] {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (this.buffer.length === 0) return [];
    const sequences = [this.buffer];
    this.buffer = "";
    this.pendingKittyPrintable = undefined;
    return sequences;
  }

  clear(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.buffer = "";
    this.pasteMode = false;
    this.pasteBuffer = "";
    this.pendingKittyPrintable = undefined;
  }

  getBuffer(): string {
    return this.buffer;
  }

  destroy(): void {
    this.clear();
  }
}
