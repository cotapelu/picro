// Keybindings - thanh ghi phím tắt toàn cục
// Bắt chước nguyên tắc pi-tui keybindings.ts:
//   - TUI_KEYBINDINGS: bảng định nghĩa phím mặc định kèm mô tả
//   - KeybindingsManager: gộp phím mặc định + phím người dùng đặt
//   - Phát hiện xung đột khi một phím bị nhiều hành động cùng nhận
//   - getSelectPageIndex: tính vị trí chọn sau PageUp/PageDown
// Port sang TSX riêng, khong copy code truc iep.

import { matchesKey } from "./Keys.js";

/** Danh tính hành động cần gán phím. */
export type Keybinding =
  | "tui.editor.cursorUp" | "tui.editor.cursorDown"
  | "tui.editor.historyPrevious" | "tui.editor.historyNext"
  | "tui.editor.cursorLeft" | "tui.editor.cursorRight"
  | "tui.editor.cursorWordLeft" | "tui.editor.cursorWordRight"
  | "tui.editor.cursorLineStart" | "tui.editor.cursorLineEnd"
  | "tui.editor.jumpForward" | "tui.editor.jumpBackward"
  | "tui.editor.pageUp" | "tui.editor.pageDown"
  | "tui.editor.deleteCharBackward" | "tui.editor.deleteCharForward"
  | "tui.editor.deleteWordBackward" | "tui.editor.deleteWordForward"
  | "tui.editor.deleteToLineStart" | "tui.editor.deleteToLineEnd"
  | "tui.editor.yank" | "tui.editor.yankPop" | "tui.editor.undo"
  | "tui.input.newLine" | "tui.input.submit" | "tui.input.tab" | "tui.input.copy"
  | "tui.select.up" | "tui.select.down" | "tui.select.pageUp" | "tui.select.pageDown"
  | "tui.select.confirm" | "tui.select.cancel"
  | "tui.altScreen.pageUp" | "tui.altScreen.pageDown" | "tui.altScreen.halfPageUp"
  | "tui.altScreen.halfPageDown" | "tui.altScreen.lineUp" | "tui.altScreen.lineDown"
  | "tui.altScreen.previousPrompt" | "tui.altScreen.nextPrompt"
  | "tui.altScreen.search" | "tui.altScreen.searchNext" | "tui.altScreen.searchPrevious"
  | "tui.altScreen.searchClose" | "tui.altScreen.top" | "tui.altScreen.bottom";

export interface KeybindingDefinition {
  defaultKeys: string | string[];
  description?: string;
}

export type KeybindingDefinitions = Record<string, KeybindingDefinition>;
export type KeybindingsConfig = Record<string, string | string[] | undefined>;

