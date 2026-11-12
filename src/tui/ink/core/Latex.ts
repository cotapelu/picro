// Latex - render biểu thức toán học thành ký tự Unicode
// Bắt chước nguyên tắc pi-tui latex.ts (bản rút gọn, đúng phạm vi dùng):
//   - Bảng ký hiệu \command -> Unicode
//   - Chỉ số trên/dưới, phân số, căn thức, vector đơn vị
//   - Môi trường matrix/cases tạo bố cục nhiều dòng
//   - Lệnh không hỗ trợ -> trả về undefined để hiển thị markdown gốc
// Port sang TSX riêng, khong copy code truc iep.

import { visibleWidth } from "./TerminalText.js";

const SYMBOLS: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ϵ", varepsilon: "ε",
  zeta: "ζ", eta: "η", theta: "θ", vartheta: "ϑ", iota: "ι", kappa: "κ",
  varkappa: "ϰ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π", varpi: "ϖ",
  rho: "ρ", varrho: "ϱ", sigma: "σ", varsigma: "ς", tau: "τ", upsilon: "υ",
  phi: "ϕ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π",
  Sigma: "Σ", Upsilon: "Υ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  pm: "±", mp: "∓", times: "×", div: "÷", cdot: "·", ast: "∗", star: "⋆",
  circ: "∘", bullet: "•", oplus: "⊕", ominus: "⊖", otimes: "⊗", oslash: "⊘",
  odot: "⊙", dagger: "†", ddagger: "‡",
  cap: "∩", cup: "∪", bigcap: "⋂", bigcup: "⋃", bigwedge: "⋀", bigvee: "⋁",
  setminus: "∖", in: "∈", notin: "∉", ni: "∋",
  subset: "⊂", supset: "⊃", subseteq: "⊆", supseteq: "⊇",
  prec: "≺", succ: "≻", preceq: "≼", succeq: "≽",
  ll: "≪", gg: "≫", leq: "≤", geq: "≥", neq: "≠", equiv: "≡",
  approx: "≈", sim: "∼", simeq: "≃", cong: "≅", asymp: "≍", propto: "∝",
  parallel: "∥", perp: "⊥", mid: "∣", models: "⊨", vdash: "⊢",
  forall: "∀", exists: "∃", nexists: "∄", neg: "¬", land: "∧", lor: "∨",
  to: "→", rightarrow: "→", longrightarrow: "→",
  leftarrow: "←", gets: "←", leftrightarrow: "↔", mapsto: "↦",
  uparrow: "↑", downarrow: "↓",
  Rightarrow: "⇒", Leftarrow: "⇐", Leftrightarrow: "⇔",
  implies: "⇒", iff: "⇔",
  partial: "∂", nabla: "∇", infty: "∞", emptyset: "∅",
  angle: "∠", triangle: "△", square: "□", lozenge: "◊",
  checkmark: "✓", prime: "′", hbar: "ℏ", ell: "ℓ",
  ldots: "…", dots: "…", cdots: "⋯", vdots: "⋮", ddots: "⋱",
  langle: "⟨", rangle: "⟩", lbrace: "{", rbrace: "}",
  lfloor: "⌊", rfloor: "⌋", lceil: "⌈", rceil: "⌉",
  sum: "∑", prod: "∏", coprod: "∐", int: "∫", oint: "∮",
  Im: "ℑ",
  Join: "⋈",
  Longleftarrow: "⇐",
  Longleftrightarrow: "⇔",
  Longrightarrow: "⇒",
  Re: "ℜ",
  Vdash: "⊩",
  Vert: "‖",
  Vvdash: "⊪",
  aleph: "ℵ",
  amalg: "⨿",
  backslash: "\\",
  because: "∵",
  beth: "ℶ",
  bigcirc: "○",
  bigodot: "⨀",
  bigoplus: "⨁",
  bigotimes: "⨂",
  bigsqcup: "⨆",
  biguplus: "⨄",
  bot: "⊥",
  bowtie: "⋈",
  colon: ":",
  complement: "∁",
  daleth: "ℸ",
  dashv: "⊣",
  doteq: "≐",
  fullouterjoin: "⟗",
  ge: "≥",
  geqslant: "≥",
  gimel: "ℷ",
  hookleftarrow: "↩",
  hookrightarrow: "↪",
  iiint: "∭",
  iint: "∬",
  lVert: "‖",
  le: "≤",
  leadsto: "⇝",
  leftharpoondown: "↽",
  leftharpoonup: "↼",
  leftouterjoin: "⟕",
  leftrightharpoons: "⇋",
  leqslant: "≤",
  longleftarrow: "←",
  longleftrightarrow: "↔",
  longmapsto: "↦",
  ltimes: "⋉",
  lvert: "|",
  ne: "≠",
  nearrow: "↗",
  nvDash: "⊭",
  nvdash: "⊬",
  nwarrow: "↖",
  rVert: "‖",
  rightharpoondown: "⇁",
  rightharpoonup: "⇀",
  rightleftharpoons: "⇌",
  rightouterjoin: "⟖",
  rightsquigarrow: "⇝",
  rtimes: "⋊",
  rvert: "|",
  searrow: "↘",
  sqcap: "⊓",
  sqcup: "⊔",
  sqsubset: "⊏",
  sqsubseteq: "⊑",
  sqsupset: "⊐",
  sqsupseteq: "⊒",
  swarrow: "↙",
  therefore: "∴",
  top: "⊤",
  triangleleft: "◁",
  triangleright: "▷",
  twoheadleftarrow: "↞",
  twoheadrightarrow: "↠",
  uplus: "⊎",
  varnothing: "∅",
  vee: "∨",
  vert: "|",
  wedge: "∧",
  wp: "℘",
  wr: "≀",
};

