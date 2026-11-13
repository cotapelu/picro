// Renderers cho từng tool (pi-mono: ToolDefinition.renderCall / renderResult).
//
// Bản cũ chỉ có một fallback "tên + JSON" nên MỌI tool hiện như nhau: `read`
// không thấy đường dẫn, `bash` không thấy lệnh, `edit` không thấy diff. Ở đây mỗi
// tool có cách hiện riêng, sát với pi-mono nhưng viết bằng TSX riêng.

import { formatToolCallWithArgs } from "./tool-call-format.js";

export interface ToolRenderContext {
  args: unknown;
  toolCallId: string;
  executionStarted: boolean;
  argsComplete: boolean;
  isPartial: boolean;
  expanded: boolean;
  showImages: boolean;
  isError: boolean;
  durationMs?: number;
  outputPad: number;
}

export interface ToolRenderers {
  renderCall?: (args: unknown, theme: unknown, context: ToolRenderContext) => string;
  renderResult?: (
    result: { content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>; details?: unknown },
    options: { expanded: boolean; isPartial: boolean },
    theme: unknown,
    context: ToolRenderContext,
  ) => string;
}

/** Lấy chuỗi an toàn từ args (null nếu không phải string). */
function str(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return null;
}

/** Thay tab bằng 3 space để khỏi phá bố cục cột. */
function replaceTabs(text: string): string {
  return text.replace(/\t/g, "   ");
}

/** Khoảng dòng `:start-end` cho read/read_file. */
function lineRange(offset: unknown, limit: unknown): string {
  const toNumber = (v: unknown): number | undefined => {
    if (typeof v === "string" && v.trim() !== "") {
      const parsed = Number(v);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return typeof v === "number" && Number.isFinite(v) ? v : undefined;
  };
  if (offset == null && limit == null) return "";
  const start = offset == null ? 1 : toNumber(offset);
  if (start === undefined) return "";
  if (limit == null) return `:${start}`;
  const count = toNumber(limit);
  if (count === undefined) return `:${start}`;
  return `:${start}-${start + count - 1}`;
}

/** Ghép text từ kết quả tool. */
function textOf(result: ToolRenderers extends never ? never : { content: Array<{ type: string; text?: string }> }): string {
  return (result.content ?? [])
    .filter((c) => c?.type === "text" && c.text)
    .map((c) => c.text ?? "")
    .join("\n");
}

/** read: hiện đường dẫn + dải dòng. */
const read: ToolRenderers = {
  renderCall: (args) => {
    const filePath = str((args as Record<string, unknown>)?.path) ?? str((args as Record<string, unknown>)?.file_path) ?? "";
    const range = lineRange((args as Record<string, unknown>)?.offset, (args as Record<string, unknown>)?.limit);
    return formatToolCallWithArgs(`read ${filePath || ""}${range}`, undefined, undefined, false);
  },
};

/** write: đường dẫn + số dòng nội dung. */
const write: ToolRenderers = {
  renderCall: (args) => {
    const filePath = str((args as Record<string, unknown>)?.path) ?? str((args as Record<string, unknown>)?.file_path) ?? "";
    const content = str((args as Record<string, unknown>)?.content) ?? "";
    const lines = content ? content.split("\n").length : 0;
    return formatToolCallWithArgs(`write ${filePath || ""}${lines ? ` (${lines} lines)` : ""}`, undefined, undefined, false);
  },
};

/** edit: file + old→new (dạng gọn). */
const edit: ToolRenderers = {
  renderCall: (args) => {
    const record = (args ?? {}) as Record<string, unknown>;
    const filePath = str(record.path) ?? str(record.file_path) ?? "";
    const oldText = str(record.old_text) ?? str(record.oldText) ?? str(record.old_string) ?? "";
    const newText = str(record.new_text) ?? str(record.newText) ?? str(record.new_string) ?? "";
    return formatToolCallWithArgs(`edit ${filePath || ""}`, { old_text: oldText, new_text: newText }, undefined, false);
  },
  renderResult: (result, options) => {
    const diff = (result as { details?: { diff?: string } })?.details?.diff;
    if (typeof diff === "string" && diff.trim()) return diff;
    return textOf(result as never);
  },
};

/** bash: hiện lệnh rõ nhất có thể. */
const bash: ToolRenderers = {
  renderCall: (args) => {
    const command = str((args as Record<string, unknown>)?.command) ?? str((args as Record<string, unknown>)?.cmd) ?? "";
    return formatToolCallWithArgs("bash", { command }, undefined, false);
  },
};

/** grep/glob/find/ls: hiện pattern/thư mục. */
const search: ToolRenderers = {
  renderCall: (args) => {
    const record = (args ?? {}) as Record<string, unknown>;
    const pattern = str(record.pattern) ?? str(record.query) ?? str(record.glob) ?? "";
    const path = str(record.path) ?? str(record.directory) ?? str(record.dir) ?? ".";
    return formatToolCallWithArgs(pattern ? `${pattern} @ ${path}` : `@ ${path}`, undefined, undefined, false);
  },
};

/** Bảng tra: tool name → renderers. */
const RENDERERS: Record<string, ToolRenderers> = {
  read,
  "read-file": read,
  read_file: read,
  view: read,
  write,
  "write-file": write,
  write_file: write,
  edit,
  "edit-file": edit,
  edit_file: edit,
  multiedit: edit,
  bash,
  shell: bash,
  execute_bash: bash,
  grep: search,
  glob: search,
  find: search,
  ls: search,
  list: search,
};

/** Lấy renderers cho một tool (undefined → fallback chung). */
export function getToolRenderers(toolName: string): ToolRenderers | undefined {
  return RENDERERS[toolName];
}

/** Xuất để test/extension có thể mở rộng. */
export const toolRenderers: Record<string, ToolRenderers> = RENDERERS;
