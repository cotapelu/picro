// SyntaxHighlighter - tô sáng mã nguồn cho khối code trong markdown
// Bắt chước nguyên tắc pi-mono utils/syntax-highlight.ts (loadAllHighlightLanguages):
//   - Không thêm dependency nặng (highlight.js) — tự tokenize các ngôn ngữ phổ biến
//   - Mỗi token gán một "loại" (comment/keyword/string/...); lớp theme map loại -> màu
//   - ANSI escape được giữ nguyên khi wrap/cắt nhờ core/TerminalText
//   - Ngôn ngữ không nhận diện: trả về mã thô (không lỗi)
// Port sang TSX riêng, khong copy code truc iep.

/** Các loại token syntax (khớp token màu của theme). */
export type SyntaxTokenType =
  | "comment"
  | "keyword"
  | "string"
  | "number"
  | "function"
  | "variable"
  | "type"
  | "operator"
  | "punctuation"
  | "plain";

export interface SyntaxToken {
  type: SyntaxTokenType;
  value: string;
}

export interface SyntaxHighlightResult {
  tokens: SyntaxToken[];
  language: string;
}

/** Từ khóa chung cho ngôn ngữ họ C / JS / TS. */
const C_KEYWORDS = new Set([
  "abstract", "as", "async", "await", "base", "bool", "boolean", "break", "byte", "case",
  "catch", "char", "checked", "class", "const", "continue", "decimal", "default", "defer",
  "do", "double", "else", "enum", "event", "explicit", "export", "extends", "extern",
  "false", "finally", "fixed", "float", "for", "foreach", "function", "get", "goto",
  "if", "implements", "implicit", "import", "in", "instanceof", "int", "interface",
  "internal", "is", "let", "lock", "long", "namespace", "new", "null", "object", "operator",
  "out", "override", "params", "private", "protected", "public", "readonly", "ref",
  "return", "sbyte", "sealed", "set", "short", "sizeof", "stackalloc", "static", "string",
  "struct", "super", "switch", "this", "throw", "true", "try", "typeof", "uint", "ulong",
  "unchecked", "unsafe", "ushort", "using", "var", "virtual", "void", "volatile", "when",
  "where", "while", "with", "yield", "def", "fn", "impl", "mod", "pub", "mut", "self",
  "Self", "trait", "type", "dyn", "unsafe", "move", "match", "loop", "elif", "except",
  "raise", "pass", "lambda", "global", "nonlocal", "del", "assert", "from", "package",
]);

/** Từ khóa riêng Python. */
const PY_KEYWORDS = new Set([
  "and", "or", "not", "if", "elif", "else", "for", "while", "break", "continue", "def",
  "class", "return", "yield", "import", "from", "as", "try", "except", "finally", "raise",
  "with", "pass", "lambda", "global", "nonlocal", "del", "assert", "in", "is", "None",
  "True", "False", "async", "await",
]);

/** Từ khóa shell/bash. */
const SH_KEYWORDS = new Set([
  "if", "then", "else", "elif", "fi", "for", "while", "until", "do", "done", "case",
  "esac", "function", "in", "select", "return", "break", "continue", "local", "declare",
  "export", "readonly", "source", "alias", "set", "unset", "shift", "exit", "trap",
]);

/** Kiểu dữ liệu phổ biến để tô khác biệt. */
const COMMON_TYPES = new Set([
  "string", "number", "boolean", "object", "unknown", "any", "never", "void", "null",
  "undefined", "Array", "Promise", "Map", "Set", "Date", "RegExp", "Error", "Record",
  "Partial", "Required", "Readonly", "Pick", "Omit", "int", "float", "double", "char",
  "bool", "byte", "long", "short", "usize", "isize", "u8", "u16", "u32", "u64", "i8",
  "i16", "i32", "i64", "f32", "f64", "str", "String", "Vec", "HashMap", "Option", "Result",
]);

/** Chuẩn hóa tên ngôn ngữ từ fence info string (vd "typescript", "python", "bash"). */
export function normalizeLanguage(info: string | undefined): string {
  if (!info) return "text";
  const first = info.trim().split(/\s+/)[0]?.toLowerCase() ?? "text";
  const aliases: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    ts: "typescript",
    tsx: "typescript",
    mts: "typescript",
    cts: "typescript",
    sh: "bash",
    shell: "bash",
    zsh: "bash",
    console: "bash",
    py: "python",
    python3: "python",
    rb: "ruby",
    yml: "yaml",
    md: "markdown",
    "c++": "cpp",
    "c#": "csharp",
    cs: "csharp",
    kt: "kotlin",
    golang: "go",
  };
  return aliases[first] ?? first;
}

/** Có hỗ trợ tô sáng cho ngôn ngữ này không. */
export function isSupportedLanguage(language: string): boolean {
  return SUPPORTED.has(language) || SUPPORTED.has(normalizeLanguage(language));
}

