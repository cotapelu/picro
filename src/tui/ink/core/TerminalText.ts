// TerminalText - tiện ích đo và xử lý chuỗi terminal
// Bắt chước nguyên tắc pi-tui utils.ts:
//   - visibleWidth: đo chiều rộng hiển thị, bỏ qua escape, tính cả emoji/CJK
//   - wrapTextWithAnsi: ngắt theo từ, gi nguyên mã màu xuyên dòng
//   - truncateToWidth: cắt có dấu ba chấm, gi nguyên mã màu
//   - sliceByColumn: lất đoạn theo cột hiển thị
//   - stripTerminalSequences: bỏ toàn bộ escape
// Port sang TSX riêng, khon copy code truc tiep.

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

const ZERO_WIDTH_REGEX = /^(?:\p{Default_Ignorable_Code_Point}|\p{Control}|\p{Mark}|\p{Surrogate})+$/u;
const LEADING_NON_PRINTING = /^(?:\p{Default_Ignorable_Code_Point}|\p{Control}|\p{Format}|\p{Mark}|\p{Surrogate})+$/u;
const TAB_WIDTH = 3;
const EAST_ASIAN_WIDE_START = 0x1100;

const widthCache = new Map<string, number>();
const WIDTH_CACHE_SIZE = 512;

/**
 * Chiều rộng hiển thị của chuỗi (không tính mã màu).
 *
 * Fast-path: chuỗi chỉ gồm printable ASCII, tab và escape được đo bằng một vòng
 * quét đơn, không Segmentation và không regex. Các dòng đã tô màu đi qua nhánh
 * này, nên sau khi đổi chủ đề không phải segment lại từng dòng (vấn đề hiệu năng
 * thật khi footer/markdown render 30 fps).
 */
const ZWJ = "\u200d";

function asciiVisibleWidth(str: string): number {
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0x20 && code <= 0x7e) width++;
    else if (code === 0x09) width += TAB_WIDTH;
    else if (code === 0x1b) {
      const len = ansiCodeLength(str, i);
      if (len === 0) return -1;
      i += len - 1;
    } else return -1;
  }
  return width;
}

/**
 * Dải mã của chữ số Trung Hoa và bảng chữ Nhật, theo phạm vi rộng chuẩn.
 *
 * Pi-mono dùng thư viện get-east-asian-width để lấy đúng thuộc tính East_Asian_Width
 * của từng mã; bản này tự tra bảng vì picro không có dependency đó. Bảng phủ:
 *   - Mọi vùng CJK (Hiragana, Katakana, Hangul, Han mở rộng, Ký tự tương thích)
 *   - Halfwidth/Fullwidth Forms và vùng đặc biệt của CJK
 *   - Kana, Đơn vị CJK, Dấu câu CJK nửa rộng
 * Đây là bảng phủ đủ dùng cho thiết bị đầu cuối: terminal thực tế chỉ phân biệt
 * 1 vs 2 cột cho các dải này.
 */
function isWideEastAsian(cp: number): boolean {
  if (cp < 0x1100) return false;
  const ranges: Array<[number, number]> = [
    [0x1100, 0x115f],   // Hangul Jamo
    [0x2329, 0x232a],   // Áo/xuống dẫn
    [0x2e80, 0x303e],   // Dấu câu + Radical CJK
    [0x3041, 0x33ff],   // Hiragana, Katakana, Bopomofo, Ký tự tương thích CJK
    [0x3400, 0x4dbf],   // Han mở rộng A
    [0x4e00, 0x9fff],   // Han thống nhất
    [0xa000, 0xa4cf],   // Yi
    [0xac00, 0xd7a3],   // Hangul âm tiết
    [0xf900, 0xfaff],   // Ký tự tương thích Han
    [0xfe10, 0xfe19],   // Dạng dọc
    [0xfe30, 0xfe6f],   // Dạng nhỏ gọn + Ký hiệu CJK
    [0xff00, 0xff60],   // Fullwidth + Halfwidth Forms
    [0xffe0, 0xffe6],   // Fullwidth dấu hiệu tiền tệ
    [0x1b000, 0x1b2ff], // Kana mở rộng
    [0x1f200, 0x1f251], // Vòng kỷ niên
    [0x1f300, 0x1f64f], // Emoji & Biểu tượng cảm xúc
    [0x1f900, 0x1f9ff], // Emoji bổ sung
    [0x20000, 0x3fffd], // Han mở rộng B+
  ];
  for (const [lo, hi] of ranges) {
    if (cp >= lo && cp <= hi) return true;
  }
  return false;
}

