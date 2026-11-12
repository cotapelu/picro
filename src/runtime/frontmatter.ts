// SPDX-License-Identifier: Apache-2.0
/**
 * Shared YAML frontmatter parsing for SKILL.md and prompt templates.
 *
 * Semantics follow pi-mono's utils/frontmatter.ts, without taking a YAML
 * dependency: the closing "---" fence is located with indexOf so it may sit at
 * EOF with no trailing newline, a BOM and CRLF/CR line endings are normalised
 * away, and a value may span several indented lines.
 *
 * The per-caller copies this replaces all used
 * /^---\n([\s\S]*?)\n---\n([\s\S]*)$/ plus manual "key: value" splitting, which
 * lost the whole frontmatter for files written on Windows, files starting with a
 * BOM, and files whose closing fence ended the file - and collapsed a
 * multi-line value to its block-scalar marker.
 */

/** Drop a leading UTF-8 BOM so the opening fence is recognised. */
export function stripBom(content: string): string {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

/** CRLF/CR (Windows editors) must not hide the "---" fences. */
export function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/** Coerce a YAML scalar to the type callers expect (booleans, numbers, text). */
export function parseScalar(raw: string): string | number | boolean {
  const value = raw.trim();
  if (value === "" || value === "~" || value === "null") return "";
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d*\.\d+$/.test(value)) return Number(value);
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Parse frontmatter delimited by "---" fences.
 * @returns the parsed key/value pairs and the body with the fences removed.
 */
export function parseFrontmatter<T extends Record<string, unknown> = Record<string, unknown>>(
  content: string,
): { frontmatter: T; body: string } {
  const normalized = normalizeNewlines(stripBom(content));

  if (!normalized.startsWith("---")) {
    return { frontmatter: {} as T, body: normalized };
  }

  const endIndex = normalized.indexOf("\n---", 3);
  if (endIndex === -1) {
    return { frontmatter: {} as T, body: normalized };
  }

  const yamlBlock = normalized.slice(4, endIndex);
  const body = normalized.slice(endIndex + 4).trim();
  const frontmatter: Record<string, string | number | boolean> = {};

  let currentKey: string | null = null;
  for (const line of yamlBlock.split("\n")) {
    if (line.trim() === "") continue;

    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    // Continuation of a multi-line scalar: deeper indent, and not a new key.
    if (indent > 0 && currentKey !== null && !/^[-\w"']+:/.test(trimmed)) {
      const previous = String(frontmatter[currentKey] ?? "");
      frontmatter[currentKey] = previous === "" ? trimmed : `${previous}\n${trimmed}`;
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      currentKey = null;
      continue;
    }

    const key = trimmed.slice(0, colonIndex).trim();
    const rawValue = trimmed.slice(colonIndex + 1).trim();
    // Block scalar markers ("|", "|-", ">", ">-") introduce indented lines.
    if (rawValue === "|" || rawValue === "|-" || rawValue === ">" || rawValue === ">-") {
      frontmatter[key] = "";
      currentKey = key;
      continue;
    }
    frontmatter[key] = parseScalar(rawValue);
    currentKey = key;
  }

  return { frontmatter: frontmatter as T, body };
}

/** Frontmatter removed, body only. */
export function stripFrontmatter(content: string): string {
  return parseFrontmatter(content).body;
}
