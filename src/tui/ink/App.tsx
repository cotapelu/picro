// App - giao diện gốc của chế độ tương tác (tầng view)
// Bắt chước nguyên tắc pi-mono InteractiveMode + ChatViewport:
//   - Header cố định đầu màn hình
//   - Transcript chiếm toàn bộ không gian còn lại (grow 1, shrink 1, minSize 1)
//   - Dock nhập liệu cố định đáy (shrink 1, minSize 3 cho editor)
//   - Overlay (selector/dialog) thay cho ô nhập — editor bị thay bằng selector
//     đang mở, đúng như showSelector() của pi-mono
//   - Trạng thái (working/compaction/retry) nằm trong dock, ngay trên editor
//   - Cuộn transcript theo DÒNG HIỂN THỊ (không theo số tin nhắn), có follow-end
//   - Tool output mở rộng/thu gọn bằng Ctrl+T (như pi-mono setToolsExpanded)
// Port sang Ink TSX, khong copy code truc iep.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useWindowSize } from "ink";
import { getTheme } from "./theme/index.js";
import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
import type { InteractiveControllerLike } from "./controller-bridge.js";
import { ChatViewport } from "./components/ChatViewport.js";
import { Header } from "./components/Header.js";
import { MessageInput } from "./components/MessageInput.js";
import { StatusBar } from "./components/StatusBar.js";
import { Toast } from "./components/Toast.js";
import { Modal } from "./components/Modal.js";
import { Keybindings } from "./components/Keybindings.js";
import { StatusIndicator } from "./components/StatusIndicator.js";
import { ModelSelector, type ModelItem } from "./components/ModelSelector.js";
import { SessionSelector, type SessionInfo } from "./components/SessionSelector.js";
import { SettingsSelector, type SettingRow } from "./components/SettingsSelector.js";
import { ThemeSelector } from "./components/ThemeSelector.js";
import { ThinkingSelector } from "./components/ThinkingSelector.js";
import { TreeSelector } from "./components/TreeSelector.js";
import { UserMessageSelector } from "./components/UserMessageSelector.js";
import { TrustSelector } from "./components/TrustSelector.js";
import {
  Transcript,
  sliceTranscript,
  transcriptLineCount,
  type TranscriptItem,
} from "./components/Transcript.js";
import { HelpBody } from "./components/HelpBody.js";

export interface AppProps {
  runtime: AgentSessionRuntimeInterface;
  /** Cầu nối duy nhất tới logic app (xem controller-bridge.ts). */
  controller: InteractiveControllerLike;
  initialMessage?: string;
  /** Chế độ giao diện: "compact" hoặc "full". */
  layout?: "compact" | "full";
}

interface ToastItem {
  id: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
  duration?: number;
  createdAt: number;
}

/** Trạng thái chỉ báo đang chạy (working / compaction / retry). */
type IndicatorState =
  | { kind: "none" }
  | { kind: "working"; message: string }
  | { kind: "compaction"; reason?: string }
  | { kind: "retry"; attempt: number; maxAttempts: number; delayMs: number };

/** Cửa sổ phụ đang mở, thay thế ô nhập. */
export type OverlayKind =
  | "none"
  | "model"
  | "session"
  | "settings"
  | "theme"
  | "thinking"
  | "help"
  | "tree"
  | "fork"
  | "trust";

/** Số dòng chrome ước tính (header + dock nhập + status + footer + keybindings). */
const CHROME_LINES = 10;
/** Chiều cao tối thiểu của vùng transcript. */
const MIN_TRANSCRIPT_LINES = 5;
/** Bước cuộn khi nhấn PageUp/PageDown. */
const PAGE_OVERLAP = 2;

/** Danh sách dự phòng khi runtime chưa nạp (tránh ô nhập không có gợi ý). */
const DEFAULT_SLASH_COMMANDS: Array<{ name: string; description?: string }> = [
  { name: "help", description: "hiện trợ giúp" },
  { name: "model", description: "chọn mô hình" },
  { name: "thinking", description: "đặt cấp độ suy nghĩ" },
  { name: "settings", description: "bảng cài đặt" },
  { name: "theme", description: "đổi chủ đề" },
  { name: "compact", description: "nén ngữ cảnh" },
  { name: "sessions", description: "liệt kê/chuyển phiên" },
  { name: "new", description: "tạo phiên mới" },
  { name: "resume", description: "mở lại phiên cũ" },
  { name: "tree", description: "điều hướng cây phiên" },
  { name: "fork", description: "fork từ tin nhắn" },
  { name: "trust", description: "tin tưởng dự án" },
  { name: "login", description: "đăng nhập" },
  { name: "logout", description: "đăng xuất" },
  { name: "name", description: "đặt tên phiên" },
  { name: "hotkeys", description: "phím tắt" },
  { name: "export", description: "xuất phiên" },
  { name: "import", description: "nhập phiên" },
  { name: "reload", description: "nạp lại tài nguyên" },
  { name: "quit", description: "thoát" },
];

