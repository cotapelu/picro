// Keys - nhận diện phím bấm từ terminal
// Bắt chước nguyên tắc pi-tui keys.ts:
//   - Hỗ trợ cả sequence cổ điển và giao thức Kitty
//   - matchesKey(data, keyId) khớp phím theo danh tính
//   - parseKey(data) trả về nhãn phím
//   - Key.* tạo danh tính phím an toàn kiểu
// Port sang TSX riêng, khong copy code truc iep.

const SYMBOL_KEYS = new Set([
  "`", "-", "=", "[", "]", "\\", ";", "'", ",", ".", "/",
  "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_",
  "+", "|", "~", "{", "}", ":", "<", ">", "?",
]);

const SHIFTED_SYMBOL_KEYS = new Set("~!@#$%^&*()_+|{}:<>?");

const MODIFIERS = { shift: 1, alt: 2, ctrl: 4, super: 8 } as const;
const LOCK_MASK = 64 + 128;
const CODEPOINTS = {
  escape: 27, tab: 9, enter: 13, space: 32, backspace: 127, kpEnter: 57414,
} as const;
const ARROW_CODEPOINTS = { up: -1, down: -2, right: -3, left: -4 } as const;
const FUNCTIONAL_CODEPOINTS = {
  delete: -10, insert: -11, pageUp: -12, pageDown: -13,
  home: -14, end: -15, f1: -21, f2: -22, f3: -23, f4: -24, f5: -25,
  f6: -26, f7: -27, f8: -28, f9: -29, f10: -30, f11: -31, f12: -32,
} as const;

const KITTY_FUNCTIONAL_PUA_START = 57344;
const KITTY_FUNCTIONAL_PUA_END = 63743;

const KITTY_FUNCTIONAL_KEY_EQUIVALENTS = new Map<number, number>([
  [57399, 48], [57400, 49], [57401, 50], [57402, 51], [57403, 52], [57404, 53],
  [57405, 54], [57406, 55], [57407, 56], [57408, 57], [57409, 46], [57410, 47],
  [57411, 42], [57412, 45], [57413, 43], [57415, 61], [57416, 44],
  [57417, ARROW_CODEPOINTS.left], [57418, ARROW_CODEPOINTS.right],
  [57419, ARROW_CODEPOINTS.up], [57420, ARROW_CODEPOINTS.down],
  [57421, FUNCTIONAL_CODEPOINTS.pageUp], [57422, FUNCTIONAL_CODEPOINTS.pageDown],
  [57423, FUNCTIONAL_CODEPOINTS.home], [57424, FUNCTIONAL_CODEPOINTS.end],
  [57425, FUNCTIONAL_CODEPOINTS.insert], [57426, FUNCTIONAL_CODEPOINTS.delete],
]);

const LEGACY_KEY_SEQUENCES = {
  up: ["\x1b[A", "\x1bOA"],
  down: ["\x1b[B", "\x1bOB"],
  right: ["\x1b[C", "\x1bOC"],
  left: ["\x1b[D", "\x1bOD"],
  home: ["\x1b[H", "\x1bOH", "\x1b[1~", "\x1b[7~"],
  end: ["\x1b[F", "\x1bOF", "\x1b[4~", "\x1b[8~"],
  insert: ["\x1b[2~"],
  delete: ["\x1b[3~"],
  pageUp: ["\x1b[5~", "\x1b[[5~"],
  pageDown: ["\x1b[6~", "\x1b[[6~"],
  f1: ["\x1bOP", "\x1b[11~", "\x1b[[A"],
  f2: ["\x1bOQ", "\x1b[12~", "\x1b[[B"],
  f3: ["\x1bOR", "\x1b[13~", "\x1b[[C"],
  f4: ["\x1bOS", "\x1b[14~", "\x1b[[D"],
  f5: ["\x1b[15~", "\x1b[[E"],
} as const;

const LEGACY_SHIFT_SEQUENCES = {
  up: ["\x1b[a"], down: ["\x1b[b"], right: ["\x1b[c"], left: ["\x1b[d"],
  insert: ["\x1b[2$"], delete: ["\x1b[3$"], pageUp: ["\x1b[5$"],
  pageDown: ["\x1b[6$"], home: ["\x1b[7$"], end: ["\x1b[8$"],
} as const;