/** Bảng phím mặc định cho TUI. */
export const TUI_KEYBINDINGS = {
  "tui.editor.cursorUp": { defaultKeys: "up", description: "Di chuyển con trỏ lên" },
  "tui.editor.cursorDown": { defaultKeys: "down", description: "Di chuyển con trỏ xuống" },
  "tui.editor.historyPrevious": { defaultKeys: [], description: "Chọn mục lịch sử trước" },
  "tui.editor.historyNext": { defaultKeys: [], description: "Chọn mục lịch sử sau" },
  "tui.editor.cursorLeft": { defaultKeys: ["left", "ctrl+b"], description: "Di chuyển con trỏ trái" },
  "tui.editor.cursorRight": { defaultKeys: ["right", "ctrl+f"], description: "Di chuyển con trỏ phải" },
  "tui.editor.cursorWordLeft": { defaultKeys: ["alt+left", "ctrl+left", "alt+b"], description: "Di chuyển theo từ về trái" },
  "tui.editor.cursorWordRight": { defaultKeys: ["alt+right", "ctrl+right", "alt+f"], description: "Di chuyển theo từ về phải" },
  "tui.editor.cursorLineStart": { defaultKeys: ["home", "ctrl+a"], description: "Về đầu dòng" },
  "tui.editor.cursorLineEnd": { defaultKeys: ["end", "ctrl+e"], description: "Xuống cuối dòng" },
  "tui.editor.jumpForward": { defaultKeys: "ctrl+]", description: "Nhảy tới ký tự phía trước" },
  "tui.editor.jumpBackward": { defaultKeys: "ctrl+alt+]", description: "Nhảy về ký tự phía sau" },
  "tui.editor.pageUp": { defaultKeys: ["pageUp", "ctrl+pageUp"], description: "Cuộn một trang lên" },
  "tui.editor.pageDown": { defaultKeys: ["pageDown", "ctrl+pageDown"], description: "Cuộn một trang xuống" },
  "tui.editor.deleteCharBackward": { defaultKeys: "backspace", description: "Xóa ký tự phía trước" },
  "tui.editor.deleteCharForward": { defaultKeys: ["delete", "ctrl+d"], description: "Xóa ký tự phía sau" },
  "tui.editor.deleteWordBackward": { defaultKeys: ["ctrl+w", "alt+backspace"], description: "Xóa từ phía trước" },
  "tui.editor.deleteWordForward": { defaultKeys: ["alt+d", "alt+delete"], description: "Xóa từ phía sau" },
  "tui.editor.deleteToLineStart": { defaultKeys: "ctrl+u", description: "Xóa về đầu dòng" },
  "tui.editor.deleteToLineEnd": { defaultKeys: "ctrl+k", description: "Xóa đến cuối dòng" },
  "tui.editor.yank": { defaultKeys: "ctrl+y", description: "Dán lại đoạn vừa xóa" },
  "tui.editor.yankPop": { defaultKeys: "alt+y", description: "Xoay vòng đoạn vừa dán" },
  "tui.editor.undo": { defaultKeys: "ctrl+-", description: "Hoàn tác" },
  "tui.input.newLine": { defaultKeys: ["shift+enter", "ctrl+j"], description: "Thêm dòng mới" },
  "tui.input.submit": { defaultKeys: "enter", description: "Gửi nội dung" },
  "tui.input.tab": { defaultKeys: "tab", description: "Tab / gợi ý" },
  "tui.input.copy": { defaultKeys: "ctrl+c", description: "Sao chép vùng chọn" },
  "tui.select.up": { defaultKeys: "up", description: "Di chuyển chọn lên" },
  "tui.select.down": { defaultKeys: "down", description: "Di chuyển chọn xuống" },
  "tui.select.pageUp": { defaultKeys: "pageUp", description: "Chọn lên một trang" },
  "tui.select.pageDown": { defaultKeys: "pageDown", description: "Chọn xuống một trang" },
  "tui.select.confirm": { defaultKeys: "enter", description: "Xác nhận" },
  "tui.select.cancel": { defaultKeys: ["escape", "ctrl+c"], description: "Hủy" },
  "tui.altScreen.pageUp": { defaultKeys: "pageUp", description: "Cuộn vùng xem lên trang" },
  "tui.altScreen.pageDown": { defaultKeys: "pageDown", description: "Cuộn vùng xem xuống trang" },
  "tui.altScreen.halfPageUp": { defaultKeys: [], description: "Cuộn nửa trang lên" },
  "tui.altScreen.halfPageDown": { defaultKeys: [], description: "Cuộn nửa trang xuống" },
  "tui.altScreen.lineUp": { defaultKeys: [], description: "Cuộn lên một dòng" },
  "tui.altScreen.lineDown": { defaultKeys: [], description: "Cuộn xuống một dòng" },
  "tui.altScreen.previousPrompt": { defaultKeys: ["ctrl+shift+up", "ctrl+up"], description: "Nhảy về dấu nhắc trước" },
  "tui.altScreen.nextPrompt": { defaultKeys: ["ctrl+shift+down", "ctrl+down"], description: "Nhảy tới dấu nhắc sau" },
  "tui.altScreen.search": { defaultKeys: "ctrl+shift+f", description: "Tìm trong vùng xem chính" },
  "tui.altScreen.searchNext": { defaultKeys: ["enter", "ctrl+g"], description: "Kết quả tiếp theo" },
  "tui.altScreen.searchPrevious": { defaultKeys: ["shift+enter", "ctrl+shift+g"], description: "Kết quả trước đó" },
  "tui.altScreen.searchClose": { defaultKeys: "escape", description: "Đóng tìm kiếm" },
  "tui.altScreen.top": { defaultKeys: "ctrl+home", description: "Cuộn về đầu" },
  "tui.altScreen.bottom": { defaultKeys: "ctrl+end", description: "Cuộn xuống cuối" },
} as const satisfies KeybindingDefinitions;