/**
 * Các mark "dãn" mà terminal vẫn cấp ô cho ngay cả khi gắn vào ký tự mẹ:
 * Indic (Devanagari, Tamil...), halfwidth/fullwidth, nguyên âm dài Thái/Lào.
 * Không tính các mark này là width 0 sẽ làm layout lệch cột với văn bản không dùng
 * ký hiệu Latin.
 */
const TERMINAL_SPACING_MARK = /^[\u0900-\u0903\u093a-\u093b\u0941-\u0948\u094d\u0951-\u0957\u0962-\u0963\u0981\u09bc\u09c1-\u09c4\u09cd\u09e2-\u09e3\u0a01-\u0a02\u0a3c\u0a41-\u0a42\u0a47-\u0a48\u0a4b-\u0a4d\u0a51\u0a70-\u0a71\u0a75\u0a81-\u0a82\u0abc\u0ac1-\u0ac5\u0ac7-\u0ac8\u0acd\u0ae2-\u0ae3\u0b01\u0b3c\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b62-\u0b63\u0b82\u0bc0\u0bcd\u0c00\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55-\u0c56\u0c62-\u0c63\u0c81\u0cbc\u0cbf\u0cc6\u0ccc-\u0ccd\u0ce2-\u0ce3\u0d01\u0d41-\u0d44\u0d4d\u0d62-\u0d63\u0d82\u0dca\u0dd2-\u0dd4\u0dd6\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb-\u0ebc\u0ec8-\u0ecd\u0f18-\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039-\u103a\u103d-\u103e\u1058-\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085-\u1086\u108d\u109d\u135d-\u135f\u1712-\u1714\u1732-\u1734\u1752-\u1753\u1772-\u1773\u17b4-\u17b5\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u1922\u1927-\u1928\u1932\u1939-\u193b\u1a17-\u1a18\u1a1b\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a74\u1a79-\u1a7b\u1a7d\u1ab0-\u1abd\u1abe\u1b34\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1ba9\u1bab-\u1bad\u1be6\u1be8-\u1be9\u1bed\u1bef-\u1bf1\u1c2c-\u1c33\u1c36-\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce6\u1cec-\u1ced\u1cf4\u1cf7-\u1cf8\u1cf9\u1d33-\u1d3a\u1d3c-\u1d3d\u1d3f-\u1d40\u1d49-\u1d4a\u1d50-\u1d50\u1da0-\u1da6\u1da8-\u1db5\u1db7-\u1db8\u1dba-\u1dbb\u1dc0-\u1dc9\u1df5\u1dfc-\u1dfd\u1dfe\u1e00-\u1e01\u1e08-\u1e0f\u1e14-\u1e1a\u1e2c-\u1e2f\u1e31\u1e4e-\u1e4f\u1e5a-\u1e5b\u1e6c-\u1e6f\u1e80-\u1e85\u1e8e\u1e94\u1e97-\u1e9a\u1ea3\u1eab-\u1eac\u1ebd-\u1ebe\u1ec4\u1ed0\u1ed9-\u1eda\u1ee4\u1eeb\u1ef4-\u1ef5\u1f00-\u1f07\u1f10-\u1f12\u1f20-\u1f25\u1f30-\u1f33\u1f3e-\u1f3f\u1f40-\u1f44\u1f50-\u1f57\u1f5e\u1f60\u1f70-\u1f71\u1f80-\u1f82\u1f90-\u1f91\u1fa0-\u1fa1\u1fb0-\u1fb1\u1fb8-\u1fb9\u1fc0-\u1fc1\u1fd0-\u1fd1\u1fe0-\u1fe1\u2000-\u200a\u2065\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2134\u2135-\u2138\u2139\u213c-\u213f\u2145-\u2149\u214e\u214f\u2183-\u2184\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d70\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005\u3006\u3031-\u3035\u303b-\u303c\u3040-\u3040\u3097\u3099-\u309d\u30a0\u30a1-\u30a2\u30fb-\u30fc\u3190-\u3191\u3196-\u319f\u31c0-\u31e3\u3200-\u321e\u322a-\u3247\u3250-\u3250\u3260-\u327e\u3280-\u32fe\u3300-\u33ff\u4dc0-\u4dff\ua490-\ua4c6\ua828-\ua82b\uaa43-\uaa6a\uaab0-\uaaed\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33-\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f\u0001-\u0008\u000b\u000e-\u001f\u007f\u0080-\u009f\u00ad\u200b-\u200f\u2028-\u202e\u2060-\u2064\u2066-\u206f\ufeff\ufff9-\ufffb]$/;