const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶",
  "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", "=": "⁼",
  "(": "⁽", ")": "⁾", n: "ⁿ", i: "ⁱ",
};
const SUBSCRIPTS: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆",
  "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋", "=": "₌",
  "(": "₍", ")": "₎", a: "ₐ", e: "ₑ", i: "ᵢ", o: "ₒ", x: "ₓ",
};
const BLACKBOARD: Record<string, string> = {
  C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ",
};
const NAMED_OPERATORS = new Set([
  "arccos", "arcsin", "arctan", "arg", "cos", "cosh", "cot", "coth", "csc",
  "det", "dim", "exp", "gcd", "hom", "inf", "ker", "lg", "lim", "liminf",
  "limsup", "ln", "log", "max", "min", "sec", "sin", "sinh", "sup", "tan", "tanh",
]);
const PLAIN_WRAPPERS = new Set([
  "text", "textbf", "textit", "textrm", "textsf", "texttt", "mathrm", "mathit",
  "mathbf", "mathcal", "mathfrak", "mathsf", "mathtt", "operatorname", "mbox", "bm",
]);
const FONT_SWITCHES = new Set(["bf", "cal", "it", "rm", "sf", "sl", "tt"]);
const IGNORED = new Set(["displaystyle", "limits", "nolimits", "textstyle", "scriptstyle"]);
const SPACING = new Set([",", ":", ";", " ", "quad", "qquad", "enspace", "thinspace", "!"]);
const NEGATED: Record<string, string> = {
  "<": "≮", ">": "≯", "=": "≠", "≤": "≰", "≥": "≱", "∈": "∉", "∼": "≁", "≈": "≉", "≡": "≢",
};

function replaceChars(value: string, table: Record<string, string>): string | undefined {
  let out = "";
  for (const ch of value) {
    const mapped = table[ch];
    if (mapped === undefined) return undefined;
    out += mapped;
  }
  return out;
}

function formatScript(value: string, kind: "sub" | "sup"): string {
  const table = kind === "sub" ? SUBSCRIPTS : SUPERSCRIPTS;
  const unicode = replaceChars(value, table);
  if (unicode !== undefined) return unicode;
  const single = [...value].length === 1;
  return kind === "sub" ? `_${single ? value : `(${value})`}` : `^${single ? value : `(${value})`}`;
}

