// SPDX-License-Identifier: Apache-2.0
/**
 * LaTeX -> Unicode rendering.
 *
 * The symbol table was missing 82 entries that upstream carries (le, ge, ne,
 * wedge, vee, top, bot, hook arrows, big operators, ...). Every one of them made
 * renderLatex() return undefined, so the caller fell back to the raw markdown
 * block - "\le"/"\ge" in particular are ubiquitous in real-world formulas.
 */

import { describe, it, expect } from 'vitest';
import { renderLatex } from './Latex.js';

describe('renderLatex - basics', () => {
  it('returns an empty string for empty input', () => {
    expect(renderLatex('')).toBe('');
  });

  it('passes plain text through', () => {
    expect(renderLatex('2 + 2 = 4')).toBe('2 + 2 = 4');
  });

  it('maps greek letters', () => {
    expect(renderLatex('\\alpha')).toBe('α');
    expect(renderLatex('\\Omega')).toBe('Ω');
  });

  it('collapses whitespace runs', () => {
    expect(renderLatex('a    b')).toBe('a b');
  });

  it('spaces out relations', () => {
    expect(renderLatex('a=b')).toBe('a = b');
  });
});

describe('renderLatex - scripts', () => {
  it('renders simple sub/superscripts as Unicode', () => {
    expect(renderLatex('x^2')).toBe('x²');
    expect(renderLatex('x_i')).toBe('xᵢ');
  });

  it('parenthesises multi-character scripts it cannot map', () => {
    // The Unicode script tables only cover digits and a few letters; anything
    // else falls back to a readable ^(...) / _(...) form.
    expect(renderLatex('x^{ab}')).toBe('x^(ab)');
    expect(renderLatex('x_{ab}')).toBe('x_(ab)');
    expect(renderLatex('x^{12}')).toBe('x¹²');
    expect(renderLatex('x_{12}')).toBe('x₁₂');
  });

  it('handles both scripts on one base', () => {
    const out = renderLatex('x_i^2');
    expect(out).toContain('ᵢ');
    expect(out).toContain('²');
  });
});

describe('renderLatex - the previously missing aliases', () => {
  // Each of these used to make renderLatex() return undefined.
  const cases: Array<[string, string]> = [
    ['a \\le b', '≤'],
    ['a \\ge b', '≥'],
    ['a \\ne b', '≠'],
    ['a \\leqslant b', '≤'],
    ['a \\geqslant b', '≥'],
    ['a \\wedge b', '∧'],
    ['a \\vee b', '∨'],
    ['\\top', '⊤'],
    ['\\bot', '⊥'],
    ['a \\leadsto b', '⇝'],
    ['\\aleph', 'ℵ'],
    ['\\wp', '℘'],
    ['a \\sqcup b', '⊔'],
    ['a \\uplus b', '⊎'],
    ['\\varnothing', '∅'],
    ['\\hookrightarrow', '↪'],
    ['\\Longrightarrow', '⇒'],
    ['\\Longleftarrow', '⇐'],
    ['a \\ltimes b', '⋉'],
    ['a \\rtimes b', '⋊'],
    ['\\nwarrow', '↖'],
    ['\\searrow', '↘'],
    ['\\therefore', '∴'],
    ['\\because', '∵'],
    ['\\complement', '∁'],
    ['\\Im', 'ℑ'],
    ['\\Re', 'ℜ'],
    ['\\Vert', '‖'],
    ['\\lVert', '‖'],
    ['\\doteq', '≐'],
    ['\\bowtie', '⋈'],
    ['\\amalg', '⨿'],
    ['\\gimel', 'ℷ'],
  ];

  for (const [source, expected] of cases) {
    it(`renders ${source}`, () => {
      const out = renderLatex(source);
      expect(out, source).not.toBeUndefined();
      expect(out).toContain(expected);
    });
  }
});

describe('renderLatex - structures', () => {
  it('renders a fraction inline', () => {
    expect(renderLatex('\\frac{1}{2}')).toBe('1/2');
  });

  it('stacks a fraction in display mode', () => {
    const out = renderLatex('\\frac{a+b}{c}', { display: true })!;
    expect(out.split('\n')).toHaveLength(3);
    expect(out).toContain('───');
  });

  it('renders roots', () => {
    expect(renderLatex('\\sqrt{2}')).toBe('√2');
    expect(renderLatex('\\sqrt[3]{8}')).toBe('∛8');
    expect(renderLatex('\\sqrt[4]{16}')).toBe('∜16');
  });

  it('renders a matrix with delimiters', () => {
    const out = renderLatex('\\begin{pmatrix}1 & 2 \\\\ 3 & 4\\end{pmatrix}')!;
    expect(out).toContain('⎛');
    expect(out).toContain('⎝');
    expect(out).toContain('3');
  });

  it('renders cases', () => {
    const out = renderLatex('\\begin{cases}1 & x > 0 \\\\ 0 & x \\le 0\\end{cases}')!;
    expect(out).toContain('⎧');
    expect(out).toContain('⎩');
    expect(out).toContain('0');
  });

  it('renders blackboard bold', () => {
    expect(renderLatex('\\mathbb{R}')).toBe('ℝ');
  });

  it('renders named operators', () => {
    expect(renderLatex('\\sin x')).toBe('sin x');
  });

  it('renders negation', () => {
    expect(renderLatex('\\not\\in')).toBe('∉');
  });
});

describe('renderLatex - unsupported input returns undefined', () => {
  it('rejects an unknown command', () => {
    expect(renderLatex('\\totallyunknown')).toBeUndefined();
  });

  it('rejects an unterminated group', () => {
    expect(renderLatex('x^{')).toBeUndefined();
  });

  it('rejects a stray closing brace', () => {
    expect(renderLatex('a } b')).toBeUndefined();
  });

  it('rejects an unknown environment', () => {
    expect(renderLatex('\\begin{fluzzle}x\\end{fluzzle}')).toBeUndefined();
  });

  it('rejects a trailing backslash', () => {
    expect(renderLatex('x\\')).toBeUndefined();
  });
});