export interface KeybindingConflict {
  key: string;
  keybindings: string[];
}

function normalizeKeys(keys: string | string[] | undefined): string[] {
  if (keys === undefined) return [];
  const list = Array.isArray(keys) ? keys : [keys];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const key of list) {
    if (!seen.has(key)) {
      seen.add(key);
      result.push(key);
    }
  }
  return result;
}

/** Quản lý phím tắt: gộp mặc định + người dùng, phát hiện xung đột. */
export class KeybindingsManager {
  private definitions: KeybindingDefinitions;
  private userBindings: KeybindingsConfig;
  private keysById = new Map<string, string[]>();
  private conflicts: KeybindingConflict[] = [];

  constructor(definitions: KeybindingDefinitions, userBindings: KeybindingsConfig = {}) {
    this.definitions = definitions;
    this.userBindings = userBindings;
    this.rebuild();
  }

  private rebuild(): void {
    this.keysById.clear();
    this.conflicts = [];

    const userClaims = new Map<string, Set<string>>();
    for (const [keybinding, keys] of Object.entries(this.userBindings)) {
      if (!(keybinding in this.definitions)) continue;
      for (const key of normalizeKeys(keys)) {
        const claimants = userClaims.get(key) ?? new Set<string>();
        claimants.add(keybinding);
        userClaims.set(key, claimants);
      }
    }
    for (const [key, keybindings] of userClaims) {
      if (keybindings.size > 1) this.conflicts.push({ key, keybindings: [...keybindings] });
    }

    for (const [id, definition] of Object.entries(this.definitions)) {
      const userKeys = this.userBindings[id];
      const keys = userKeys === undefined ? normalizeKeys(definition.defaultKeys) : normalizeKeys(userKeys);
      this.keysById.set(id, keys);
    }
  }

  matches(data: string, keybinding: string): boolean {
    for (const key of this.keysById.get(keybinding) ?? []) {
      if (matchesKey(data, key)) return true;
    }
    return false;
  }

  getKeys(keybinding: string): string[] {
    return [...(this.keysById.get(keybinding) ?? [])];
  }

  getDefinition(keybinding: string): KeybindingDefinition | undefined {
    return this.definitions[keybinding];
  }

  getConflicts(): KeybindingConflict[] {
    return this.conflicts.map((c) => ({ ...c, keybindings: [...c.keybindings] }));
  }

  setUserBindings(userBindings: KeybindingsConfig): void {
    this.userBindings = userBindings;
    this.rebuild();
  }

  getUserBindings(): KeybindingsConfig {
    return { ...this.userBindings };
  }

  getResolvedBindings(): KeybindingsConfig {
    const resolved: KeybindingsConfig = {};
    for (const id of Object.keys(this.definitions)) {
      const keys = this.keysById.get(id) ?? [];
      resolved[id] = keys.length === 1 ? keys[0]! : [...keys];
    }
    return resolved;
  }
}

let globalKeybindings: KeybindingsManager | null = null;

export function setKeybindings(keybindings: KeybindingsManager): void {
  globalKeybindings = keybindings;
}

export function getKeybindings(): KeybindingsManager {
  if (!globalKeybindings) globalKeybindings = new KeybindingsManager(TUI_KEYBINDINGS);
  return globalKeybindings;
}

/** Vị trí chọn sau khi nhấn PageUp/PageDown; undefined nếu không phải phím trang. */
export function getSelectPageIndex(
  keybindings: KeybindingsManager,
  data: string,
  selectedIndex: number,
  itemCount: number,
  pageSize: number,
): number | undefined {
  let direction: number;
  if (keybindings.matches(data, "tui.select.pageUp")) direction = -1;
  else if (keybindings.matches(data, "tui.select.pageDown")) direction = 1;
  else return undefined;
  return Math.max(0, Math.min(itemCount - 1, selectedIndex + direction * pageSize));
}