function formatFraction(num: string, den: string): string {
  const simpleNum = /^[\p{L}\p{N}.]+$/u.test(num);
  const simpleDen = /^[\p{N}.]+$/u.test(den) || [...den].length === 1;
  return `${simpleNum ? num : `(${num})`}/${simpleDen ? den : `(${den})`}`;
}

function formatRoot(value: string, symbol = "√"): string {
  return /^[\p{L}\p{N}.]+$/u.test(value) ? `${symbol}${value}` : `${symbol}(${value})`;
}

function normalizeOutput(value: string): string {
  return value
    .split("\n")
    // Chỉ gộp khoảng trắng THẬNG: PROTECTED_SPACE là ký tự PUA nên regex \s
    // không khớp, nên padding bố cục đi qua bước này mà không bị cắt.
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter((line, i, all) => line.length > 0 || (i > 0 && i < all.length - 1))
    .join("\n")
    .trim();
}

interface LayoutNode {
  type: "fraction" | "script" | "operator" | "matrix";
  numerator?: string;
  denominator?: string;
  lower?: string;
  upper?: string;
  operator?: string;
  lines?: string[];
  baseline?: number;
}

interface Layout {
  lines: string[];
  width: number;
  baseline: number;
}

/**
 * Marker đánh dấu node bố cục 2D (phân số, chỉ số trên/dưới, matrix).
 *
 * Dùng Private Use Area (U+F0000/U+F0001) như pi-mono: các ký tự này không bao giờ
 * do người dùng gõ vào và không terminal nào hiển thị chúng, nên chắc chắn không
 * va vào nội dung thật. Bản cũ dùng soft hyphen U+00AD + chữ số — U+00AD là ký tự
 * Unicode bình thường, có thể xuất hiện trong công thức thật, và khi thì parser
 * hiểu nhầm là layout node index, phá toàn bộ bố cục của công thức.
 */
const MARKER_START = "\u{f0000}";
const MARKER_END = "\u{f0001}";
/** Khoảng trắng được bảo vệ (không bị trim) trong layout matrix/cases. */
const PROTECTED_SPACE = "\u{f0002}";

function padLayoutLine(line: string, width: number, centered = false): string {
  const padding = Math.max(0, width - visibleWidth(line));
  const left = centered ? Math.floor(padding / 2) : 0;
  // Khoảng đệm dùng PROTECTED_SPACE để các bước normalize/trim ở sau không xóa
  // nó; renderLatex đổi trở lại thành space thường ở cuối.
  return `${PROTECTED_SPACE.repeat(left)}${line}${PROTECTED_SPACE.repeat(padding - left)}`;
}

function joinLayouts(layouts: readonly Layout[]): Layout {
  if (layouts.length === 0) return { lines: [""], width: 0, baseline: 0 };
  const baseline = Math.max(...layouts.map((l) => l.baseline));
  const below = Math.max(...layouts.map((l) => l.lines.length - l.baseline - 1));
  const lines: string[] = [];
  for (let row = 0; row <= baseline + below; row++) {
    let line = "";
    for (const layout of layouts) {
      const sourceRow = row - baseline + layout.baseline;
      line +=
        sourceRow >= 0 && sourceRow < layout.lines.length
          ? padLayoutLine(layout.lines[sourceRow] ?? "", layout.width)
          : PROTECTED_SPACE.repeat(layout.width);
    }
    lines.push(line.trimEnd());
  }
  return { lines, width: layouts.reduce((w, l) => w + l.width, 0), baseline };
}

