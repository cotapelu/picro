// Diff - render diff có màu và tô sáng thay đổi trong dòng
// Bắt chước nguyên tắc pi-mono components/diff.ts:
//   - Dòng ngữ cảnh: mờ; dòng xóa: đỏ; dòng thêm: xanh
//   - Khi một dòng xóa đổi thành một dòng thêm, làm diff theo từ và tô
//     ngược phần thay đổi
//   - Tách phần thụt lề chung để chèn lùi không nuốt thụt lề
//   - Tab -> 3 khoảng trắng
// Port sang TSX riêng, khon copy code truc iep.

import { getTheme } from "../theme/index.js";

interface ParsedLine {
  prefix: string;
  lineNum: string;
  content: string;
}

/** Tách dòng diff dạng "+123 nội dung" / "-123 nội dung" / " 123 nội dung". */
function parseDiffLine(line: string): ParsedLine | null {
  const m = /^([+-\s])(\s*\d*)\s(.*)$/.exec(line);
  if (!m) return null;
  return { prefix: m[1]!, lineNum: m[2]!, content: m[3]! };
}

function replaceTabs(text: string): string {
  return text.replace(/\t/g, "   ");
}

/** Diff theo từ đơn giản (không cần thư viện ngoài). */
function wordDiff(oldText: string, newText: string): Array<{ value: string; removed?: boolean; added?: boolean }> {
  const oldWords = oldText.split(/(\s+)/).filter(Boolean);
  const newWords = newText.split(/(\s+)/).filter(Boolean);
  // Ma trận LCS cắt ngắn: chỉ cần chạy trên từ, đủ nhanh cho dòng diff.
  const n = oldWords.length;
  const m = newWords.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = oldWords[i] === newWords[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const parts: Array<{ value: string; removed?: boolean; added?: boolean }> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldWords[i] === newWords[j]) {
      parts.push({ value: oldWords[i]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      parts.push({ value: oldWords[i]!, removed: true });
      i++;
    } else {
      parts.push({ value: newWords[j]!, added: true });
      j++;
    }
  }
  while (i < n) parts.push({ value: oldWords[i]!, removed: true });
  while (j < m) parts.push({ value: newWords[j]!, added: true });
  return parts;
}

interface IntraLineResult {
  removedLine: string;
  addedLine: string;
}

function renderIntraLine(oldContent: string, newContent: string): IntraLineResult {
  let commonIndent = 0;
  while (
    commonIndent < oldContent.length &&
    commonIndent < newContent.length &&
    oldContent[commonIndent] === newContent[commonIndent] &&
    /\s/.test(oldContent[commonIndent]!)
  ) {
    commonIndent++;
  }
  const indent = oldContent.slice(0, commonIndent);
  const parts = wordDiff(oldContent.slice(commonIndent), newContent.slice(commonIndent));

  const t = getTheme();
  let removedLine = indent;
  let addedLine = indent;
  let firstRemoved = true;
  let firstAdded = true;

  for (const part of parts) {
    if (part.removed) {
      let value = part.value;
      if (firstRemoved) {
        const leading = /^(\s*)/.exec(value)?.[1] ?? "";
        value = value.slice(leading.length);
        removedLine += leading;
        firstRemoved = false;
      }
      if (value) removedLine += t.style(value, { inverse: true });
    } else if (part.added) {
      let value = part.value;
      if (firstAdded) {
        const leading = /^(\s*)/.exec(value)?.[1] ?? "";
        value = value.slice(leading.length);
        addedLine += leading;
        firstAdded = false;
      }
      if (value) addedLine += t.style(value, { inverse: true });
    } else {
      removedLine += part.value;
      addedLine += part.value;
    }
  }
  return { removedLine, addedLine };
}

export interface RenderDiffOptions {
  /** Đường dẫn file (giữ để tương thích API). */
  filePath?: string;
}

/** Render chuỗi diff thành văn bản có màu. */
export function renderDiff(diffText: string, _options: RenderDiffOptions = {}): string {
  const t = getTheme();
  const lines = diffText.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const parsed = parseDiffLine(lines[i]!);
    if (!parsed) {
      result.push(t.fg("toolDiffContext", lines[i]!));
      i++;
      continue;
    }

    if (parsed.prefix === "-") {
      const removed: ParsedLine[] = [];
      while (i < lines.length) {
        const p = parseDiffLine(lines[i]!);
        if (!p || p.prefix !== "-") break;
        removed.push(p);
        i++;
      }
      const added: ParsedLine[] = [];
      while (i < lines.length) {
        const p = parseDiffLine(lines[i]!);
        if (!p || p.prefix !== "+") break;
        added.push(p);
        i++;
      }

      if (removed.length === 1 && added.length === 1) {
        const r = removed[0]!;
        const a = added[0]!;
        const intra = renderIntraLine(replaceTabs(r.content), replaceTabs(a.content));
        result.push(t.fg("toolDiffRemoved", `-${r.lineNum} ${intra.removedLine}`));
        result.push(t.fg("toolDiffAdded", `+${a.lineNum} ${intra.addedLine}`));
      } else {
        for (const r of removed) result.push(t.fg("toolDiffRemoved", `-${r.lineNum} ${replaceTabs(r.content)}`));
        for (const a of added) result.push(t.fg("toolDiffAdded", `+${a.lineNum} ${replaceTabs(a.content)}`));
      }
    } else if (parsed.prefix === "+") {
      result.push(t.fg("toolDiffAdded", `+${parsed.lineNum} ${replaceTabs(parsed.content)}`));
      i++;
    } else {
      result.push(t.fg("toolDiffContext", ` ${parsed.lineNum} ${replaceTabs(parsed.content)}`));
      i++;
    }
  }
  return result.join("\n");
}
