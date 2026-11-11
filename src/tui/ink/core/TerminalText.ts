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

  if (cp >= EAST_ASIAN_WIDE_START) {
    // Vùng CJK rộng: Hiragana/Katakana, Han, Hangul...
    if (
      (cp >= 0x1100 && cp <= 0x115f) ||
      (cp >= 0x2e80 && cp <= 0xa4cf && cp !== 0x303f) ||
      (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe30 && cp <= 0xfe6f) ||
      (cp >= 0xff00 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6) ||
      (cp >= 0x1f300 && cp <= 0x1f64f) ||
      (cp >= 0x1f900 && cp <= 0x1f9ff) ||
      (cp >= 0x20000 && cp <= 0x3fffd)
    ) {
      return 2;
    }
  }
  return 1;
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
    width += graphemeWidth(segment);
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

/** Ngắt cứng một từ dài hơn chiều rộng. */
function breakLongWord(word: string, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  let currentWidth = 0;
  let i = 0;
  while (i < word.length) {
    const len = ansiCodeLength(word, i);
    if (len > 0) {
      current += word.slice(i, i + len);
      i += len;
      continue;
    }
    let end = i + 1;
    while (end < word.length && ansiCodeLength(word, end) === 0) end++;
    for (const { segment } of graphemeSegmenter.segment(word.slice(i, end))) {
      const w = visibleWidth(segment);
      if (currentWidth + w > width) {
        lines.push(current);
        current = "";
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

/** Ngắt một dòng theo từ, gi nguyên trạng thái màu. */
function wrapSingleLine(line: string, width: number): string[] {
  if (!line) return [""];
  if (visibleWidth(line) <= width) return [line];

  const wrapped: string[] = [];
  const tokens = splitIntoTokens(line);
  let current = "";
  let currentWidth = 0;

  for (const token of tokens) {
    const tokenWidth = visibleWidth(token);
    const whitespace = isWhitespaceToken(token);

    if (tokenWidth > width && !whitespace) {
      if (current) {
        wrapped.push(current.trimEnd());
        current = "";
        currentWidth = 0;
      }
      const broken = breakLongWord(token, width);
      for (let i = 0; i < broken.length - 1; i++) wrapped.push(broken[i]!);
      current = broken[broken.length - 1]!;
      currentWidth = visibleWidth(current);
      continue;
    }

    if (currentWidth + tokenWidth > width && currentWidth > 0) {
      wrapped.push(current.trimEnd());
      if (whitespace) {
        current = "";
        currentWidth = 0;
        continue;
      }
      current = token;
      currentWidth = tokenWidth;
    } else {
      current += token;
      currentWidth += tokenWidth;
    }
  }
  if (current) wrapped.push(current.trimEnd());
  return wrapped.length > 0 ? wrapped : [""];
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
  const final = result + ellipsis;
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