/** Kiểm tra nhanh một đoạn có thể là emoji RGI. */
function couldBeEmoji(segment: string): boolean {
  const cp = segment.codePointAt(0)!;
  return (
    (cp >= 0x1f000 && cp <= 0x1fbff) ||
    (cp >= 0x2300 && cp <= 0x23ff) ||
    (cp >= 0x2b50 && cp <= 0x2b55) ||
    segment.includes("\uFE0F") ||
    segment.length > 2
  );
}

/** Chiều rộng của một grapheme theo luật terminal. */
function graphemeWidth(segment: string): number {
  if (segment.length === 1) {
    const code = segment.charCodeAt(0);
    if (code >= 0x20 && code <= 0x7e) return 1;
    if (code === 0x09) return TAB_WIDTH;
  }
  if (ZERO_WIDTH_REGEX.test(segment)) return 0;
  if (couldBeEmoji(segment) && /^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]$/u.test(segment)) return 2;
  const base = segment.replace(LEADING_NON_PRINTING, "");
  const cp = base.codePointAt(0);
  if (cp === undefined) return 0;

  // Regional indicator (cờ) thường chiếm 2 cột.
  if (cp >= 0x1f1e6 && cp <= 0x1f1ff) return 2;

  // Regional indicator (cờ) thường chiếm 2 cột.
  if (cp >= 0x1f1e6 && cp <= 0x1f1ff) return 2;

  if (isWideEastAsian(cp)) return 2;
  if (cp >= 0x1f000 && cp <= 0x1fbff) return 2;
  if (cp >= 0x2600 && cp <= 0x27bf) return 2;
  return 1;
}

/**
 * Chiều rộng của một cluster nhiều mã: cộng dồn các mã còn lại sau ký tự mẹ.
 *
 * Intl.Segmenter có thể gộp nhiều mark/mã thành một cluster; terminal chỉ cấp ô
 * cho một số mark nhất định (xem TERMINAL_SPACING_MARK). Bản cũ trả width của
 * riêng ký tự mẹ nên bỏ qua toàn bộ các ô đó — văn bản Devanagari/Tamil/Thái bị
 * lệch cột. Pi-mono xử lý bằng cách cộng eastAsianWidth(char) cho từng ký tự phụ
 * hợp lệ; bản này dùng TERMINAL_SPACING_MARK cho cùng mục đích.
 */
function clusterWidth(segment: string): number {
  const base = segment.replace(LEADING_NON_PRINTING, "");
  if (base.length === 0) return 0;
  const baseCp = base.codePointAt(0)!;
  let width = graphemeWidth(base);
  const rest = base.slice(String.fromCodePoint(baseCp).length);
  for (const char of rest) {
    if (TERMINAL_SPACING_MARK.test(char)) width += 1;
  }
  return width;
}

