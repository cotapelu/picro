// TextPredicates - vị từ phân loại ký tự cho xử lý từ
// Bắt chước nguyên tắc pi-tui utils.ts: isWhitespaceChar, isPunctuationChar,
// cjkBreakRegex, autocompleteSeparatorRegex, autocompleteBoundaryRegex.
// Port sang TSX riêng, khon copy code truc iep.

export const PUNCTUATION_REGEX = /[(){}[\]<>.,;:'"!?+\-=*/\\|&%^$#@~`]/;

export function isWhitespaceChar(char: string): boolean {
  return /\s/.test(char);
}

export function isPunctuationChar(char: string): boolean {
  return PUNCTUATION_REGEX.test(char);
}

export const cjkBreakRegex =
  /[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}\p{Script_Extensions=Hangul}\p{Script_Extensions=Bopomofo}]/u;

export const cjkPunctuationRegex = new RegExp(
  `(?:(?=\\p{Punctuation})${cjkBreakRegex.source}|[，．：；！？（）［］｛｝“”‘’…—])`,
  "u",
);

export const autocompleteSeparatorRegex = new RegExp(`(?:\\s|${cjkPunctuationRegex.source})`, "u");

export const autocompleteBoundaryRegex = new RegExp(`(?:^|${autocompleteSeparatorRegex.source})`, "u");
