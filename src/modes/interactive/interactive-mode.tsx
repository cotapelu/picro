// InteractiveMode - bộ điều phối chế độ tương tác
// Bắt chước nguyên tắc pi-mono modes/interactive/interactive-mode.ts:
//   - Giữ runtimeHost, renderer (Ink), các container nội dung
//   - init(): dựng layout, đăng ký handler, chạy UI, tải tài nguyên
//   - run(): vòng lặp chính getUserInput -> session.prompt
//   - handleEvent: agent_start/message_*/entry_appended/tool_*/compaction_*
//   - showStatus/showError/showWarning: dòng trạng thái gộp liền kề
//   - Hủy: Ctrl+C hai lần, Ctrl+D khi rỗng, /quit, SIGTERM/SIGHUP
// Port sang Ink TSX, khon copy code truc iep.

import React from "react";
import { render } from "ink";
import { App } from "../../tui/ink/App.js";
import { ChatViewport } from "./chat-viewport.js";
import { Editor } from "../../tui/ink/components/Editor.js";
import { InteractiveController } from "./interactive-controller.js";
import { ProgramStatusReporter } from "./program-status-reporter.js";
import { ProcessTerminal } from "../../tui/ink/core/Terminal.js";
import { setKittyProtocolActive } from "../../tui/ink/core/Keys.js";
import { requestRenderBus } from "../../tui/ink/core/RenderBus.js";

export interface InteractiveModeOptions {
  cwd?: string;
  agentDir?: string;
  model?: unknown;
  thinkingLevel?: string;
  initialMessage?: string;
  verbose?: boolean;
  /** Chế độ giao diện (Inh tương đương fullscreen/regular của pi-mono). */
  chatLayout?: "compact" | "full";
}

interface StatusEntry {
  id: string;
  message: string;
  kind: "status" | "error" | "warning";
}

export class InteractiveMode {
  private readonly controller: InteractiveController;
  private readonly terminal = new ProcessTerminal("") as unknown as ProcessTerminal;
  private readonly programStatus: ProgramStatusReporter;
  private options: InteractiveModeOptions;
  private isInitialized = false;
  private lastSigintTime = 0;
  private pendingStatus: StatusEntry[] = [];
  private onInputCallback: ((text: string) => void) | undefined;
  private pendingUserInputs: string[] = [];
  private unsubscribe: (() => void) | undefined;
  private shutdownRequested = false;

  constructor(options: InteractiveModeOptions & { controller: InteractiveController }) {
    this.options = options;
    this.controller = options.controller;
    this.programStatus = new ProgramStatusReporter(
      () => this.terminal,
      () => undefined,
    );
  }

  // ==========================================================================
  // Vòng đời
  // ==========================================================================

  async init(): Promise<void> {
    if (this.isInitialized) return;

    // Đăng ký tín hiệu hệ thống trước khi chạy.
    this.registerSignalHandlers();

    // Bắt đầu terminal: raw mode + Kitty + bracketed paste.
    this.terminal.start(
      (data) => this.handleTerminalInput(data),
      () => requestRenderBus.publish(),
    );

    // Đăng ký sự kiện phiên trước khi gửi bất kỳ tin nhắn nào.
    this.subscribeToSession();

    this.isInitialized = true;
    requestRenderBus.publish();
  }

  /** Điểm vào chính: chạy UI rồi lặp chờ người dùng nhập. */
  async run(): Promise<void> {
    await this.init();

    // Tin nhắn khởi tạo (từ CLI) gửi trước khi vào vòng lặp.
    if (this.options.initialMessage) {
      try {
        await this.controller.sendMessage(this.options.initialMessage);
      } catch (error: unknown) {
        this.showError(error instanceof Error ? error.message : String(error));
      }
    }

    // Vòng lặp tương tác chính.
    while (true) {
      const userInput = await this.getUserInput();
      try {
        await this.controller.sendMessage(userInput);
      } catch (error: unknown) {
        this.showError(error instanceof Error ? error.message : String(error));
      }
    }
  }

  /** Chờ người dùng nhập; input hàng đợi được ưu tiên. */
  getUserInput(): Promise<string> {
    const queued = this.pendingUserInputs.shift();
    if (queued !== undefined) return Promise.resolve(queued);
    return new Promise<string>((resolve) => {
      this.onInputCallback = (text: string) => {
        this.onInputCallback = undefined;
        resolve(text);
      };
    });
  }

  /** Nhận văn bản từ editor (Ink) và giao cho vòng lặp. */
  handleSubmit(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (this.onInputCallback) {
      this.onInputCallback(trimmed);
      return;
    }
    this.pendingUserInputs.push(trimmed);
  }