/** Độ dài mã escape tại vị trí pos, hoặc 0 nếu không phải escape. */
function ansiCodeLength(str: string, pos: number): number {
  if (pos >= str.length || str.charCodeAt(pos) !== 0x1b) return 0;
  const next = str[pos + 1];

  if (next === "[") {
    for (let j = pos + 2; j < str.length; j++) {
      const c = str.charCodeAt(j);
      if (c === 0x6d || c === 0x47 || c === 0x4b || c === 0x48 || c === 0x4a) return j + 1 - pos;
    }
    return 0;
  }
  if (next === "]" || next === "_") {
    for (let j = pos + 2; j < str.length; j++) {
      const c = str.charCodeAt(j);
      if (c === 0x07) return j + 1 - pos;
      if (c === 0x1b && str[j + 1] === "\\") return j + 2 - pos;
    }
    return 0;
  }
  return 0;
}

/** Chiều rộng hiển thị của chuỗi (không tính mã màu). */
export function visibleWidth(str: string): number {
  if (str.length === 0) return 0;

  const fast = asciiVisibleWidth(str);
  if (fast !== -1) return fast;

  const cached = widthCache.get(str);
  if (cached !== undefined) return cached;

  let clean = str;
  if (str.includes("\t")) clean = clean.replace(/\t/g, "   ");

  const escapeIndex = clean.indexOf("\x1b");
  if (escapeIndex !== -1) {
    let stripped = "";
    let copyFrom = 0;
    let idx = escapeIndex;
    while (idx !== -1) {
      const len = ansiCodeLength(clean, idx);
      if (len > 0) {
        stripped += clean.slice(copyFrom, idx);
        idx += len;
        copyFrom = idx;
      } else {
        idx++;
      }
      idx = clean.indexOf("\x1b", idx);
    }
    clean = stripped + clean.slice(copyFrom);
  }

  let width = 0;
  for (const { segment } of graphemeSegmenter.segment(clean)) {
    width += clusterWidth(segment);
  }

  if (widthCache.size >= WIDTH_CACHE_SIZE) {
    const first = widthCache.keys().next().value;
    if (first !== undefined) widthCache.delete(first);
  }
  widthCache.set(str, width);
  return width;
}

/** Bỏ toàn bộ escape/OSC/APC, giữ lại chữ nhìn thấy được. */
export function stripTerminalSequences(str: string): string {
  if (!str.includes("\x1b")) return str;
  let result = "";
  let i = 0;
  while (i < str.length) {
    const len = ansiCodeLength(str, i);
    if (len > 0) {
      i += len;
      continue;
    }
    result += str[i]!;
    i++;
  }
  return result;
}

/**
 * Theo dõi trạng thái SGR/hyperlink đang active của một chuỗi đã tô màu.
 *
 * Khi ngắt dòng, trạng thái màu phải được MỞ LẠI ở đầu dòng sau và ĐÓNG ở cuối
 * dòng trước. Bản cũ chỉ giữ "pendingAnsi" trong token, nên đoạn văn bản nhiều
 * dòng mất hoàn toàn màu ở dòng thứ 2 trở đi —ví dụ khối thinking in nghiêng chỉ
 * nghiêng đúng dòng đầu tiên. Tracker tách biệt từng thuộc tính (bold/underline/
 * hyperlink...) để đóng đúng cái cần đóng, không reset sạch cả khối.
 */
class AnsiCodeTracker {
  private bold = false;
  private dim = false;
  private italic = false;
  private underline = false;
  private inverse = false;
  private strikethrough = false;
  private fg = "";
  private bg = "";
  /** Hyperlink OSC 8 đang mở (params, url, terminator) hoặc null. */
  private link: { params: string; url: string; terminator: "\x07" | "\x1b\\" } | null = null;

