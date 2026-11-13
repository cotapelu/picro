// Định dạng dòng gọi tool giống pi-mono `formatToolCallWithArgs`:
//   - thu gọn: `title key=value key=value` (cắt còn 100 ký tự)
//   - mở rộng: title, rồi mỗi tham số một dòng `  key: value`
// Không copy code: chỉ mô phỏng cùng một hành vi hiển thị.

/** Số ký tự tối đa của phần tham số khi thu gọn. */
const COLLAPSED_ARGS_CHARS = 100;

export interface ToolCallFormatTheme {
  fg(token: string, text: string): string;
  bold(text: string): string;
}

/** Thay tab bằng 3 space để khỏi phá cột. */
function replaceTabs(text: string): string {
  return text.replace(/\t/g, "   ");
}

/**
 * Dựng dòng (hoặc khối) mô tả lời gọi tool.
 *
 * `args` là object → hiện từng cặp key/value; chuỗi số → nguyên giá trị;
 * undefined → chỉ có title.
 */
export function formatToolCallWithArgs(
  title: string,
  args: unknown,
  theme: ToolCallFormatTheme | undefined,
  expanded: boolean,
): string {
  const header = theme ? theme.fg("toolTitle", theme.bold(title)) : title;
  if (args == null) return header;

  const entries: Array<[string, unknown]> =
    typeof args === "object" && !Array.isArray(args)
      ? Object.entries(args as Record<string, unknown>)
      : [["args", args]];
  if (entries.length === 0) return header;

  if (expanded) {
    const lines = entries.map(([key, value]) => {
      const text = typeof value === "string" ? value : (JSON.stringify(value, null, 2) ?? String(value));
      const indented = replaceTabs(text).replace(/\r/g, "").split("\n").join("\n    ");
      const line = `  ${key}: ${indented}`;
      return theme ? theme.fg("muted", line) : line;
    });
    return `${header}\n${lines.join("\n")}`;
  }

  const pairs = entries
    .map(([key, value]) => `${key}=${typeof value === "string" ? JSON.stringify(value) : (JSON.stringify(value) ?? String(value))}`)
    .join(" ");
  const preview = pairs.length > COLLAPSED_ARGS_CHARS ? `${pairs.slice(0, COLLAPSED_ARGS_CHARS - 3)}...` : pairs;
  const styled = theme ? theme.fg("muted", preview) : preview;
  return `${header} ${styled}`;
}