function renderLayout(source: string, nodes: readonly LayoutNode[]): Layout {
  const rendered: string[] = [];
  let firstBaseline = 0;
  for (const sourceLine of source.split("\n")) {
    const layouts: Layout[] = [];
    let position = 0;
    let previous: LayoutNode | undefined;
    const markerRe = new RegExp(`${MARKER_START}(\\d+)${MARKER_END}`, "g");
    for (const match of sourceLine.matchAll(markerRe)) {
      const index = match.index ?? 0;
      const node = nodes[Number(match[1])];
      if (!node) continue;
      if (index > position) {
        const sliced = sourceLine.slice(position, index);
        const trimmed = (previous ? sliced.trimStart() : sliced).trimEnd();
        const text = trimmed ? trimmed : " ";
        layouts.push({ lines: [text], width: visibleWidth(text), baseline: 0 });
      }
      if (node.type === "fraction") {
        const num = renderLayout(node.numerator ?? "", nodes);
        const den = renderLayout(node.denominator ?? "", nodes);
        const contentWidth = Math.max(num.width, den.width, 1);
        const width = contentWidth + 2;
        layouts.push({
          lines: [
            ...num.lines.map((l) => padLayoutLine(l, width, true)),
            ` ${"─".repeat(contentWidth)} `,
            ...den.lines.map((l) => padLayoutLine(l, width, true)),
          ],
          width,
          baseline: num.lines.length,
        });
      } else if (node.type === "operator") {
        const contentWidth = Math.max(
          visibleWidth(node.operator ?? ""),
          node.lower === undefined ? 0 : visibleWidth(node.lower),
          node.upper === undefined ? 0 : visibleWidth(node.upper),
        );
        const lines: string[] = [];
        if (node.upper !== undefined) lines.push(`${padLayoutLine(node.upper, contentWidth, true)} `);
        lines.push(`${padLayoutLine(node.operator ?? "", contentWidth, true)} `);
        if (node.lower !== undefined) lines.push(`${padLayoutLine(node.lower, contentWidth, true)} `);
        layouts.push({ lines, width: contentWidth + 1, baseline: node.upper === undefined ? 0 : 1 });
      } else if (node.type === "script") {
        const upper = node.upper === undefined ? undefined : renderLayout(node.upper, nodes);
        const lower = node.lower === undefined ? undefined : renderLayout(node.lower, nodes);
        const width = Math.max(upper?.width ?? 0, lower?.width ?? 0);
        layouts.push({
          lines: [
            ...(upper?.lines.map((l) => padLayoutLine(l, width)) ?? []),
            PROTECTED_SPACE.repeat(width),
            ...(lower?.lines.map((l) => padLayoutLine(l, width)) ?? []),
          ],
          width,
          baseline: upper?.lines.length ?? 0,
        });
      } else {
        const width = Math.max(0, ...(node.lines ?? []).map((l) => visibleWidth(l)));
        layouts.push({ lines: (node.lines ?? []).map((l) => padLayoutLine(l, width)), width, baseline: node.baseline ?? 0 });
      }
      position = index + match[0].length;
      previous = node;
    }
    if (position < sourceLine.length) {
      const sliced = sourceLine.slice(position);
      const trimmed = previous ? sliced.trimStart() : sliced;
      layouts.push({ lines: [trimmed], width: visibleWidth(trimmed), baseline: 0 });
    }
    const layout = joinLayouts(layouts);
    if (rendered.length === 0) firstBaseline = layout.baseline;
    rendered.push(...layout.lines);
  }
  return {
    lines: rendered,
    width: Math.max(0, ...rendered.map((l) => visibleWidth(l))),
    baseline: firstBaseline,
  };
}

class LatexParser {
  private readonly source: string;
  private readonly nodes: LayoutNode[];
  private readonly display: boolean;
  private position = 0;
  private supported = true;

  constructor(source: string, nodes: LayoutNode[], display: boolean) {
    this.source = source;
    this.nodes = nodes;
    this.display = display;
  }

  render(): string | undefined {
    const rendered = this.parseSequence();
    if (!this.supported || this.position !== this.source.length) return undefined;
    return normalizeOutput(rendered);
  }