  /** Đọc một escape sequence và cập nhật trạng thái. */
  process(code: string): void {
    // OSC 8: mở (có url) hoặc đóng (url rỗng).
    if (code.startsWith("\x1b]8;")) {
      const terminator: "\x07" | "\x1b\\" = code.endsWith("\x07") ? "\x07" : "\x1b\\";
      const body = code.slice(4, terminator === "\x07" ? -1 : -2);
      const sep = body.indexOf(";");
      if (sep === -1) return;
      const url = body.slice(sep + 1);
      this.link = url ? { params: body.slice(0, sep), url, terminator } : null;
      return;
    }
    if (!code.endsWith("m")) return;
    const match = /\x1b\[([\d;]*)m/.exec(code);
    if (!match) return;
    const params = match[1]!;
    if (params === "" || params === "0") {
      this.reset();
      return;
    }
    const parts = params.split(";");
    let i = 0;
    while (i < parts.length) {
      const code = Number.parseInt(parts[i]!, 10);
      if (code === 38 || code === 48) {
        if (parts[i + 1] === "5" && parts[i + 2] !== undefined) {
          const value = `${parts[i]};${parts[i + 1]};${parts[i + 2]}`;
          if (code === 38) this.fg = value;
          else this.bg = value;
          i += 3;
          continue;
        }
        if (parts[i + 1] === "2" && parts[i + 4] !== undefined) {
          const value = `${parts[i]};${parts[i + 1]};${parts[i + 2]};${parts[i + 3]};${parts[i + 4]}`;
          if (code === 38) this.fg = value;
          else this.bg = value;
          i += 5;
          continue;
        }
      }
      switch (code) {
        case 1: this.bold = true; break;
        case 2: this.dim = true; break;
        case 3: this.italic = true; break;
        case 4: this.underline = true; break;
        case 7: this.inverse = true; break;
        case 9: this.strikethrough = true; break;
        case 21: case 22: this.bold = false; this.dim = false; break;
        case 23: this.italic = false; break;
        case 24: this.underline = false; break;
        case 27: this.inverse = false; break;
        case 29: this.strikethrough = false; break;
        case 39: this.fg = ""; break;
        case 49: this.bg = ""; break;
        default:
          if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) this.fg = String(code);
          else if ((code >= 40 && code <= 47) || (code >= 100 && code <= 107)) this.bg = String(code);
          break;
      }
      i++;
    }
  }

  private reset(): void {
    this.bold = false;
    this.dim = false;
    this.italic = false;
    this.underline = false;
    this.inverse = false;
    this.strikethrough = false;
    this.fg = "";
    this.bg = "";
    // SGR reset không ảnh hưởng hyperlink OSC 8.
  }

  /** Escape cần ghi ở đầu dòng tiếp theo để khôi phục trạng thái. */
  activeCodes(): string {
    const codes: string[] = [];
    if (this.bold) codes.push("1");
    if (this.dim) codes.push("2");
    if (this.italic) codes.push("3");
    if (this.underline) codes.push("4");
    if (this.inverse) codes.push("7");
    if (this.strikethrough) codes.push("9");
    if (this.fg) codes.push(this.fg);
    if (this.bg) codes.push(this.bg);
    let out = codes.length > 0 ? `\x1b[${codes.join(";")}m` : "";
    if (this.link) out += formatOsc8(this.link);
    return out;
  }

  /** Escape cần ghi ở CUỐI dòng để không loang sang padding. */
  lineEndReset(): string {
    let out = "";
    if (this.underline) out += "\x1b[24m";
    if (this.strikethrough) out += "\x1b[29m";
    if (this.link) out += formatOsc8Close(this.link.terminator);
    return out;
  }
}

interface Osc8Link {
  params: string;
  url: string;
  terminator: "\x07" | "\x1b\\";
}

function formatOsc8(link: Osc8Link): string {
  return `\x1b]8;${link.params};${link.url}${link.terminator}`;
}

function formatOsc8Close(terminator: "\x07" | "\x1b\\"): string {
  return `\x1b]8;;${terminator}`;
}