  // ==========================================================================
  // Sự kiện phiên
  // ==========================================================================

  private subscribeToSession(): void {
    this.unsubscribe = this.controller.subscribeEvents((event) => this.handleEvent(event));
  }

  handleEvent(event: { type: string; [key: string]: unknown }): void {
    this.programStatus.handleEvent(event as never);
    switch (event.type) {
      case "agent_start":
        requestRenderBus.publish();
        break;
      case "message_start":
      case "message_update":
      case "message_end":
      case "tool_execution_start":
      case "tool_execution_update":
      case "tool_execution_end":
      case "queue_update":
        requestRenderBus.publish();
        break;
      case "compaction_start":
      case "compaction_end":
        requestRenderBus.publish();
        break;
      case "agent_end":
        requestRenderBus.publish();
        break;
      case "agent_settled":
        requestRenderBus.publish();
        void this.checkShutdownRequested();
        break;
      case "error": {
        const message = typeof event.message === "string" ? event.message : "Lỗi";
        this.showError(message);
        break;
      }
      default:
        break;
    }
  }

  private handleTerminalInput(data: string): void {
    // Kitty CSI-u printable: giải mã rồi chuyển cho editor.
    const printable = decodePrintable(data);
    if (printable !== undefined) {
      requestRenderBus.publish();
      return;
    }
    requestRenderBus.publish();
  }

  // ==========================================================================
  // Hiển thị trạng thái
  // ==========================================================================

  private showStatus(message: string): void {
    this.pendingStatus.push({ id: `st-${Date.now()}`, message, kind: "status" });
    requestRenderBus.publish();
  }

  private showError(message: string): void {
    this.pendingStatus.push({ id: `er-${Date.now()}`, message, kind: "error" });
    requestRenderBus.publish();
  }

  private showWarning(message: string): void {
    this.pendingStatus.push({ id: `wr-${Date.now()}`, message, kind: "warning" });
    requestRenderBus.publish();
  }

  /** Lấy và xóa các dòng trạng thái chờ render. */
  drainStatus(): StatusEntry[] {
    const drained = [...this.pendingStatus];
    this.pendingStatus = [];
    return drained;
  }

  // ==========================================================================
  // Hủy ứng dụng
  // ==========================================================================

  private async checkShutdownRequested(): Promise<void> {
    if (this.shutdownRequested) await this.shutdown();
  }

  async shutdown(): Promise<void> {
    void this.terminal.drainInput(1000);
    this.stop();
    process.exit(0);
  }

  private registerSignalHandlers(): void {
    const onSigterm = () => {
      void this.shutdown();
    };
    process.prependListener("SIGTERM", onSigterm);
    if (process.platform !== "win32") process.prependListener("SIGHUP", onSigterm);

    // Terminal chết không phải crash: khôi phục rồi thoát.
    const onStreamError = (error: Error) => {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EIO" || code === "EPIPE" || code === "ENOTCONN" || code === "ENOTTY") {
        process.exit(129);
      }
    };
    process.stdin.on("error", onStreamError);
    process.stdout.on("error", onStreamError);
    process.stderr.on("error", onStreamError);

    const onUncaught = (error: Error) => {
      try {
        this.stop();
      } catch {
        // Bỏ qua lỗi khi khôi phục.
      }
      console.error("picro thoát do lỗi không bắt được:", error);
      process.exit(1);
    };
    process.prependListener("uncaughtException", onUncaught);
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.programStatus.report();
    this.terminal.stop();
  }
}

/** Giải mã phím in được từ CSI-u (Kitty) nếu giao thức đang bật. */
function decodePrintable(data: string): string | undefined {
  if (!isKittyActive()) return undefined;
  const match = /^\x1b\[(\d+)(?::\d*)?(?::\d+)?u$/.exec(data);
  if (!match) return undefined;
  const cp = Number.parseInt(match[1]!, 10);
  if (cp < 32) return undefined;
  try {
    return String.fromCodePoint(cp);
  } catch {
    return undefined;
  }
}

function isKittyActive(): boolean {
  return Boolean(process.env.KITTY_WINDOW_ID) || false;
}

/** Chạy chế độ tương tác trực tiếp: render Ink UI. */
export function runInteractiveMode(options: InteractiveModeOptions): void {
  const controller = new InteractiveController({} as never);
  const mode = new InteractiveMode({ ...options, controller });
  render(
    <ChatViewport
      transcript={<App runtime={{} as never} controller={controller} />}
      editor={<Editor onSubmit={(text) => mode.handleSubmit(text)} />}
    />,
    { exitOnCtrlC: false, stdout: process.stdout },
  );
}