  private parseSequence(end?: string): string {
    let result = "";
    while (this.position < this.source.length) {
      const ch = this.source[this.position]!;
      if (end && ch === end) {
        this.position++;
        return result;
      }
      if (ch === "}") {
        this.supported = false;
        return result;
      }
      if (ch === "{") {
        this.position++;
        result += this.parseSequence("}");
        continue;
      }
      if (ch === "\\") {
        result += this.parseCommand();
        continue;
      }
      if (ch === "^" || ch === "_") {
        this.position++;
        result = result.trimEnd();
        result += this.parseScripts(ch);
        continue;
      }
      if (/\s/.test(ch)) {
        result += " ";
        this.position++;
        continue;
      }
      if (ch === "=" || ch === "<" || ch === ">") {
        result = `${result.trimEnd()} ${ch} `;
        this.position++;
        continue;
      }
      if (ch === "&" || ch === "~") {
        result += " ";
        this.position++;
        continue;
      }
      result += ch;
      this.position++;
    }
    if (end) this.supported = false;
    return result;
  }

  private parseScripts(marker: "^" | "_"): string {
    const sub = marker === "_" ? this.parseArgument() : undefined;
    const sup = marker === "^" ? this.parseArgument() : undefined;
    if (!this.display) {
      return (sub !== undefined ? formatScript(sub, "sub") : "") + (sup !== undefined ? formatScript(sup, "sup") : "");
    }
    const index =
      this.nodes.push({
        type: "script",
        lower: sub === undefined ? undefined : normalizeOutput(sub),
        upper: sup === undefined ? undefined : normalizeOutput(sup),
      }) - 1;
    return `${MARKER_START}${index}${MARKER_END}`;
  }

  private parseCommand(): string {
    this.position++;
    if (this.position >= this.source.length) {
      this.supported = false;
      return "";
    }
    let command = "";
    const first = this.source[this.position]!;
    if (first === "\n" || first === "\r") {
      this.position++;
      return " ";
    }
    if (/[A-Za-z]/.test(first)) {
      const start = this.position;
      while (this.position < this.source.length && /[A-Za-z]/.test(this.source[this.position]!)) this.position++;
      command = this.source.slice(start, this.position);
    } else {
      command = first;
      this.position++;
    }

    if (command === "\\") return "\n";
    if (SPACING.has(command)) return " ";
    if (FONT_SWITCHES.has(command) || IGNORED.has(command)) return "";
    if (command === "{" || command === "}" || command === "$" || command === "%" || command === "#" || command === "_" || command === "&") return command;
    if (command === "|") return "‖";
    if (command === "left" || command === "middle" || command === "right") {
      if (this.source[this.position] === ".") this.position++;
      return "";
    }
    if (command === "not") {
      const value = this.parseArgument().trim();
      const negated = NEGATED[value];
      if (negated !== undefined) return ` ${negated} `;
      const chars = [...value];
      if (chars.length === 0) {
        this.supported = false;
        return "";
      }
      return ` ${chars[0]}\u0338${chars.slice(1).join("")} `;
    }
    if (command === "frac" || command === "dfrac" || command === "tfrac") {
      const num = this.parseArgument();
      const den = this.parseArgument();
      if (this.display && command !== "tfrac") {
        const index =
          this.nodes.push({ type: "fraction", numerator: normalizeOutput(num), denominator: normalizeOutput(den) }) - 1;
        return `${MARKER_START}${index}${MARKER_END}`;
      }
      return formatFraction(num, den);
    }
    if (command === "sqrt") {
      const degree = this.parseOptional()?.trim();
      const value = this.parseArgument();
      if (degree === undefined || degree === "2") return formatRoot(value);
      if (degree === "3") return formatRoot(value, "∛");
      if (degree === "4") return formatRoot(value, "∜");
      return `${formatScript(degree, "sup")}${formatRoot(value)}`;
    }
    if (command === "binom" || command === "dbinom" || command === "tbinom") {
      return `(${this.parseArgument()} chọn ${this.parseArgument()})`;
    }
    if (command === "mathbb") {
      return [...this.parseArgument()].map((c) => BLACKBOARD[c] ?? c).join("");
    }
    if (command === "overset" || command === "stackrel") {
      const upper = this.parseArgument();
      const value = this.parseArgument().trim();
      return `${value}${formatScript(upper, "sup")}`;
    }
    if (command === "underset") {
      const lower = this.parseArgument();
      const value = this.parseArgument().trim();
      return `${value}${formatScript(lower, "sub")}`;
    }
    if (NAMED_OPERATORS.has(command)) return ` ${command} `;
    if (PLAIN_WRAPPERS.has(command)) {
      const value = this.parseArgument();
      return command.startsWith("text") || command === "mbox" ? value : value.trim();
    }
    if (command === "begin") return this.parseEnvironment();
    if (command === "end") {
      this.supported = false;
      return "";
    }
    const symbol = SYMBOLS[command];
    if (symbol !== undefined) return symbol;
    this.supported = false;
    return `\\${command}`;
  }