/** Quét toàn bộ escape trong `text` và cho tracker xử lý. */
function trackText(text: string, tracker: AnsiCodeTracker): void {
  let i = text.indexOf("\x1b");
  while (i !== -1) {
    const len = ansiCodeLength(text, i);
    if (len > 0) {
      tracker.process(text.slice(i, i + len));
      i += len;
    } else {
      i++;
    }
    i = text.indexOf("\x1b", i);
  }
}

/** Escape đóng hyperlink OSC 8 còn mở ở cuối `text` (nếu có). */
function getActiveOsc8Close(text: string): string {
  const tracker = new AnsiCodeTracker();
  trackText(text, tracker);
  // Chỉ cần biết có link mở không; dùng lại lineEndReset.
  return tracker.lineEndReset().includes("\x1b]8;") ? "\x1b]8;;\x1b\\" : "";
}

/** Tách chuỗi thành các token, giữ mã màu đi kèm. */
function splitIntoTokens(text: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let pendingAnsi = "";
  let currentKind: "space" | "word" | null = null;

  const flush = () => {
    if (!current) return;
    tokens.push(current);
    current = "";
    currentKind = null;
  };

  let i = 0;
  while (i < text.length) {
    const len = ansiCodeLength(text, i);
    if (len > 0) {
      pendingAnsi += text.slice(i, i + len);
      i += len;
      continue;
    }
    let end = text.indexOf("\x1b", i + 1);
    while (end !== -1 && ansiCodeLength(text, end) === 0) end = text.indexOf("\x1b", end + 1);
    if (end === -1) end = text.length;

    const chunk = text.slice(i, end);
    let asciiOnly = true;
    for (let k = 0; k < chunk.length; k++) {
      const code = chunk.charCodeAt(k);
      if (code < 0x20 || code > 0x7e) { asciiOnly = false; break; }
    }

    const segments: string[] = [];
    if (asciiOnly) {
      for (const ch of chunk) segments.push(ch);
    } else {
      for (const { segment } of graphemeSegmenter.segment(chunk)) segments.push(segment);
    }

    for (const segment of segments) {
      const isSpace = segment === " ";
      const kind: "space" | "word" = isSpace ? "space" : "word";
      if (current && currentKind !== kind) flush();
      if (pendingAnsi) {
        current += pendingAnsi;
        pendingAnsi = "";
      }
      currentKind = kind;
      current += segment;
    }
    i = end;
  }
  if (pendingAnsi) current += pendingAnsi;
  if (current) tokens.push(current);
  return tokens;
}