/**
 * Lệnh slash dùng cho gợi ý trong ô nhập.
 *
 * Lấy từ danh sách built-in của runtime (src/runtime/slash-commands.ts) khi có,
 * để một nơi duy nhất định nghĩa và gợi ý luôn khớp phần thực thi.
 */
const SLASH_COMMANDS: Array<{ name: string; description?: string; argumentHint?: string }> =
  (globalThis as { __PICRO_SLASH_COMMANDS__?: Array<{ name: string; description?: string }> }).__PICRO_SLASH_COMMANDS__ ??
  DEFAULT_SLASH_COMMANDS;

export const App: React.FC<AppProps> = ({
  runtime,
  controller,
  initialMessage,
  layout = "compact",
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>(() => controller.getToasts());
  /** Số dòng đã cuộn lên so với đáy (0 = theo dõi cuối). */
  const [scrollLines, setScrollLines] = useState(0);
  const [indicator, setIndicator] = useState<IndicatorState>({ kind: "none" });
  const [overlay, setOverlay] = useState<OverlayKind>("none");
  const [overlayProps, setOverlayProps] = useState<Record<string, unknown>>({});
  const [toolsExpanded, setToolsExpanded] = useState(() => controller.getToolsExpanded?.() ?? false);
  /** Ô nhập đang ở chế độ bash ("!" đầu dòng) → viền đổi màu (pi-mono). */
  const [bashMode, setBashMode] = useState(false);
  const [queue, setQueue] = useState<{ steering: string[]; followUp: string[] }>(() =>
    controller.getQueue ? controller.getQueue() : { steering: [], followUp: [] },
  );
  const [followingEnd, setFollowingEnd] = useState(true);
  /** Nhánh git của thư mục làm việc (dòng 1 của footer). */
  const [gitBranch, setGitBranch] = useState<string | undefined>(undefined);
  const [cwd, setCwd] = useState<string>(runtime.cwd || ".");
  /**
   * Ctrl+V: đọc clipboard rồi giao cho controller quyết định chèn gì.
   *
   * Clipboard có file (ảnh chụm/toàn cửa sổ tệp) thì dán đường dẫn; không thì
   * dán text. Lỗi clipboard không được làm sập app.
   */
  const editorRef = useRef<{
    getText(): string;
    setText(text: string): void;
    insert(text: string): void;
    getCursor(): number;
    addToHistory(text: string): void;
  } | null>(null);

  const { columns, rows } = useWindowSize();
  const width = columns || 80;

  const [transcript, setTranscript] = useState<TranscriptItem[]>(() => controller.getTranscript());
  const [status, setStatus] = useState(() => controller.getStatus());
  const viewportHeight = useMemo(
    () => Math.max(MIN_TRANSCRIPT_LINES, (rows || 24) - CHROME_LINES),
    [rows],
  );

  /** Đọc lại transcript + status từ controller. */
  const refresh = useCallback(() => {
    setTranscript(controller.getTranscript());
    setStatus(controller.getStatus());
    if (controller.getQueue) setQueue(controller.getQueue());
  }, [controller]);
  const totalLines = useMemo(
    () => transcriptLineCount(transcript, width),
    [transcript, width],
  );
  const maxScroll = Math.max(0, totalLines - viewportHeight);

  const visibleTranscript = useMemo(() => {
    const skip = followingEnd ? 0 : Math.min(scrollLines, maxScroll);
    const { items } = sliceTranscript(transcript, width, viewportHeight, skip);
    return items;
  }, [transcript, width, viewportHeight, followingEnd, scrollLines, maxScroll]);

  // Dính biên: không cuộn quá nội dung.
  useEffect(() => {
    if (scrollLines > maxScroll) setScrollLines(maxScroll);
  }, [scrollLines, maxScroll]);

  // Đăng ký callback của controller (một lần).
  useEffect(() => {
    controller.onMessage(() => {
      refresh();
      // Tin nhắn mới: giữ ở đáy nếu đang theo dõi.
      setScrollLines(0);
      setFollowingEnd(true);
    });
    controller.onStatusChange((next) => setStatus(next));
    controller.onIndicator((next) => setIndicator(next as IndicatorState));
    controller.onToast((toast, removed) =>
      setToasts((prev) =>
        removed
          ? prev.filter((t) => t.id !== toast.id)
          : [...prev.filter((t) => t.id !== toast.id), toast],
      ),
    );
    controller.onOverlayRequest((request) => {
      setOverlay(request.kind as OverlayKind);
      setOverlayProps(request.props ?? {});
      refresh();
    });
    controller.onOverlayClose(() => {
      setOverlay("none");
      refresh();
    });
    // Hàng đợi (steering/follow-up) thay đổi → cập nhật dock. Controller giữ
    // các hook này dạng thuộc tính nên view GÁN vào (không phải gọi hàm đăng ký).
    controller.onQueueChange = (next) => setQueue(next);
    controller.onBashModeChange = (bash) => setBashMode(bash);
    controller.onSuspend = () => setBashMode(false);
    controller.onResume = () => refresh();

    controller.onEditorCallbacks?.({
      clear: () => editorRef.current?.setText(""),
      read: () => editorRef.current?.getText() ?? "",
      setText: (text: string) => editorRef.current?.setText(text),
      insert: (text: string) => editorRef.current?.insert(text),
      cursor: () => editorRef.current?.getCursor() ?? 0,
    });
    if (initialMessage) void controller.sendMessage(initialMessage);
    setCwd(runtime.cwd || ".");

    // Nhánh git (pi-mono: footerDataProvider.getGitBranch, watcher riêng).
    void (async () => {
      try {
        const { getGitInfo } = await import("../../runtime/footer-data-provider.js");
        const info = await getGitInfo(runtime.cwd || process.cwd());
        setGitBranch(info?.branch);
      } catch {
        // Không có git hoặc git lỗi: bỏ qua, footer không hiện nhánh.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = useCallback(
    (direction: "up" | "down", page: boolean) => {
      const step = page ? Math.max(1, viewportHeight - PAGE_OVERLAP) : 1;
      setFollowingEnd(false);
      setScrollLines((prev) => {
        const delta = direction === "up" ? step : -step;
        const next = Math.max(0, Math.min(maxScroll, prev + delta));
        if (next === 0) setFollowingEnd(true);
        return next;
      });
    },
    [maxScroll, viewportHeight],
  );

  const handleSubmit = useCallback(
    (text: string) => {
      void controller.sendMessage(text);
      setFollowingEnd(true);
      setScrollLines(0);
      setQueue({ steering: [], followUp: [] });
    },
    [controller],
  );

  /** Alt/Shift+Enter: xếp hàng thay vì gửi ngay. */
  const handleQueue = useCallback(
    (text: string) => {
      const queue = controller.queueFollowUp;
      if (!queue) return;
      void queue(text).then(() => refresh());
    },
    [controller, refresh],
  );

  /**
   * Hành động ứng dụng theo phím (pi-mono onAction("app.*")).
   *
   * Ctrl+C/D/Z/Esc trước đây chết vì controller không có phương thức này và
   * Ink lại tự exit ở Ctrl+C; Ctrl+G/Ctrl+V/Ctrl+P/N chưa từng được gắn.
   */
  const handleAppAction = useCallback(
    (action: string) => {
      switch (action) {
        case "clear":
          controller.handleCtrlC?.();
          break;
        case "exit":
          controller.handleCtrlD?.();
          break;
        case "suspend":
          controller.handleCtrlZ?.();
          break;
        case "escape":
          controller.handleEscape?.();
          break;
        case "externalEditor":
          void controller.openExternalEditor?.();
          break;
        case "clipboardPaste":
          void readClipboardForPaste(controller);
          break;
        case "modelCycleForward":
          void controller.cycleModel?.("forward");
          break;
        case "modelCycleBackward":
          void controller.cycleModel?.("backward");
          break;
        case "dequeue":
          controller.restoreQueue?.();
          break;
        case "copyMessage":
          void controller.runCommand?.("copy");
          break;
        default:
          break;
      }
      refresh();
    },
    [controller, refresh],
  );

  const closeOverlay = useCallback(() => setOverlay("none"), []);

  const overlayNode = useMemo(
    () =>
      renderOverlay({
        kind: overlay,
        props: overlayProps,
        controller,
        runtime,
        width,
        onClose: closeOverlay,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overlay, overlayProps, width, closeOverlay, refresh],
  );

  return (
    <Box flexDirection="column">
      <Header title="picro" cwd={cwd} expanded={layout === "full"} />
      <ChatViewport
        transcript={
          <Transcript items={visibleTranscript} width={width} toolsExpanded={toolsExpanded} />
        }
        pendingMessages={
          queue.steering.length > 0 || queue.followUp.length > 0 ? (
            <PendingQueue queue={queue} width={width} />
          ) : null
        }
        editor={
          overlay === "none" ? (
            <MessageInput
              ref={editorRef}
              onSubmit={handleSubmit}
              onQueue={handleQueue}
              onAppAction={handleAppAction}
              onToggleExpand={() => controller.toggleToolExpansion?.()}
              disabled={status.isProcessing}
              onScroll={handleScroll}
              width={width}
              bashMode={bashMode}
              history={controller.getHistory()}
              slashCommands={SLASH_COMMANDS}
            />
          ) : (
            <Box flexDirection="column" width={width}>
              {overlayNode ?? <Text>Cửa sổ này chưa khả dụng.</Text>}
            </Box>
          )
        }
        status={
          indicator.kind === "working" ? (
            <StatusIndicator kind="working" message={indicator.message} embedded />
          ) : indicator.kind === "compaction" ? (
            <StatusIndicator kind="compaction" message="" embedded />
          ) : indicator.kind === "retry" ? (
            <StatusIndicator kind="retry" message="" countdownMs={indicator.delayMs} embedded />
          ) : null
        }
        footer={
          <StatusBar
            model={status.model}
            tokens={status.tokens}
            cwd={status.cwd}
            sessionName={status.sessionName}
            gitBranch={gitBranch}
            contextPercent={status.contextPercent}
            isProcessing={status.isProcessing}
            thinkingLevel={status.thinkingLevel}
            routedModel={status.routedModel}
            usage={status.usage}
            toolsExpanded={toolsExpanded}
          />
        }
      />
      <Toast toasts={toasts} />
      <Keybindings />
      <Modal modal={{ type: "none" }} />
    </Box>
  );
};

/** Hàng đợi hiển thị trong dock nhập liệu (pi-mono updatePendingMessagesDisplay). */
const PendingQueue: React.FC<{
  queue: { steering: string[]; followUp: string[] };
  width: number;
}> = ({ queue, width }) => {
  const t = getTheme();
  return (
    <Box flexDirection="column">
      {queue.steering.map((text, i) => (
        <Text key={`st-${i}`}>{truncateLine(t.fg("dim", `Steering: ${text}`), width)}</Text>
      ))}
      {queue.followUp.map((text, i) => (
        <Text key={`fu-${i}`}>{truncateLine(t.fg("dim", `Follow-up: ${text}`), width)}</Text>
      ))}
      <Text>{t.fg("dim", "↳ đang chờ agent xử lý")}</Text>
    </Box>
  );
};

/** Cắt một dòng theo chiều rộng khung nhìn (bỏ qua escape). */
function truncateLine(text: string, width: number): string {
  const plain = text.replace(/\x1b\[[0-9;]*m/g, "");
  if (plain.length <= width) return text;
  return text.slice(0, Math.max(0, width - 1)) + "…";
}

/**
 * Đọc clipboard để dán (Ctrl+V).
 *
 * Trả về { files, text }: file paths khi clipboard chứa danh sách tệp (mỗi
 * dòng một đường dẫn tồn tại), ngược lại là text. Mọi lỗi đều im lặng để một
 * máy không có clipboard helper không làm hỏng luồng gõ phím.
 */
async function readClipboardForPaste(controller: InteractiveControllerLike): Promise<void> {
  let text = "";
  try {
    const { readClipboardText } = await import("../../utils/clipboard.js");
    text = (await readClipboardText()) ?? "";
  } catch {
    return; // Không đọc được clipboard: bỏ qua như pi-mono (silent).
  }
  if (!text) return;
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const lookLikePaths =
    lines.length > 0 && lines.every((line) => !/\s/.test(line) && (line.startsWith("/") || line.startsWith("./") || line.startsWith("~/") || /^[A-Za-z]:[\\/]/.test(line)));
  const files = lookLikePaths ? lines : [];
  controller.pasteFromClipboard?.(files, lookLikePaths ? "" : text);
}

/** Cửa sổ phụ (overlay) đang mở do controller yêu cầu. */
function renderOverlay(options: {
  kind: OverlayKind;
  props: Record<string, unknown>;
  controller: InteractiveControllerLike;
  runtime: AgentSessionRuntimeInterface;
  width: number;
  onClose: () => void;
}): React.ReactNode {
  const { kind, props, controller, runtime, width, onClose } = options;

  switch (kind) {
    case "model": {
      const all = ((runtime as any).services?.modelRegistry?.getAll?.() ?? []) as Array<{
        id: string;
        provider: string;
        name?: string;
      }>;
      const models: ModelItem[] = all.map((m) => ({ id: m.id, provider: m.provider, name: m.name }));
      return (
        <ModelSelector
          models={models}
          currentModel={String(props.current ?? "")}
          onSelect={(model) => {
            void controller.runCommand("model", `${model.provider}/${model.id}`);
            onClose();
          }}
          onCancel={onClose}
          width={width}
        />
      );
    }
    case "session": {
      const sessions = (props.sessions as SessionInfo[] | undefined) ?? [];
      return (
        <SessionSelector
          sessions={sessions}
          onSelect={(sessionId) => {
            void controller.runCommand("sessions", sessionId);
            onClose();
          }}
          onCancel={onClose}
          width={width}
        />
      );
    }
    case "settings": {
      const rows = (props.settings as SettingRow[] | undefined) ?? [];
      return (
        <SettingsSelector
          settings={rows}
          onChange={(id, value) => controller.updateSetting?.(id, value)}
          onCancel={onClose}
          width={width}
        />
      );
    }
    case "theme": {
      const themes = (props.themes as string[] | undefined) ?? ["dark", "light"];
      return (
        <ThemeSelector
          themes={themes}
          currentTheme={String(props.current ?? "dark")}
          onSelect={(name) => {
            void controller.runCommand("theme", name);
            onClose();
          }}
          onCancel={onClose}
          width={width}
        />
      );
    }
    case "thinking": {
      const levels = (props.levels as string[] | undefined) ?? ["off", "minimal", "low", "medium", "high", "xhigh"];
      return (
        <ThinkingSelector
          currentLevel={String(props.current ?? "off")}
          availableLevels={levels}
          onSelect={(level) => {
            void controller.runCommand("thinking", level);
            onClose();
          }}
          onCancel={onClose}
          width={width}
        />
      );
    }
    case "help":
      return (
        <Box flexDirection="column" width={width}>
          <HelpBody />
        </Box>
      );
    case "tree": {
      const tree = (props.tree as never[]) ?? [];
      return (
        <TreeSelector
          tree={tree}
          currentLeafId={(props.currentLeafId as string | null) ?? null}
          onSelect={(entryId) => {
            const rt = runtime as unknown as {
              navigateTree(id: string): Promise<{ cancelled: boolean }>;
            };
            void rt.navigateTree(entryId).then((result: { cancelled: boolean }) => {
              if (!result.cancelled) {
                controller.loadTranscript?.();
                onClose();
              }
            });
          }}
          onCancel={onClose}
          width={width}
        />
      );
    }
    case "fork": {
      const messages = (props.messages as Array<{ entryId: string; text: string }> | undefined) ?? [];
      return (
        <UserMessageSelector
          messages={messages.map((m) => ({ id: m.entryId, text: m.text }))}
          initialSelectedId={props.initialSelectedId as string | undefined}
          onSelect={async (id) => {
            const result = await runtime.fork(id);
            if (!result.cancelled) {
              controller.loadTranscript?.();
              onClose();
            }
          }}
          onCancel={onClose}
          width={width}
        />
      );
    }
    case "trust":
      return (
        <TrustSelector
          cwd={String(props.cwd ?? runtime.cwd ?? ".")}
          savedDecision={(props.savedDecision as null | undefined) ?? null}
          projectTrusted={props.projectTrusted === true}
          trustOptions={(props.trustOptions as never[]) ?? []}
          onSelect={() => onClose()}
          onCancel={onClose}
          width={width}
        />
      );
    default:
      return null;
  }
}

export default App;
