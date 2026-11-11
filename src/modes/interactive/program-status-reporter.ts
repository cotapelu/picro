// ProgramStatusReporter - báo cáo trạng thái lên terminal (OSC 7501)
// Bắt chước nguyên tắc pi-mono program-status-reporter.ts:
//   - working: trong lúc agent chạy và khi đang nén ngữ cảnh
//   - blocked: khi có hội thoại chờ người dùng (báo hộp thoại mới nhất)
//   - done/error/idle: sau khi lượt chạy kết thúc
//   - Tin nhắn chỉ giới hạn ở tên phiên, tiêu đề hộp thoại, dòng đầu lỗi;
//     không bao giờ báo prompt hay đầu ra trợ lý
// Port sang TSX riêng, khon copy code truc iep.

import type { Terminal } from "../../tui/ink/core/Terminal.js";
import { formatProgramStatus, type ProgramStatus } from "../../tui/ink/core/ProgramStatus.js";

export type BlockedStatus = { kind: NonNullable<ProgramStatus["kind"]>; message: string };

/** Sự kiện phiên tối thiểu cần cho báo cáo. */
export interface StatusEvent {
  type: string;
  message?: { role?: string; stopReason?: string; errorMessage?: string };
  aborted?: boolean;
  errorMessage?: string;
  reason?: string;
}

function firstLine(text: string | undefined): string {
  return text?.split(/\r?\n/, 1)[0]?.trim() || "Lỗi";
}

export class ProgramStatusReporter {
  private readonly getTerminal: () => Terminal;
  private readonly getSessionName: () => string | undefined;
  private runActive = false;
  private compacting = false;
  /** Kết quả của lượt chạy hiện tại, báo một lần khi kết thúc. */
  private runResult: ProgramStatus = { state: "done" };
  /** Trạng thái khi không có lượt chạy. */
  private restingStatus: ProgramStatus = { state: "idle" };
  /** Hộp thoại đang mở theo nguồn, theo thứ tự mở. */
  private readonly blocked = new Map<string, BlockedStatus>();
  private lastReport: string | undefined;

  constructor(getTerminal: () => Terminal, getSessionName: () => string | undefined) {
    this.getTerminal = getTerminal;
    this.getSessionName = getSessionName;
  }

  handleEvent(event: StatusEvent): void {
    switch (event.type) {
      case "agent_start":
        this.runActive = true;
        this.runResult = { state: "done" };
        break;
      case "message_end":
        // Phản hồi mới nhất quyết định kết quả nên retry lỗi được thay bằng retry thành công.
        if (event.message?.role !== "assistant") return;
        this.runResult =
          event.message.stopReason === "error"
            ? { state: "error", message: firstLine(event.message.errorMessage) }
            : { state: "done" };
        break;
      case "compaction_start":
        this.compacting = true;
        break;
      case "compaction_end":
        this.compacting = false;
        if (this.runActive) {
          // Nén phục hồi thất bại sẽ kết thúc lượt trừ khi phản hồi sau thành công.
          if (event.aborted) this.runResult = { state: "idle" };
          else if (event.errorMessage) this.runResult = { state: "error", message: firstLine(event.errorMessage) };
        } else if (event.aborted) {
          this.restingStatus = { state: "idle" };
        } else if (event.reason === "manual") {
          this.restingStatus = event.errorMessage
            ? { state: "error", message: firstLine(event.errorMessage) }
            : { state: "done" };
        }
        break;
      case "agent_settled":
        this.runActive = false;
        this.restingStatus = event.aborted ? { state: "idle" } : this.runResult;
        break;
      case "session_info_changed":
        // Tên phiên là một phần của báo cáo working và done.
        break;
      default:
        return;
    }
    this.report();
  }

  /** Báo blocked cho hộp thoại tới khi xóa bằng undefined. Mở lại nguồn sẽ thay thế. */
  setBlocked(source: string, status: BlockedStatus | undefined): void {
    this.blocked.delete(source);
    if (status) this.blocked.set(source, status);
    this.report();
  }

  /** Quên lượt chạy của phiên trước, ví dụ sau khi đổi phiên. */
  reset(): void {
    this.runActive = false;
    this.compacting = false;
    this.runResult = { state: "done" };
    this.restingStatus = { state: "idle" };
    this.report();
  }

  report(): void {
    const status: ProgramStatus = { ...this.currentStatus(), app: "picro" };
    const key = JSON.stringify(status);
    if (key === this.lastReport) return;
    this.lastReport = key;
    this.getTerminal().setProgramStatus(status);
  }

  private currentStatus(): ProgramStatus {
    const blocked = [...this.blocked.values()].at(-1);
    if (blocked) return { state: "blocked", ...blocked };
    if (this.compacting) return { state: "working", message: "Đang nén ngữ cảnh" };
    const status = this.runActive ? ({ state: "working" } as const) : this.restingStatus;
    if (status.state === "working" || status.state === "done") {
      return { ...status, message: this.getSessionName() };
    }
    return status;
  }
}
