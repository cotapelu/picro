// SPDX-License-Identifier: Apache-2.0
/**
 * Syntax highlighting: tokenizer nhẹ cho khối code trong markdown.
 *
 * Các token type map sang token màu của theme (syntaxKeyword, syntaxString...)
 * nên test tập trung vào: đúng loại token, không mất ký tự, ngôn ngữ lạ an toàn.
 */

import { describe, it, expect } from 'vitest';
import {
  highlightSyntax,
  normalizeLanguage,
  isSupportedLanguage,
  supportedLanguages,
  themeTokenFor,
  type SyntaxTokenType,
} from './syntax-highlight.js';

/** Gộp các token liền nhau cùng loại thành { loại: giá trị } cho dễ assert. */
function typedTokens(code: string, language: string): Array<{ type: SyntaxTokenType; value: string }> {
  return highlightSyntax(code, language).tokens.map((t) => ({ type: t.type, value: t.value }));
}

/** Lấy toàn bộ text từ token (kiểm tra không mất ký tự). */
function flatText(code: string, language: string): string {
  return highlightSyntax(code, language).tokens.map((t) => t.value).join('');
}

describe('normalizeLanguage', () => {
  it('maps common aliases', () => {
    expect(normalizeLanguage('js')).toBe('javascript');
    expect(normalizeLanguage('jsx')).toBe('javascript');
    expect(normalizeLanguage('ts')).toBe('typescript');
    expect(normalizeLanguage('tsx')).toBe('typescript');
    expect(normalizeLanguage('sh')).toBe('bash');
    expect(normalizeLanguage('py')).toBe('python');
    expect(normalizeLanguage('yml')).toBe('yaml');
    expect(normalizeLanguage('cs')).toBe('csharp');
    expect(normalizeLanguage('c++')).toBe('cpp');
    expect(normalizeLanguage('golang')).toBe('go');
  });

  it('takes the first word of a fence info string', () => {
    expect(normalizeLanguage('typescript title="app.ts"')).toBe('typescript');
    expect(normalizeLanguage('python  ')).toBe('python');
  });

  it('falls back to text', () => {
    expect(normalizeLanguage(undefined)).toBe('text');
    expect(normalizeLanguage('')).toBe('text');
  });
});

describe('isSupportedLanguage / supportedLanguages', () => {
  it('accepts known languages and aliases', () => {
    expect(isSupportedLanguage('javascript')).toBe(true);
    expect(isSupportedLanguage('ts')).toBe(true);
    expect(isSupportedLanguage('python')).toBe(true);
    expect(isSupportedLanguage('brainfuck')).toBe(false);
  });

  it('lists supported languages', () => {
    const list = supportedLanguages();
    expect(list).toContain('javascript');
    expect(list).toContain('python');
    expect(list).toContain('text');
  });
});

describe('themeTokenFor', () => {
  it('maps token types to theme tokens', () => {
    expect(themeTokenFor('comment')).toBe('syntaxComment');
    expect(themeTokenFor('keyword')).toBe('syntaxKeyword');
    expect(themeTokenFor('string')).toBe('syntaxString');
    expect(themeTokenFor('number')).toBe('syntaxNumber');
    expect(themeTokenFor('function')).toBe('syntaxFunction');
    expect(themeTokenFor('type')).toBe('syntaxType');
    expect(themeTokenFor('plain')).toBe('text');
  });
});

describe('highlightSyntax - javascript/typescript', () => {
  it('classifies keywords', () => {
    const tokens = typedTokens('const x = 1', 'typescript');
    const byValue = new Map(tokens.map((t) => [t.value, t.type]));
    expect(byValue.get('const')).toBe('keyword');
    expect(byValue.get('1')).toBe('number');
    expect(byValue.get('=')).toBe('operator');
  });

  it('classifies strings including escapes and the closing quote', () => {
    const tokens = typedTokens(`const s = "he said \\"hi\\""`, 'typescript');
    const stringToken = tokens.find((t) => t.type === 'string');
    expect(stringToken?.value).toBe(`"he said \\"hi\\""`);
  });

  it('classifies function calls', () => {
    const tokens = typedTokens('doWork(1)', 'javascript');
    expect(tokens.find((t) => t.value === 'doWork')?.type).toBe('function');
    expect(tokens.find((t) => t.value === '(')?.type).toBe('punctuation');
  });

  it('classifies PascalCase identifiers as types', () => {
    const tokens = typedTokens('new Promise(x)', 'typescript');
    expect(tokens.find((t) => t.value === 'Promise')?.type).toBe('type');
    expect(tokens.find((t) => t.value === 'new')?.type).toBe('keyword');
  });

  it('classifies line comments', () => {
    const tokens = typedTokens('const a = 1 // set a', 'typescript');
    expect(tokens.find((t) => t.type === 'comment')?.value).toBe('// set a');
  });

  it('classifies block comments', () => {
    const tokens = typedTokens('/* note */ x', 'typescript');
    expect(tokens.find((t) => t.type === 'comment')?.value).toBe('/* note */');
  });

  it('classifies template literals', () => {
    const tokens = typedTokens('const p = `a ${b} c`', 'typescript');
    expect(tokens.find((t) => t.type === 'string')?.value).toBe('`a ${b} c`');
  });
});

