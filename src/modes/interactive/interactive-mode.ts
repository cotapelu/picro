// InteractiveMode - bộ điều phối chế độ tương tác (LOGIC THUẬN, không JSX)
// Bắt chước nguyên tắc pi-mono modes/interactive/interactive-mode.ts:
//   - Giữ runtimeHost, terminal, reporter; các container do tầng view giữ
//   - init(): bật terminal (raw mode + Kitty + paste), đăng ký sự kiện phiên
//   - run(): vòng lặp chính getUserInput -> session.prompt
//   - handleEvent(): agent_start/message_*/tool_*/compaction_*/agent_settled
//   - showStatus/showError/showWarning: hàng trạng thái gộp liền kề
//   - Hủy: Ctrl+C hai lần, Ctrl+D khi rỗng, /quit, SIGTERM/SIGHUP,
//     terminal chết (EIO/EPIPE/ENOTCONN/ENOTTY)
// Tầng view (Ink) nằm ở src/tui/ink; file này không chứa JSX.
// Port sang TS thuần, khong copy code truc iep.

import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
import type { CreateAgentSessionRuntimeFactory } from "../../runtime/agent-session-runtime.js";
import { createAgentSessionRuntime } from "../../runtime/agent-session-runtime.js";
import { getAgentDir } from "../../config.js";
import { InteractiveController } from "./interactive-controller.js";
import { ProgramStatusReporter } from "../../tui/ink/core/ProgramStatusReporter.js";
import { ProcessTerminal } from "../../tui/ink/core/Terminal.js";
import { refreshModelCatalogs } from "../../tui/ink/core/ModelCatalogRefresh.js";
import { requestRenderBus } from "../../tui/ink/core/RenderBus.js";

export interface InteractiveModeOptions {
  cwd?: string;
  agentDir?: string;
  model?: unknown;
  thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  createRuntime?: CreateAgentSessionRuntimeFactory;
  title?: string;
  initialMessage?: string;
  verbose?: boolean;
  /** Chế độ giao diện: "compact" (mặc định) hoặc "full". */
  layout?: "compact" | "full";
}

/** Dòng trạng thái chờ render, do tầng view đọc qua drainStatus(). */
export interface StatusEntry {
  id: string;
  message: string;
  kind: "status" | "error" | "warning";
}

export class InteractiveMode {
  private runtime!: AgentSessionRuntimeInterface;
  private controller!: InteractiveController;
  private readonly terminal: ProcessTerminal;
  private readonly programStatus: ProgramStatusReporter;
  private options: InteractiveModeOptions;

  private isInitialized = false;
  private lastSigintTime = 0;
  private pendingStatus: StatusEntry[] = [];
  private onInputCallback: ((text: string) => void) | undefined;
  private pendingUserInputs: string[] = [];
  private unsubscribe: (() => void) | undefined;
  private shutdownRequested = false;

  constructor(options: InteractiveModeOptions = {}) {
    this.options = options;
    this.terminal = new ProcessTerminal("");
    this.programStatus = new ProgramStatusReporter(
      () => this.terminal,
      () => undefined,
    );
  }

  // ==========================================================================
  // Vòng đời
  // ==========================================================================

  async start(): Promise<void> {
    const cwd = this.options.cwd || process.cwd();
    const agentDir = this.options.agentDir || getAgentDir();
    const factory =
      this.options.createRuntime ||
      (async (opts: any) => ({
        diagnostics: [],
        session: null as any,
        services: null as any,
      }));

    this.runtime = await createAgentSessionRuntime(factory, {
      cwd,
      agentDir,
      model: this.options.model,
      thinkingLevel: this.options.thinkingLevel,
    });
    this.controller = new InteractiveController({ runtime: this.runtime });
  }