const SUPPORTED = new Set([
  "javascript", "typescript", "python", "bash", "json", "html", "css", "go", "rust",
  "java", "c", "cpp", "csharp", "ruby", "sql", "yaml", "markdown", "text",
]);

/**
 * Tokenize một dòng mã. Đây là tokenizer NHẸ (không phải parser đầy đủ): đủ để tô
 * màu comment / string / number / keyword trong phạm vi một dòng. Chuỗi nhiều
 * dòng (template literal, docstring) không được theo dõi — chấp nhận được vì
 * markdown code block thường là ví dụ ngắn.
 */
export function highlightSyntax(code: string, language: string): SyntaxHighlightResult {
  const lang = normalizeLanguage(language);
  const keywords = lang === "python" ? PY_KEYWORDS : lang === "bash" ? SH_KEYWORDS : C_KEYWORDS;

  const tokens: SyntaxToken[] = [];
  let i = 0;
  const n = code.length;

  const push = (type: SyntaxTokenType, value: string) => {
    if (!value) return;
    const last = tokens[tokens.length - 1];
    if (last && last.type === type) last.value += value;
    else tokens.push({ type, value });
  };

  const isIdentStart = (c: string) => /[A-Za-z_$]/.test(c);
  const isIdentPart = (c: string) => /[A-Za-z0-9_$]/.test(c);

  while (i < n) {
    const c = code[i]!;

    // Comment dòng: // (C họ), # (python/bash/yaml), -- (sql)
    const commentStart =
      (c === "/" && code[i + 1] === "/") ||
      (c === "#" && (lang === "python" || lang === "bash" || lang === "yaml" || lang === "ruby")) ||
      (c === "-" && code[i + 1] === "-" && lang === "sql");
    if (commentStart) {
      const rest = code.slice(i);
      tokens.push({ type: "comment", value: rest });
      break;
    }

    // Comment khối: /* ... */ (một dòng)
    if (c === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      push("comment", code.slice(i, stop));
      i = stop;
      continue;
    }

    // Chuỗi: ', ", `
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      let j = i + 1;
      while (j < n) {
        if (code[j] === "\\") { j += 2; continue; }
        if (code[j] === quote) { j++; break; }
        j++;
      }
      push("string", code.slice(i, j));
      i = j;
      continue;
    }

    // Số
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(code[i + 1] ?? ""))) {
      let j = i;
      while (j < n && /[0-9a-fA-FxXoObB._]/.test(code[j]!)) j++;
      push("number", code.slice(i, j));
      i = j;
      continue;
    }

    // Định danh / từ khóa
    if (isIdentStart(c)) {
      let j = i;
      while (j < n && isIdentPart(code[j]!)) j++;
      const word = code.slice(i, j);
      const nextCh = code[j];

      if (keywords.has(word)) {
        push("keyword", word);
      } else if (COMMON_TYPES.has(word) || /^[A-Z][A-Za-z0-9]*$/.test(word)) {
        // PascalCase hoặc kiểu phổ biến -> coi là type
        push("type", word);
      } else if (nextCh === "(") {
        push("function", word);
      } else if (nextCh === ":" && lang !== "bash") {
        // key: value (json/yaml) -> biến
        push("variable", word);
      } else {
        push("variable", word);
      }
      i = j;
      continue;
    }

    // Toán tử (`:` để riêng làm dấu câu vì dùng cho nhãn/khối lệnh)
    if (/[+\-*/%=<>!&|^~?]/.test(c)) {
      push("operator", c);
      i++;
      continue;
    }

    // Dấu câu
    if (/[(){}[\].,;:]/.test(c)) {
      push("punctuation", c);
      i++;
      continue;
    }

    // Khoảng trắng và các ký tự khác
    push("plain", c);
    i++;
  }

  return { tokens, language: lang };
}

/** Bản đồ loại token -> token màu của theme. */
const TOKEN_TO_THEME: Record<SyntaxTokenType, string> = {
  comment: "syntaxComment",
  keyword: "syntaxKeyword",
  string: "syntaxString",
  number: "syntaxNumber",
  function: "syntaxFunction",
  variable: "syntaxVariable",
  type: "syntaxType",
  operator: "syntaxOperator",
  punctuation: "syntaxPunctuation",
  plain: "text",
};

/** Lấy token màu của theme ứng với loại syntax. */
export function themeTokenFor(tokenType: SyntaxTokenType): string {
  return TOKEN_TO_THEME[tokenType] ?? "text";
}

/** Ngôn ngữ nào được hỗ trợ (dùng cho test/UI). */
export function supportedLanguages(): string[] {
  return [...SUPPORTED].sort();
}

/** Số lượng ngôn ngữ đã đăng ký (dùng cho cache invalidation). */
export function getHighlightLanguageCount(): number {
  return SUPPORTED.size;
}