  private parseArgument(): string {
    while (this.position < this.source.length && /\s/.test(this.source[this.position]!)) this.position++;
    if (this.position >= this.source.length) {
      this.supported = false;
      return "";
    }
    if (this.source[this.position] === "{") {
      this.position++;
      return this.parseSequence("}");
    }
    if (this.source[this.position] === "\\") return this.parseCommand();
    const ch = this.source[this.position]!;
    this.position++;
    return ch;
  }

  private parseOptional(): string | undefined {
    while (this.position < this.source.length && /[ \t]/.test(this.source[this.position]!)) this.position++;
    if (this.source[this.position] !== "[") return undefined;
    const end = this.source.indexOf("]", this.position + 1);
    if (end < 0) {
      this.supported = false;
      return undefined;
    }
    const value = this.source.slice(this.position + 1, end);
    this.position = end + 1;
    return value;
  }

  private readRawGroup(): string | undefined {
    while (this.position < this.source.length && /[ \t]/.test(this.source[this.position]!)) this.position++;
    if (this.source[this.position] !== "{") {
      this.supported = false;
      return undefined;
    }
    const start = ++this.position;
    let depth = 1;
    while (this.position < this.source.length) {
      const ch = this.source[this.position]!;
      if (ch === "\\") {
        this.position += 2;
        continue;
      }
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      if (depth === 0) {
        const value = this.source.slice(start, this.position);
        this.position++;
        return value;
      }
      this.position++;
    }
    this.supported = false;
    return undefined;
  }