describe('highlightSyntax - python', () => {
  it('classifies python keywords', () => {
    const tokens = typedTokens('def f(x): return x', 'python');
    expect(tokens.find((t) => t.value === 'def')?.type).toBe('keyword');
    expect(tokens.find((t) => t.value === 'return')?.type).toBe('keyword');
    // `):` là hai token punctuation liền nhau nên bị gộp thành một token.
    expect(tokens.find((t) => t.value === '):')?.type).toBe('punctuation');
  });

  it('treats # as a comment', () => {
    const tokens = typedTokens('x = 1  # comment', 'python');
    expect(tokens.find((t) => t.type === 'comment')?.value).toBe('# comment');
  });

  it('classifies None/True/False as keywords', () => {
    const tokens = typedTokens('return None', 'python');
    expect(tokens.find((t) => t.value === 'None')?.type).toBe('keyword');
  });
});

describe('highlightSyntax - bash', () => {
  it('classifies shell keywords', () => {
    const tokens = typedTokens('for f in *.txt; do echo $f; done', 'bash');
    expect(tokens.find((t) => t.value === 'for')?.type).toBe('keyword');
    expect(tokens.find((t) => t.value === 'in')?.type).toBe('keyword');
    expect(tokens.find((t) => t.value === 'do')?.type).toBe('keyword');
    expect(tokens.find((t) => t.value === 'done')?.type).toBe('keyword');
  });

  it('treats # as a comment', () => {
    const tokens = typedTokens('ls  # list', 'bash');
    expect(tokens.find((t) => t.type === 'comment')?.value).toBe('# list');
  });
});

describe('highlightSyntax - json', () => {
  it('classifies keys as variables and values by kind', () => {
    const tokens = typedTokens('"name": "picro", "port": 3000, "on": true', 'json');
    expect(tokens.find((t) => t.value === '"name"')?.type).toBe('string');
    expect(tokens.find((t) => t.value === '"picro"')?.type).toBe('string');
    expect(tokens.find((t) => t.value === '3000')?.type).toBe('number');
    expect(tokens.find((t) => t.value === 'true')?.type).toBe('keyword');
  });
});

describe('highlightSyntax - fidelity', () => {
  it('never loses characters for any supported language', () => {
    const samples: Array<[string, string]> = [
      ['const a: Map<string, number> = new Map(); // init', 'typescript'],
      ['if (x > 0 && y != null) { return f(x) }', 'javascript'],
      ['def handler(req):\n    return {"ok": True}', 'python'],
      ['git commit -m "initial"  # save', 'bash'],
      ['{ "a": [1, 2, 3], "b": null }', 'json'],
      ['fn main() { let v: Vec<u8> = vec![1u8]; println!("{}", v[0]); }', 'rust'],
      ['SELECT id, name FROM users WHERE id = 42;', 'sql'],
      ['# heading\n\nSome *text* here.', 'markdown'],
    ];
    for (const [code, lang] of samples) {
      expect(flatText(code, lang), `lost chars for ${lang}: ${code}`).toBe(code);
    }
  });

  it('returns the code unchanged for an unknown language', () => {
    const result = highlightSyntax('anything at all', 'brainfuck');
    expect(result.tokens.map((t) => t.value).join('')).toBe('anything at all');
  });

  it('handles an empty string', () => {
    expect(highlightSyntax('', 'typescript').tokens).toEqual([]);
  });

  it('handles a lone quote without hanging', () => {
    const tokens = highlightSyntax(`x = "`, 'typescript').tokens;
    expect(tokens.map((t) => t.value).join('')).toBe(`x = "`);
  });
});