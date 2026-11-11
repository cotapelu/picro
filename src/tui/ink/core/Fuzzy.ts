// Fuzzy - khớp và lọc mờ
// Bắt chước nguyên tắc pi-tui fuzzy.ts:
//   - Mọi ký tự truy vấn phải xuất hiện theo thứ tự (không cần liền nhau)
//   - Thưởng khớp liền nhau, thưởng khớp ở đầu từ, phạt khoảng cách xa
//   - Hỗ trợ đổi chỗ chữ-số ("abc123" vs "123abc")
//   - fuzzyFilter: lọc và sắp xếp theo điểm, token cách nhau bởi khoảng trắng hoặc "/"
// Port sang TSX riêng, khong copy code truc iep.

export interface FuzzyMatch {
  matches: boolean;
  score: number;
}

function scorePositions(textLower: string, positions: readonly number[]): number {
  let score = 0;
  let lastIndex = -1;
  let consecutive = 0;

  for (const i of positions) {
    if (lastIndex === i - 1) {
      consecutive++;
      score -= consecutive * 5;
    } else {
      consecutive = 0;
      if (lastIndex >= 0) score += (i - lastIndex - 1) * 2;
    }
    if (i === 0 || /[\s\-_./:]/.test(textLower[i - 1]!)) score -= 10;
    score += i * 0.1;
    lastIndex = i;
  }
  return score;
}

function matchQuery(query: string, textLower: string): FuzzyMatch {
  if (query.length === 0) return { matches: true, score: 0 };
  if (query.length > textLower.length) return { matches: false, score: 0 };

  const positions: number[] = [];
  let last = -1;
  for (let i = 0; i < query.length; i++) {
    const idx = textLower.indexOf(query[i]!, last + 1);
    if (idx === -1) return { matches: false, score: 0 };
    positions.push(idx);
    last = idx;
  }

  let score = scorePositions(textLower, positions);

  // Bản căn chỉnh tham lam có thể rải truy vấn khắp nơi; thử mọi vị trí liên tiếp.
  for (let start = textLower.indexOf(query); start !== -1; start = textLower.indexOf(query, start + 1)) {
    for (let k = 0; k < positions.length; k++) positions[k] = start + k;
    score = Math.min(score, scorePositions(textLower, positions));
  }
  if (query === textLower) score -= 100;
  return { matches: true, score };
}

/** Khớp mờ hai chiều: chữ-số hoặc số-chữ. */
export function fuzzyMatch(query: string, text: string): FuzzyMatch {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const primary = matchQuery(q, t);
  if (primary.matches) return primary;

  const alphaNum = /^(?<letters>[a-z]+)(?<digits>[0-9]+)$/.exec(q);
  const numAlpha = /^(?<digits>[0-9]+)(?<letters>[a-z]+)$/.exec(q);
  const swapped = alphaNum
    ? `${alphaNum.groups?.digits ?? ""}${alphaNum.groups?.letters ?? ""}`
    : numAlpha
      ? `${numAlpha.groups?.letters ?? ""}${numAlpha.groups?.digits ?? ""}`
      : "";
  if (!swapped) return primary;

  const swappedMatch = matchQuery(swapped, t);
  if (!swappedMatch.matches) return primary;
  return { matches: true, score: swappedMatch.score + 5 };
}

/** Lọc và sắp xếp mục theo điểm khớp (tốt nhất trước). */
export function fuzzyFilter<T>(items: T[], query: string, getText: (item: T) => string): T[] {
  if (!query.trim()) return items;
  const tokens = query.trim().split(/[\s/]+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return items;

  const results: { item: T; totalScore: number }[] = [];
  for (const item of items) {
    const text = getText(item);
    let total = 0;
    let allMatch = true;
    for (const token of tokens) {
      const match = fuzzyMatch(token, text);
      if (match.matches) total += match.score;
      else {
        allMatch = false;
        break;
      }
    }
    if (allMatch) results.push({ item, totalScore: total });
  }
  results.sort((a, b) => a.totalScore - b.totalScore);
  return results.map((r) => r.item);
}