/** Ngắt cứng một từ dài hơn chiều rộng, giữ trạng thái màu qua các dòng. */
function breakLongWord(word: string, width: number, tracker: AnsiCodeTracker): string[] {
  const lines: string[] = [];
  let current = tracker.activeCodes();
  let currentWidth = 0;
  let i = 0;
  while (i < word.length) {
    const len = ansiCodeLength(word, i);
    if (len > 0) {
      tracker.process(word.slice(i, i + len));
      current += word.slice(i, i + len);
      i += len;
      continue;
    }
    let end = i + 1;
    while (end < word.length && ansiCodeLength(word, end) === 0) end++;
    for (const { segment } of graphemeSegmenter.segment(word.slice(i, end))) {
      const w = visibleWidth(segment);
      if (currentWidth + w > width) {
        let out = current;
        const endReset = tracker.lineEndReset();
        if (endReset) out += endReset;
        lines.push(out);
        current = tracker.activeCodes();
        currentWidth = 0;
      }
      current += segment;
      currentWidth += w;
    }
    i = end;
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function isWhitespaceToken(token: string): boolean {
  let i = 0;
  while (i < token.length) {
    const code = token.charCodeAt(i);
    if (code === 0x1b) {
      const len = ansiCodeLength(token, i);
      if (len === 0) return false;
      i += len;
      continue;
    }
    if (code === 0x20 || (code >= 0x09 && code <= 0x0d)) {
      i++;
      continue;
    }
    return false;
  }
  return true;
}

/** Ngắt một dòng theo từ, gi nguyên trạng thái màu xuyên dòng. */
function wrapSingleLine(line: string, width: number): string[] {
  if (!line) return [""];
  if (visibleWidth(line) <= width) return [line];

  const tracker = new AnsiCodeTracker();
  const tokens = splitIntoTokens(line);
  const wrapped: string[] = [];
  let current = "";
  let currentWidth = 0;

  const pushLine = (): void => {
    let out = current.trimEnd();
    const endReset = tracker.lineEndReset();
    if (endReset) out += endReset;
    wrapped.push(out);
    // Dòng sau mở lại đúng trạng thái màu đang active trước khi ngắt.
    current = tracker.activeCodes();
    currentWidth = 0;
  };

  for (const token of tokens) {
    const tokenWidth = visibleWidth(token);
    const whitespace = isWhitespaceToken(token);

    if (tokenWidth > width && !whitespace) {
      if (current) pushLine();
      const broken = breakLongWord(token, width, tracker);
      for (let i = 0; i < broken.length - 1; i++) wrapped.push(broken[i]!);
      current += broken[broken.length - 1]!;
      currentWidth = visibleWidth(current);
      trackText(token, tracker);
      continue;
    }

    if (currentWidth + tokenWidth > width && currentWidth > 0) {
      // Khoảng trắng bị bỏ có thể mang escape đóng style (ví dụ reset in đậm):
      // giữ lại trên dòng vừa đóng để style kết thúc đúng chỗ, không loang.
      pushLine();
      if (whitespace) {
        trackText(token, tracker);
        continue;
      }
      current += token;
      currentWidth = tokenWidth;
    } else if (whitespace && currentWidth + tokenWidth > width) {
      // Khoảng trắng rộng hơn cả dòng trống: trimEnd cuối cùng sẽ bỏ, nhưng escape
      // đi sau nó sẽ chặn trim và làm dòng vượt width. Chỉ giữ escape.
      current += stripToEscapes(token);
    } else {
      current += token;
      currentWidth += tokenWidth;
    }
    trackText(token, tracker);
  }
  if (current) wrapped.push(current);
  return wrapped.length > 0 ? wrapped.map((l) => l.trimEnd()) : [""];
}

/** Giữ lại chỉ các escape sequence, bỏ toàn bộ ký tự hiển thị. */
function stripToEscapes(text: string): string {
  let out = "";
  let i = text.indexOf("\x1b");
  while (i !== -1) {
    const len = ansiCodeLength(text, i);
    if (len > 0) {
      out += text.slice(i, i + len);
      i += len;
    } else {
      i++;
    }
    i = text.indexOf("\x1b", i);
  }
  return out;
}

/** Ngắt văn bản nhiều dòng, gi nguyên mã màu qua các dòng. */
export function wrapTextWithAnsi(text: string, width: number): string[] {
  if (!text) return [""];
  const inputLines = text.split(/\r\n|\r|\n/);
  const result: string[] = [];
  for (const line of inputLines) {
    result.push(...wrapSingleLine(line, width));
  }
  return result.length > 0 ? result : [""];
}

/** Cắt Chuỗi theo số cột hiển thị, thêm dấu ba chấm khi tràn. */
export function truncateToWidth(text: string, maxWidth: number, ellipsis = "...", pad = false): string {
  if (maxWidth <= 0) return "";
  if (text.length === 0) return pad ? " ".repeat(maxWidth) : "";

  const ellipsisWidth = visibleWidth(ellipsis);
  let asciiOnly = true;
  for (let k = 0; k < text.length; k++) {
    const code = text.charCodeAt(k);
    if (code < 0x20 || code > 0x7e) { asciiOnly = false; break; }
  }
  const hasAnsi = text.includes("\x1b");
  const hasTabs = text.includes("\t");

  if (asciiOnly) {
    if (text.length <= maxWidth) return pad ? text + " ".repeat(maxWidth - text.length) : text;
    const target = maxWidth - ellipsisWidth;
    if (ellipsisWidth >= maxWidth) return pad ? " ".repeat(maxWidth) : "";
    return text.slice(0, target) + ellipsis;
  }

  const targetWidth = maxWidth - ellipsisWidth;
  if (targetWidth <= 0) return pad ? " ".repeat(maxWidth) : ellipsis.slice(0, maxWidth);

  let result = "";
  let pendingAnsi = "";
  let keptWidth = 0;
  let visibleSoFar = 0;
  let keepPrefix = true;
  let overflowed = false;

  let i = 0;
  while (i < text.length) {
    const len = ansiCodeLength(text, i);
    if (len > 0) {
      pendingAnsi += text.slice(i, i + len);
      i += len;
      continue;
    }
    if (text[i] === "\t") {
      if (keepPrefix && keptWidth + TAB_WIDTH <= targetWidth) {
        if (pendingAnsi) { result += pendingAnsi; pendingAnsi = ""; }
        result += "\t";
        keptWidth += TAB_WIDTH;
      } else {
        keepPrefix = false;
        pendingAnsi = "";
      }
      visibleSoFar += TAB_WIDTH;
      if (visibleSoFar > maxWidth) { overflowed = true; break; }
      i++;
      continue;
    }
    let end = i;
    while (end < text.length && text[end] !== "\t") {
      if (ansiCodeLength(text, end) > 0) break;
      end++;
    }
    for (const { segment } of graphemeSegmenter.segment(text.slice(i, end))) {
      const w = visibleWidth(segment);
      if (keepPrefix && keptWidth + w <= targetWidth) {
        if (pendingAnsi) { result += pendingAnsi; pendingAnsi = ""; }
        result += segment;
        keptWidth += w;
      } else {
        keepPrefix = false;
        pendingAnsi = "";
      }
      visibleSoFar += w;
      if (visibleSoFar > maxWidth) { overflowed = true; break; }
    }
    if (overflowed) break;
    i = end;
  }

  if (!overflowed && i >= text.length) {
    return pad ? result + " ".repeat(Math.max(0, maxWidth - keptWidth)) : result;
  }
  // Đóng hyperlink OSC 8 còn mở TRƯỚC khi thêm ellipsis: nếu không, link vẫn mở
  // và phần padding phía sau bị coi là một phần của liên kết.
  const linkClose = getActiveOsc8Close(result);
  const final = result + linkClose + ellipsis;
  return pad ? final + " ".repeat(Math.max(0, maxWidth - visibleWidth(final))) : final;
}

/** Lất đoạn văn bản trong khoảng cột [startCol, startCol+length). */
export function sliceByColumn(line: string, startCol: number, length: number, strict = false): string {
  if (length <= 0) return "";
  const endCol = startCol + length;
  let result = "";
  let resultWidth = 0;
  let currentCol = 0;
  let pendingAnsi = "";
  let i = 0;

  while (i < line.length) {
    const len = ansiCodeLength(line, i);
    if (len > 0) {
      const inRange = currentCol >= startCol && currentCol < endCol;
      const carried = currentCol < startCol && !line.slice(i, i + len).startsWith("\x1b_");
      if (inRange) {
        result += pendingAnsi + line.slice(i, i + len);
        pendingAnsi = "";
      } else if (carried) {
        pendingAnsi += line.slice(i, i + len);
      }
      i += len;
      continue;
    }
    let textEnd = i;
    while (textEnd < line.length && ansiCodeLength(line, textEnd) === 0) textEnd++;

    for (const { segment } of graphemeSegmenter.segment(line.slice(i, textEnd))) {
      const w = visibleWidth(segment);
      const inRange = currentCol >= startCol && currentCol < endCol;
      const fits = !strict || currentCol + w <= endCol;
      if (inRange && fits) {
        if (pendingAnsi) {
          result += pendingAnsi;
          pendingAnsi = "";
        }
        result += segment;
        resultWidth += w;
      }
      currentCol += w;
      if (currentCol >= endCol) break;
    }
    i = textEnd;
    if (currentCol >= endCol) break;
  }
  return result;
}