  /** Bật terminal, đăng ký sự kiện, sẵn sàng nhận phím. */
  async init(): Promise<void> {
    if (this.isInitialized) return;
    this.registerSignalHandlers();

    this.terminal.start(
      (data: string) => this.handleTerminalInput(data),
      () => requestRenderBus.publish(),
    );
    this.subscribeToSession();
    this.isInitialized = true;
    requestRenderBus.publish();
  }

  /** Điểm vào chính: chạy UI rồi lặp chờ người dùng nhập. */
  async run(): Promise<void> {
    await this.init();

    if (this.options.initialMessage) {
      try {
        await this.controller.sendMessage(this.options.initialMessage);
      } catch (error: unknown) {
        this.showError(error instanceof Error ? error.message : String(error));
      }
    }

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

  /** Nhận văn bản từ ô nhập (tầng view gọi vào đây). */
  handleSubmit(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (this.onInputCallback) {
      this.onInputCallback(trimmed);
      return;
    }
    this.pendingUserInputs.push(trimmed);
  }

  /** Ctrl+C: lần đầu xóa ô nhập, hai lần liên tiếp thì thoát. */
  handleCtrlC(): void {
    const now = Date.now();
    if (now - this.lastSigintTime < 500) {
      void this.shutdown();
      return;
    }
    this.lastSigintTime = now;
    requestRenderBus.publish();
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.programStatus.report();
    this.terminal.stop();
  }

  async shutdown(): Promise<void> {
    await this.terminal.drainInput(1000);
    this.stop();
    process.exit(0);
  }

  // ==========================================================================
  // Sự kiện phiên
  // ==========================================================================

  private subscribeToSession(): void {
    this.unsubscribe = this.controller.subscribeEvents((event: unknown) => this.handleEvent(event as { type: string; [key: string]: unknown }));
  }

  handleEvent(event: { type: string; [key: string]: unknown }): void {
    this.programStatus.handleEvent(event as never);
    switch (event.type) {
      case "agent_start":
      case "message_start":
      case "message_update":
      case "message_end":
      case "tool_execution_start":
      case "tool_execution_update":
      case "tool_execution_end":
      case "queue_update":
      case "compaction_start":
      case "compaction_end":
      case "agent_end":
      case "agent_settled":
        requestRenderBus.publish();
        if (event.type === "agent_settled") void this.checkShutdownRequested();
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
    // Tầng view (MessageInput) nhận phím trực tiếp; đây chỉ nhận dữ liệu
    // không thuộc về component đang focus, ví dụ trả lời màu terminal.
    if (data.startsWith("\x1b]10;") || data.startsWith("\x1b]11;")) {
      requestRenderBus.publish();
    }
  }

  // ==========================================================================
  // Hàng trạng thái
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

  /** Làm mới danh mục mô hình (gộp các lần gọi đồng thời). */
  refreshCatalogs(signal: AbortSignal): Promise<unknown> {
    const runtime = this.runtime as unknown as {
      services?: { modelRuntime?: Parameters<typeof refreshModelCatalogs>[0] };
    };
    const modelRuntime = runtime.services?.modelRuntime;
    if (!modelRuntime) return Promise.resolve(undefined);
    return refreshModelCatalogs(modelRuntime, signal);
  }

  // ==========================================================================
  // Hủy ứng dụng
  // ==========================================================================

  private async checkShutdownRequested(): Promise<void> {
    if (this.shutdownRequested) await this.shutdown();
  }

  private registerSignalHandlers(): void {
    const onSignal = () => {
      void this.shutdown();
    };
    process.prependListener("SIGTERM", onSignal);
    if (process.platform !== "win32") process.prependListener("SIGHUP", onSignal);

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
        // Bỏ qua lỗi khôi phục.
      }
      console.error("picro thoát do lỗi không bắt được:", error);
      process.exit(1);
    };
    process.prependListener("uncaughtException", onUncaught);
  }
}

/** Chạy chế độ tương tác trực tiếp (không cần App). */
export async function runInteractiveMode(options: InteractiveModeOptions = {}): Promise<void> {
  const mode = new InteractiveMode(options);
  await mode.start();
}