const LEGACY_CTRL_SEQUENCES = {
  up: ["\x1bOa"], down: ["\x1bOb"], right: ["\x1bOc"], left: ["\x1bOd"],
  insert: ["\x1b[2^"], delete: ["\x1b[3^"], pageUp: ["\x1b[5^"],
  pageDown: ["\x1b[6^"], home: ["\x1b[7^"], end: ["\x1b[8^"],
} as const;

const LEGACY_SEQUENCE_KEY_IDS: Record<string, string> = {
  "\x1bOA": "up", "\x1bOB": "down", "\x1bOC": "right", "\x1bOD": "left",
  "\x1bOH": "home", "\x1bOF": "end", "\x1b[E": "clear", "\x1bOE": "clear",
  "\x1bOe": "ctrl+clear", "\x1b[e": "shift+clear", "\x1b[2~": "insert",
  "\x1b[2$": "shift+insert", "\x1b[2^": "ctrl+insert", "\x1b[3$": "shift+delete",
  "\x1b[3^": "ctrl+delete", "\x1b[[5~": "pageUp", "\x1b[[6~": "pageDown",
  "\x1b[a": "shift+up", "\x1b[b": "shift+down", "\x1b[c": "shift+right",
  "\x1b[d": "shift+left", "\x1bOa": "ctrl+up", "\x1bOb": "ctrl+down",
  "\x1bOc": "ctrl+right", "\x1bOd": "ctrl+left", "\x1b[5$": "shift+pageUp",
  "\x1b[6$": "shift+pageDown", "\x1b[7$": "shift+home", "\x1b[8$": "shift+end",
  "\x1b[5^": "ctrl+pageUp", "\x1b[6^": "ctrl+pageDown", "\x1b[7^": "ctrl+home",
  "\x1b[8^": "ctrl+end", "\x1bOP": "f1", "\x1bOQ": "f2", "\x1bOR": "f3",
  "\x1bOS": "f4", "\x1b[11~": "f1", "\x1b[12~": "f2", "\x1b[13~": "f3",
  "\x1b[14~": "f4", "\x1b[[A": "f1", "\x1b[[B": "f2", "\x1b[[C": "f3",
  "\x1b[[D": "f4", "\x1b[[E": "f5", "\x1b[15~": "f5", "\x1b[17~": "f6",
  "\x1b[18~": "f7", "\x1b[19~": "f8", "\x1b[20~": "f9", "\x1b[21~": "f10",
  "\x1b[23~": "f11", "\x1b[24~": "f12", "\x1bb": "alt+left", "\x1bf": "alt+right",
  "\x1bp": "alt+up", "\x1bn": "alt+down",
};

let kittyProtocolActive = false;

export function setKittyProtocolActive(active: boolean): void {
  kittyProtocolActive = active;
}

export function isKittyProtocolActive(): boolean {
  return kittyProtocolActive;
}

export type KeyEventType = "press" | "repeat" | "release";

function normalizeKittyCodepoint(codepoint: number): number {
  return KITTY_FUNCTIONAL_KEY_EQUIVALENTS.get(codepoint) ?? codepoint;
}

function normalizeShiftedLetter(codepoint: number, modifier: number): number {
  const effective = modifier & ~LOCK_MASK;
  if ((effective & MODIFIERS.shift) !== 0 && codepoint >= 65 && codepoint <= 90) {
    return codepoint + 32;
  }
  return codepoint;
}

function parseEventType(raw: string | undefined): KeyEventType {
  if (!raw) return "press";
  const type = Number.parseInt(raw, 10);
  if (type === 2) return "repeat";
  if (type === 3) return "release";
  return "press";
}