  private splitRows(body: string): string[] {
    return body.split(/\\\\(?:\[[^\]\n]*\])?/);
  }

  private parseEnvironment(): string {
    const name = this.readRawGroup();
    if (!name) return "";
    const endMarker = `\\end{${name}}`;
    const end = this.source.indexOf(endMarker, this.position);
    if (end < 0) {
      this.supported = false;
      return "";
    }
    const body = this.source.slice(this.position, end);
    this.position = end + endMarker.length;

    if (["matrix", "pmatrix", "bmatrix", "Bmatrix", "vmatrix", "Vmatrix", "smallmatrix", "array"].includes(name)) {
      const matrixBody = name === "array" ? body.replace(/^\s*\{[^}]*\}/, "") : body;
      return this.renderMatrix(name, matrixBody);
    }
    if (name === "cases" || name === "cases*") return this.renderCases(body);
    this.supported = false;
    return body;
  }

  private renderMatrix(name: string, body: string): string {
    const rows = this.splitRows(body)
      .map((row) => row.split("&").map((cell) => this.renderNested(cell, false).trim()))
      .filter((row) => row.some(Boolean));
    const colCount = Math.max(0, ...rows.map((r) => r.length));
    const colWidths = Array.from({ length: colCount }, (_, c) =>
      Math.max(0, ...rows.map((r) => visibleWidth(r[c] ?? ""))),
    );
    const formatted = rows.map((row) =>
      Array.from({ length: colCount }, (_, c) => {
        const cell = row[c] ?? "";
        return `${cell}${PROTECTED_SPACE.repeat(Math.max(0, (colWidths[c] ?? 0) - visibleWidth(cell)))}`;
      }).join(" │ "),
    );

    const delimiters: Record<string, [string, string, string, string, string, string]> = {
      pmatrix: ["⎛", "⎞", "⎜", "⎟", "⎝", "⎠"],
      bmatrix: ["⎡", "⎤", "⎢", "⎥", "⎣", "⎦"],
      Bmatrix: ["⎧", "⎫", "⎨", "⎬", "⎩", "⎭"],
      vmatrix: ["│", "│", "│", "│", "│", "│"],
      Vmatrix: ["║", "║", "║", "║", "║", "║"],
    };

    let lines: string[];
    if (name === "array" || name === "matrix" || name === "smallmatrix") {
      lines = formatted;
    } else {
      const d = delimiters[name];
      if (!d) {
        this.supported = false;
        return formatted.join("\n");
      }
      lines = formatted.map((row, i) => {
        const left = i === 0 ? d[0] : i === formatted.length - 1 ? d[4] : d[2];
        const right = i === 0 ? d[1] : i === formatted.length - 1 ? d[5] : d[3];
        return `${left} ${row} ${right}`;
      });
    }
    if (lines.length <= 1) return lines[0] ?? "";
    const index = this.nodes.push({ type: "matrix", lines, baseline: 0 }) - 1;
    return `${MARKER_START}${index}${MARKER_END}`;
  }

  private renderCases(body: string): string {
    const rows = this.splitRows(body)
      .map((row) => row.split("&").map((cell) => this.renderNested(cell, false).trim()))
      .filter((row) => row.some(Boolean));
    if (rows.length === 0) return "";
    const valueWidth = Math.max(0, ...rows.map((r) => visibleWidth((r[0] ?? "").replace(/,\s*$/, ""))));
    const contents = rows.map((row) => {
      const value = (row[0] ?? "").replace(/,\s*$/, "");
      const condition = row[1] ?? "";
      if (!condition) return value;
      const prefix = /^(?:if|when|for|otherwise)\b/i.test(condition) ? " " : " nếu ";
      return `${value}${PROTECTED_SPACE.repeat(Math.max(0, valueWidth - visibleWidth(value)))}${prefix}${condition}`;
    });
    if (contents.length <= 1) return `⎧ ${contents[0]}`;
    const middle = Math.floor(contents.length / 2);
    const visual: (string | undefined)[] = [...contents];
    if (contents.length % 2 === 0) visual.splice(middle, 0, undefined);
    const lines = visual.map((content, i) => {
      const delimiter = i === 0 ? "⎧" : i === visual.length - 1 ? "⎩" : "⎨";
      return content === undefined ? delimiter : `${delimiter} ${content}`;
    });
    const index = this.nodes.push({ type: "matrix", lines, baseline: middle }) - 1;
    return `${MARKER_START}${index}${MARKER_END}`;
  }

  private renderNested(source: string, stackFractions = true): string {
    const rendered = new LatexParser(source, this.nodes, this.display && stackFractions).render();
    if (rendered === undefined) {
      this.supported = false;
      return source;
    }
    return rendered;
  }
}

export interface RenderLatexOptions {
  /** Xếp phân số và giới hạn theo chiều dọc cho công thức display. */
  display?: boolean;
}

/** Render biểu thức LaTeX thành Unicode cho terminal; undefined nếu không hỗ trợ. */
export function renderLatex(source: string, options: RenderLatexOptions = {}): string | undefined {
  const nodes: LayoutNode[] = [];
  const rendered = new LatexParser(source, nodes, options.display === true).render();
  if (rendered === undefined) return undefined;
  if (nodes.length === 0) return rendered;
  const lines = renderLayout(rendered, nodes).lines;
  const indentation = Math.min(
    ...lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length),
  );
  return lines
    .map((l) => l.slice(indentation).trimEnd())
    .join("\n")
    .trimEnd()
    // PROTECTED_SPACE chỉ là ký tự giữ chỗ trong lúc dựng bố cục.
    .replaceAll(PROTECTED_SPACE, " ");
}
