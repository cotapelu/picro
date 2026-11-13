// InkKeys - chuyển sự kiện phím của Ink thành DANH TÍNH phím chuẩn.
//
// Vấn đề: Ink không giao byte thô cho useInput:
//   Ctrl+C -> data "c" + key.ctrl   (KHÔNG phải "\x03")
//   Esc    -> data "" + key.escape  (không phải "\x1b")
//   Tab    -> data "" + key.tab
//   Mũi tên/Delete/Home/End/PageUp -> data "" + flag tương ứng
//   Alt+X  -> data "x" + key.meta
// Nên mọi so khớp theo byte (`matchesKey(data, ...)`) trong Editor không bao giờ
// khớp: Esc không đóng được autocomplete, Ctrl+U/K/W không xóa được, mũi tên
// không cuộn được... Đây là nguyên nhân "TUI hiện lên nhưng tính năng chưa chạy".
//
// File này chỉ DỊCH sự kiện Ink sang cùng không gian danh tính với Keys.ts
// (enter / escape / tab / ctrl+u / shift+tab / alt+backspace / ctrl+left ...).

/** Các cờ của `useInput` mà ta cần (phần con của Key của Ink). */
export interface InkKeyFlags {
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;
  leftArrow?: boolean;
  rightArrow?: boolean;
  return?: boolean;
  escape?: boolean;
  tab?: boolean;
  backspace?: boolean;
  delete?: boolean;
  pageUp?: boolean;
  pageDown?: boolean;
  home?: boolean;
  end?: boolean;
  insert?: boolean;
}

/** Ký tự in được (chữ, số, symbol) theo sau không có modifier đặc biệt. */
function printable(data: string): string | undefined {
  if (data.length === 0) return undefined;
  const code = data.codePointAt(0)!;
  return code >= 32 && code !== 127 ? data : undefined;
}

/**
 * Danh tính phím từ sự kiện Ink.
 *
 * Trả về cùng định dạng với keybinding (`enter`, `escape`, `tab`, `backspace`,
 * `delete`, `up`, `ctrl+u`, `shift+tab`, `alt+backspace`, `ctrl+left`...).
 */
export function inkKeyId(data: string, key: InkKeyFlags): string | undefined {
  const mods: string[] = [];
  if (key.shift) mods.push("shift");
  if (key.ctrl) mods.push("ctrl");
  if (key.meta) mods.push("alt");

  // Phím chức năng trước: chúng đến với data rỗng.
  if (key.upArrow) return withMods(mods, "up");
  if (key.downArrow) return withMods(mods, "down");
  if (key.leftArrow) return withMods(mods, "left");
  if (key.rightArrow) return withMods(mods, "right");
  if (key.pageUp) return withMods(mods, "pageUp");
  if (key.pageDown) return withMods(mods, "pageDown");
  if (key.home) return withMods(mods, "home");
  if (key.end) return withMods(mods, "end");
  if (key.delete) return withMods(mods, "delete");
  if (key.insert) return withMods(mods, "insert");
  if (key.backspace) return withMods(mods, "backspace");
  if (key.escape) return withMods(mods, "escape");
  if (key.return) return withMods(mods, "enter");
  if (key.tab) return withMods(mods, "tab");

  // Ink đặt cờ meta cho Alt; với Alt+Enter cả return và meta cùng bật.
  if (key.meta && key.return) return "alt+enter";
  if (key.meta && key.backspace) return "alt+backspace";

  // Ctrl/Alt + ký tự in được: Ink giao ký tự thường kèm cờ.
  const char = printable(data);
  if (char !== undefined) {
    if (key.ctrl && !key.meta) return `ctrl+${char.toLowerCase()}`;
    if (key.meta && !key.ctrl) return `alt+${char}`;
    if (mods.length === 0) return char;
  }
  return undefined;
}

function withMods(mods: string[], name: string): string {
  return mods.length > 0 ? `${mods.join("+")}+${name}` : name;
}