function parseKittySequence(data: string): { codepoint: number; shiftedKey?: number; baseLayoutKey?: number; modifier: number; eventType: KeyEventType } | null {
  const csi = /^\x1b\[(\d+)(?::(\d*))?(?::(\d+))?(?:;(\d+))?(?::(\d+))?u$/.exec(data);
  if (csi) {
    const codepoint = Number.parseInt(csi[1]!, 10);
    const shifted = csi[2] && csi[2].length > 0 ? Number.parseInt(csi[2], 10) : undefined;
    const base = csi[3] ? Number.parseInt(csi[3], 10) : undefined;
    const mod = csi[4] ? Number.parseInt(csi[4], 10) : 1;
    return { codepoint, shiftedKey: shifted, baseLayoutKey: base, modifier: mod - 1, eventType: parseEventType(csi[5]) };
  }

  const arrow = /^\x1b\[1;(\d+)(?::(\d+))?([ABCD])$/.exec(data);
  if (arrow) {
    const codes: Record<string, number> = { A: -1, B: -2, C: -3, D: -4 };
    return {
      codepoint: codes[arrow[3]!]!,
      modifier: Number.parseInt(arrow[1]!, 10) - 1,
      eventType: parseEventType(arrow[2]),
    };
  }

  const func = /^\x1b\[(\d+)(?:;(\d+))?(?::(\d+))?~$/.exec(data);
  if (func) {
    const table: Record<number, number> = {
      2: FUNCTIONAL_CODEPOINTS.insert, 3: FUNCTIONAL_CODEPOINTS.delete,
      5: FUNCTIONAL_CODEPOINTS.pageUp, 6: FUNCTIONAL_CODEPOINTS.pageDown,
      7: FUNCTIONAL_CODEPOINTS.home, 8: FUNCTIONAL_CODEPOINTS.end,
      11: FUNCTIONAL_CODEPOINTS.f1, 12: FUNCTIONAL_CODEPOINTS.f2, 13: FUNCTIONAL_CODEPOINTS.f3,
      14: FUNCTIONAL_CODEPOINTS.f4, 15: FUNCTIONAL_CODEPOINTS.f5, 17: FUNCTIONAL_CODEPOINTS.f6,
      18: FUNCTIONAL_CODEPOINTS.f7, 19: FUNCTIONAL_CODEPOINTS.f8, 20: FUNCTIONAL_CODEPOINTS.f9,
      21: FUNCTIONAL_CODEPOINTS.f10, 23: FUNCTIONAL_CODEPOINTS.f11, 24: FUNCTIONAL_CODEPOINTS.f12,
    };
    const cp = table[Number.parseInt(func[1]!, 10)];
    if (cp !== undefined) {
      return { codepoint: cp, modifier: (func[2] ? Number.parseInt(func[2], 10) : 1) - 1, eventType: parseEventType(func[3]) };
    }
  }

  const homeEnd = /^\x1b\[1;(\d+)(?::(\d+))?([HF])$/.exec(data);
  if (homeEnd) {
    return {
      codepoint: homeEnd[3] === "H" ? FUNCTIONAL_CODEPOINTS.home : FUNCTIONAL_CODEPOINTS.end,
      modifier: Number.parseInt(homeEnd[1]!, 10) - 1,
      eventType: parseEventType(homeEnd[2]),
    };
  }

  const fkey = /^\x1b\[(?:1;(\d+)(?::(\d+))?)?([PQS])$/.exec(data);
  if (fkey) {
    const table: Record<string, number> = { P: FUNCTIONAL_CODEPOINTS.f1, Q: FUNCTIONAL_CODEPOINTS.f2, S: FUNCTIONAL_CODEPOINTS.f4 };
    return {
      codepoint: table[fkey[3]!]!,
      modifier: (fkey[1] ? Number.parseInt(fkey[1], 10) : 1) - 1,
      eventType: parseEventType(fkey[2]),
    };
  }
  return null;
}

function parseModifyOtherKeys(data: string): { codepoint: number; modifier: number } | null {
  const m = /^\x1b\[27;(\d+);(\d+)~$/.exec(data);
  if (!m) return null;
  return { codepoint: Number.parseInt(m[2]!, 10), modifier: Number.parseInt(m[1]!, 10) - 1 };
}

function matchesLegacy(data: string, sequences: readonly string[]): boolean {
  return sequences.includes(data);
}

function matchesLegacyModifier(data: string, key: keyof typeof LEGACY_SHIFT_SEQUENCES, modifier: number): boolean {
  if (modifier === MODIFIERS.shift) return matchesLegacy(data, LEGACY_SHIFT_SEQUENCES[key]);
  if (modifier === MODIFIERS.ctrl) return matchesLegacy(data, LEGACY_CTRL_SEQUENCES[key]);
  return false;
}

function rawCtrlChar(key: string): string | null {
  const ch = key.toLowerCase();
  const code = ch.charCodeAt(0);
  if ((code >= 97 && code <= 122) || ch === "[" || ch === "\\" || ch === "]" || ch === "_") {
    return String.fromCharCode(code & 0x1f);
  }
  if (ch === "-") return String.fromCharCode(31);
  return null;
}

function isWindowsTerminal(): boolean {
  return Boolean(process.env.WT_SESSION) && !process.env.SSH_CONNECTION && !process.env.SSH_CLIENT && !process.env.SSH_TTY;
}

function matchesRawBackspace(data: string, modifier: number): boolean {
  if (data === "\x7f") return modifier === 0;
  if (data !== "\x08") return false;
  return isWindowsTerminal() ? modifier === MODIFIERS.ctrl : modifier === 0;
}

function matchesKitty(data: string, expectedCode: number, expectedMod: number): boolean {
  const parsed = parseKittySequence(data);
  if (!parsed) return false;
  const actualMod = parsed.modifier & ~LOCK_MASK;
  const wantedMod = expectedMod & ~LOCK_MASK;
  const normCode = normalizeShiftedLetter(normalizeKittyCodepoint(parsed.codepoint), parsed.modifier);
  const normWanted = normalizeShiftedLetter(normalizeKittyCodepoint(expectedCode), expectedMod);
  if (actualMod === wantedMod && normCode === normWanted) return true;

  if (parsed.baseLayoutKey !== undefined && parsed.baseLayoutKey === expectedCode && actualMod === wantedMod) {
    const isLatin = normCode >= 97 && normCode <= 122;
    const isSymbol = SYMBOL_KEYS.has(String.fromCharCode(normCode));
    if (!isLatin && !isSymbol) return true;
  }
  return false;
}

function matchesModifyOtherKeys(data: string, code: number, modifier: number): boolean {
  const parsed = parseModifyOtherKeys(data);
  if (!parsed) return false;
  return parsed.codepoint === code && parsed.modifier === modifier;
}

function formatWithModifiers(keyName: string, modifier: number): string | undefined {
  const mods: string[] = [];
  const effective = modifier & ~LOCK_MASK;
  const supported = MODIFIERS.shift | MODIFIERS.ctrl | MODIFIERS.alt | MODIFIERS.super;
  if ((effective & ~supported) !== 0) return undefined;
  if (effective & MODIFIERS.shift) mods.push("shift");
  if (effective & MODIFIERS.ctrl) mods.push("ctrl");
  if (effective & MODIFIERS.alt) mods.push("alt");
  if (effective & MODIFIERS.super) mods.push("super");
  return mods.length > 0 ? `${mods.join("+")}+${keyName}` : keyName;
}

function parseKeyId(keyId: string): { key: string; ctrl: boolean; shift: boolean; alt: boolean; super: boolean } | null {
  let key = keyId.toLowerCase();
  const mods = new Set<string>();
  while (true) {
    const name = ["shift", "alt", "ctrl", "super"].find((n) => key.startsWith(`${n}+`));
    if (!name) break;
    if (mods.has(name)) return null;
    mods.add(name);
    key = key.slice(name.length + 1);
  }
  if (!key || (key.includes("+") && key !== "+")) return null;
  return { key, ctrl: mods.has("ctrl"), shift: mods.has("shift"), alt: mods.has("alt"), super: mods.has("super") };
}

/** Khớp dữ liệu đầu vào với danh tính phím. */
export function matchesKey(data: string, keyId: string): boolean {
  const parsed = parseKeyId(keyId);
  if (!parsed) return false;
  const { key, ctrl, shift, alt, super: sup } = parsed;

  let modifier = 0;
  if (shift) modifier |= MODIFIERS.shift;
  if (alt) modifier |= MODIFIERS.alt;
  if (ctrl) modifier |= MODIFIERS.ctrl;
  if (sup) modifier |= MODIFIERS.super;

  switch (key) {
    case "escape":
    case "esc":
      return modifier === 0 && (data === "\x1b" || matchesKitty(data, CODEPOINTS.escape, 0) || matchesModifyOtherKeys(data, CODEPOINTS.escape, 0));
    case "space":
      if (modifier === 0) return data === " " || matchesKitty(data, CODEPOINTS.space, 0) || matchesModifyOtherKeys(data, CODEPOINTS.space, 0);
      return matchesKitty(data, CODEPOINTS.space, modifier) || matchesModifyOtherKeys(data, CODEPOINTS.space, modifier);
    case "tab":
      if (modifier === MODIFIERS.shift) return data === "\x1b[Z" || matchesKitty(data, CODEPOINTS.tab, MODIFIERS.shift) || matchesModifyOtherKeys(data, CODEPOINTS.tab, MODIFIERS.shift);
      if (modifier === 0) return data === "\t" || matchesKitty(data, CODEPOINTS.tab, 0);
      return matchesKitty(data, CODEPOINTS.tab, modifier) || matchesModifyOtherKeys(data, CODEPOINTS.tab, modifier);
    case "enter":
    case "return":
      if (modifier === MODIFIERS.shift) {
        if (matchesKitty(data, CODEPOINTS.enter, MODIFIERS.shift) || matchesKitty(data, CODEPOINTS.kpEnter, MODIFIERS.shift)) return true;
        if (matchesModifyOtherKeys(data, CODEPOINTS.enter, MODIFIERS.shift)) return true;
        if (kittyProtocolActive) return data === "\x1b\r" || data === "\n";
        return false;
      }
      if (modifier === MODIFIERS.alt) {
        if (matchesKitty(data, CODEPOINTS.enter, MODIFIERS.alt) || matchesKitty(data, CODEPOINTS.kpEnter, MODIFIERS.alt)) return true;
        if (matchesModifyOtherKeys(data, CODEPOINTS.enter, MODIFIERS.alt)) return true;
        return !kittyProtocolActive && data === "\x1b\r";
      }
      if (modifier === 0) {
        return data === "\r" || (!kittyProtocolActive && data === "\n") || data === "\x1bOM" || matchesKitty(data, CODEPOINTS.enter, 0) || matchesKitty(data, CODEPOINTS.kpEnter, 0);
      }
      return matchesKitty(data, CODEPOINTS.enter, modifier) || matchesKitty(data, CODEPOINTS.kpEnter, modifier) || matchesModifyOtherKeys(data, CODEPOINTS.enter, modifier);
    case "backspace":
      if (modifier === MODIFIERS.alt) {
        if (data === "\x1b\x7f" || data === "\x1b\b") return true;
        return matchesKitty(data, CODEPOINTS.backspace, MODIFIERS.alt) || matchesModifyOtherKeys(data, CODEPOINTS.backspace, MODIFIERS.alt);
      }
      if (modifier === MODIFIERS.ctrl) {
        if (matchesRawBackspace(data, MODIFIERS.ctrl)) return true;
        return matchesKitty(data, CODEPOINTS.backspace, MODIFIERS.ctrl) || matchesModifyOtherKeys(data, CODEPOINTS.backspace, MODIFIERS.ctrl);
      }
      if (modifier === 0) return matchesRawBackspace(data, 0) || matchesKitty(data, CODEPOINTS.backspace, 0) || matchesModifyOtherKeys(data, CODEPOINTS.backspace, 0);
      return matchesKitty(data, CODEPOINTS.backspace, modifier) || matchesModifyOtherKeys(data, CODEPOINTS.backspace, modifier);
    case "insert":
      if (modifier === 0) return matchesLegacy(data, LEGACY_KEY_SEQUENCES.insert) || matchesKitty(data, FUNCTIONAL_CODEPOINTS.insert, 0);
      if (matchesLegacyModifier(data, "insert", modifier)) return true;
      return matchesKitty(data, FUNCTIONAL_CODEPOINTS.insert, modifier);
    case "delete":
      if (modifier === 0) return matchesLegacy(data, LEGACY_KEY_SEQUENCES.delete) || matchesKitty(data, FUNCTIONAL_CODEPOINTS.delete, 0);
      if (matchesLegacyModifier(data, "delete", modifier)) return true;
      return matchesKitty(data, FUNCTIONAL_CODEPOINTS.delete, modifier);
    case "clear":
      return modifier === 0 && matchesLegacy(data, ["\x1b[E", "\x1bOE"]);
    case "home":
      if (modifier === 0) return matchesLegacy(data, LEGACY_KEY_SEQUENCES.home) || matchesKitty(data, FUNCTIONAL_CODEPOINTS.home, 0);
      if (matchesLegacyModifier(data, "home", modifier)) return true;
      return matchesKitty(data, FUNCTIONAL_CODEPOINTS.home, modifier);
    case "end":
      if (modifier === 0) return matchesLegacy(data, LEGACY_KEY_SEQUENCES.end) || matchesKitty(data, FUNCTIONAL_CODEPOINTS.end, 0);
      if (matchesLegacyModifier(data, "end", modifier)) return true;
      return matchesKitty(data, FUNCTIONAL_CODEPOINTS.end, modifier);
    case "pageup":
      if (modifier === 0) return matchesLegacy(data, LEGACY_KEY_SEQUENCES.pageUp) || matchesKitty(data, FUNCTIONAL_CODEPOINTS.pageUp, 0);
      if (matchesLegacyModifier(data, "pageUp", modifier)) return true;
      return matchesKitty(data, FUNCTIONAL_CODEPOINTS.pageUp, modifier);
    case "pagedown":
      if (modifier === 0) return matchesLegacy(data, LEGACY_KEY_SEQUENCES.pageDown) || matchesKitty(data, FUNCTIONAL_CODEPOINTS.pageDown, 0);
      if (matchesLegacyModifier(data, "pageDown", modifier)) return true;
      return matchesKitty(data, FUNCTIONAL_CODEPOINTS.pageDown, modifier);
    case "up":
      if (modifier === MODIFIERS.alt) return data === "\x1bp" || matchesKitty(data, ARROW_CODEPOINTS.up, MODIFIERS.alt);
      if (modifier === 0) return matchesLegacy(data, LEGACY_KEY_SEQUENCES.up) || matchesKitty(data, ARROW_CODEPOINTS.up, 0);
      if (matchesLegacyModifier(data, "up", modifier)) return true;
      return matchesKitty(data, ARROW_CODEPOINTS.up, modifier);
    case "down":
      if (modifier === MODIFIERS.alt) return data === "\x1bn" || matchesKitty(data, ARROW_CODEPOINTS.down, MODIFIERS.alt);
      if (modifier === 0) return matchesLegacy(data, LEGACY_KEY_SEQUENCES.down) || matchesKitty(data, ARROW_CODEPOINTS.down, 0);
      if (matchesLegacyModifier(data, "down", modifier)) return true;
      return matchesKitty(data, ARROW_CODEPOINTS.down, modifier);
    case "left":
      if (modifier === MODIFIERS.alt) return data === "\x1b[1;3D" || data === "\x1bb" || matchesKitty(data, ARROW_CODEPOINTS.left, MODIFIERS.alt);
      if (modifier === MODIFIERS.ctrl) return data === "\x1b[1;5D" || matchesLegacyModifier(data, "left", MODIFIERS.ctrl) || matchesKitty(data, ARROW_CODEPOINTS.left, MODIFIERS.ctrl);
      if (modifier === 0) return matchesLegacy(data, LEGACY_KEY_SEQUENCES.left) || matchesKitty(data, ARROW_CODEPOINTS.left, 0);
      if (matchesLegacyModifier(data, "left", modifier)) return true;
      return matchesKitty(data, ARROW_CODEPOINTS.left, modifier);
    case "right":
      if (modifier === MODIFIERS.alt) return data === "\x1b[1;3C" || data === "\x1bf" || matchesKitty(data, ARROW_CODEPOINTS.right, MODIFIERS.alt);
      if (modifier === MODIFIERS.ctrl) return data === "\x1b[1;5C" || matchesLegacyModifier(data, "right", MODIFIERS.ctrl) || matchesKitty(data, ARROW_CODEPOINTS.right, MODIFIERS.ctrl);
      if (modifier === 0) return matchesLegacy(data, LEGACY_KEY_SEQUENCES.right) || matchesKitty(data, ARROW_CODEPOINTS.right, 0);
      if (matchesLegacyModifier(data, "right", modifier)) return true;
      return matchesKitty(data, ARROW_CODEPOINTS.right, modifier);
    case "f1": case "f2": case "f3": case "f4": case "f5":
      if (modifier === 0 && matchesLegacy(data, LEGACY_KEY_SEQUENCES[key])) return true;
      return matchesKitty(data, FUNCTIONAL_CODEPOINTS[key as "f1" | "f2" | "f3" | "f4" | "f5"], modifier);
  }

  // Phím đơn: chữ cái, chữ số, ký hiệu
  if (key.length === 1 && ((key >= "a" && key <= "z") || (key >= "0" && key <= "9") || SYMBOL_KEYS.has(key))) {
    const codepoint = key.charCodeAt(0);
    const rawCtrl = rawCtrlChar(key);
    if (modifier === MODIFIERS.ctrl + MODIFIERS.alt && !kittyProtocolActive && rawCtrl && data === `\x1b${rawCtrl}`) return true;
    if (modifier === MODIFIERS.alt && !kittyProtocolActive && data === `\x1b${key}`) return true;
    if (modifier === MODIFIERS.ctrl) {
      if (rawCtrl && data === rawCtrl) return true;
      return matchesKitty(data, codepoint, MODIFIERS.ctrl);
    }
    if (modifier === MODIFIERS.shift + MODIFIERS.ctrl) {
      return matchesKitty(data, codepoint, MODIFIERS.shift + MODIFIERS.ctrl);
    }
    if (modifier === MODIFIERS.shift) {
      const isLower = key >= "a" && key <= "z";
      if (isLower && data === key.toUpperCase()) return true;
      return matchesKitty(data, codepoint, MODIFIERS.shift);
    }
    if (modifier !== 0) return matchesKitty(data, codepoint, modifier);
    return data === key || matchesKitty(data, codepoint, 0);
  }
  return false;
}

function formatParsedKey(codepoint: number, modifier: number, baseLayoutKey?: number): string | undefined {
  const normalized = normalizeKittyCodepoint(codepoint);
  const identity = normalizeShiftedLetter(normalized, modifier);
  const isLatinLetter = identity >= 97 && identity <= 122;
  const isDigit = identity >= 48 && identity <= 57;
  const isSymbol = SYMBOL_KEYS.has(String.fromCharCode(identity));
  const effective = isLatinLetter || isDigit || isSymbol ? identity : (baseLayoutKey ?? identity);

  let name: string | undefined;
  if (effective === CODEPOINTS.escape) name = "escape";
  else if (effective === CODEPOINTS.tab) name = "tab";
  else if (effective === CODEPOINTS.enter || effective === CODEPOINTS.kpEnter) name = "enter";
  else if (effective === CODEPOINTS.space) name = "space";
  else if (effective === CODEPOINTS.backspace) name = "backspace";
  else if (effective === FUNCTIONAL_CODEPOINTS.delete) name = "delete";
  else if (effective === FUNCTIONAL_CODEPOINTS.insert) name = "insert";
  else if (effective === FUNCTIONAL_CODEPOINTS.home) name = "home";
  else if (effective === FUNCTIONAL_CODEPOINTS.end) name = "end";
  else if (effective === FUNCTIONAL_CODEPOINTS.pageUp) name = "pageUp";
  else if (effective === FUNCTIONAL_CODEPOINTS.pageDown) name = "pageDown";
  else if (effective <= FUNCTIONAL_CODEPOINTS.f1 && effective >= FUNCTIONAL_CODEPOINTS.f12) name = `f${FUNCTIONAL_CODEPOINTS.f1 - effective + 1}`;
  else if (effective === ARROW_CODEPOINTS.up) name = "up";
  else if (effective === ARROW_CODEPOINTS.down) name = "down";
  else if (effective === ARROW_CODEPOINTS.left) name = "left";
  else if (effective === ARROW_CODEPOINTS.right) name = "right";
  else if (effective >= 48 && effective <= 57) name = String.fromCharCode(effective);
  else if (effective >= 97 && effective <= 122) name = String.fromCharCode(effective);
  else if (SYMBOL_KEYS.has(String.fromCharCode(effective))) name = String.fromCharCode(effective);

  if (!name) return undefined;
  return formatWithModifiers(name, modifier);
}

export function parseKey(data: string): string | undefined {
  const kitty = parseKittySequence(data);
  if (kitty) return formatParsedKey(kitty.codepoint, kitty.modifier, kitty.baseLayoutKey);
  const mok = parseModifyOtherKeys(data);
  if (mok) return formatParsedKey(mok.codepoint, mok.modifier);

  if (kittyProtocolActive && (data === "\x1b\r" || data === "\n")) return "shift+enter";
  const legacy = LEGACY_SEQUENCE_KEY_IDS[data];
  if (legacy) return legacy;

  if (data === "\x1b") return "escape";
  if (data === "\t") return "tab";
  if (data === "\r" || (!kittyProtocolActive && data === "\n") || data === "\x1bOM") return "enter";
  if (data === "\x00") return "ctrl+space";
  if (data === " ") return "space";
  if (data === "\x7f") return "backspace";
  if (data === "\x08") return isWindowsTerminal() ? "ctrl+backspace" : "backspace";
  if (data === "\x1b[Z") return "shift+tab";
  if (data === "\x1b\x7f" || data === "\x1b\b") return "alt+backspace";
  if (!kittyProtocolActive && data === "\x1b\r") return "alt+enter";
  if (!kittyProtocolActive && data.length === 2 && data[0] === "\x1b") {
    const code = data.charCodeAt(1);
    if (code >= 1 && code <= 26) return `ctrl+alt+${String.fromCharCode(code + 96)}`;
    const k = String.fromCharCode(code);
    if ((code >= 97 && code <= 122) || (code >= 48 && code <= 57) || SYMBOL_KEYS.has(k)) return `alt+${k}`;
  }
  if (data === "\x1b[A") return "up";
  if (data === "\x1b[B") return "down";
  if (data === "\x1b[C") return "right";
  if (data === "\x1b[D") return "left";
  if (data === "\x1b[H" || data === "\x1bOH") return "home";
  if (data === "\x1b[F" || data === "\x1bOF") return "end";
  if (data === "\x1b[3~") return "delete";
  if (data === "\x1b[5~") return "pageUp";
  if (data === "\x1b[6~") return "pageDown";

  if (data.length === 1) {
    const code = data.charCodeAt(0);
    if (code >= 1 && code <= 26) return `ctrl+${String.fromCharCode(code + 96)}`;
    if (code >= 32 && code <= 126) return data;
  }
  return undefined;
}

/** Giải mã chuỗi CSI-u printable Kitty. */
export function decodeKittyPrintable(data: string): string | undefined {
  const m = /^\x1b\[(\d+)(?::(\d*))?(?::(\d+))?(?:;(\d+))?(?::(\d+))?u$/.exec(data);
  if (!m) return undefined;
  const codepoint = Number.parseInt(m[1] ?? "", 10);
  if (!Number.isFinite(codepoint)) return undefined;
  const shifted = m[2] && m[2].length > 0 ? Number.parseInt(m[2], 10) : undefined;
  const mod = m[4] ? Number.parseInt(m[4], 10) : 1;
  const modifier = Number.isFinite(mod) ? mod - 1 : 0;
  const allowed = MODIFIERS.shift | LOCK_MASK;
  if ((modifier & ~allowed) !== 0) return undefined;
  if (modifier & (MODIFIERS.alt | MODIFIERS.ctrl)) return undefined;
  let effective = codepoint;
  if (modifier & MODIFIERS.shift && typeof shifted === "number") effective = shifted;
  effective = normalizeKittyCodepoint(effective);
  if (!Number.isFinite(effective) || effective < 32) return undefined;
  if (effective >= KITTY_FUNCTIONAL_PUA_START && effective <= KITTY_FUNCTIONAL_PUA_END) return undefined;
  try {
    return String.fromCodePoint(effective);
  } catch {
    return undefined;
  }
}

export const Key = {
  escape: "escape",
  enter: "enter",
  tab: "tab",
  backspace: "backspace",
  space: "space",
  up: "up", down: "down", left: "left", right: "right",
  home: "home", end: "end", pageUp: "pageUp", pageDown: "pageDown",
  delete: "delete",
  ctrl: <K extends string>(key: K): `ctrl+${K}` => `ctrl+${key}` as `ctrl+${K}`,
  shift: <K extends string>(key: K): `shift+${K}` => `shift+${key}` as `shift+${K}`,
  alt: <K extends string>(key: K): `alt+${K}` => `alt+${key}` as `alt+${K}`,
  ctrlShift: <K extends string>(key: K): `ctrl+shift+${K}` => `ctrl+shift+${key}` as `ctrl+shift+${K}`,
};
