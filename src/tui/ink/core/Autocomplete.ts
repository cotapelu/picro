// Autocomplete - gợi ý lệnh slash, đường dẫn file, ký tự @/#
// Bắt chước nguyên tắc pi-tui autocomplete.ts (phần dùng cho chat):
//   - CombinedAutocompleteProvider gộp lệnh slash + file path + @file
//   - Trích token trước con trỏ, lọc mờ theo tên lệnh
//   - applyCompletion ghép lại dòng và đặt con trỏ
// Port sang TSX riêng, khong copy code truc iep.

import { readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { fuzzyFilter } from "./Fuzzy.js";
import { autocompleteSeparatorRegex } from "./TextPredicates.js";
import type { AutocompleteItem, AutocompleteProvider, AutocompleteSuggestions, SlashCommand } from "./EditorComponent.js";

const PATH_DELIMITERS = new Set([" ", "\t", '"', "'", "="]);

export type { AutocompleteItem, AutocompleteProvider, AutocompleteSuggestions, SlashCommand };

/** Ghép nhãn + mô tả để lọc. */
function itemText(item: AutocompleteItem): string {
  return `${item.label} ${item.description ?? ""}`;
}

function expandHome(path: string): string {
  if (path.startsWith("~/")) {
    const expanded = join(homedir(), path.slice(2));
    return path.endsWith("/") && !expanded.endsWith("/") ? `${expanded}/` : expanded;
  }
  if (path === "~") return homedir();
  return path;
}

/** Gợi ý file trong thư mục theo tiền tố. */
function fileSuggestions(baseDir: string, prefix: string): AutocompleteItem[] {
  try {
    let searchDir: string;
    let searchPrefix: string;
    let displayPrefix = prefix;

    if (prefix === "" || prefix === "./" || prefix === "../" || prefix === "~" || prefix === "~/" || prefix === "/") {
      searchDir = prefix.startsWith("~") || prefix === "/" ? expandHome(prefix) : join(baseDir, prefix);
      searchPrefix = "";
    } else if (prefix.endsWith("/")) {
      searchDir = prefix.startsWith("~") || prefix.startsWith("/") ? expandHome(prefix) : join(baseDir, prefix);
      searchPrefix = "";
    } else {
      const dir = dirname(expandHome(prefix));
      const file = basename(expandHome(prefix));
      searchDir = dir.startsWith("/") ? dir : join(baseDir, dir);
      searchPrefix = file;
    }

    const entries = readdirSync(searchDir, { withFileTypes: true });
    const suggestions: AutocompleteItem[] = [];
    for (const entry of entries) {
      if (searchPrefix && !entry.name.toLowerCase().startsWith(searchPrefix.toLowerCase())) continue;
      let isDir = entry.isDirectory();
      if (!isDir && entry.isSymbolicLink()) {
        try {
          isDir = statSync(join(searchDir, entry.name)).isDirectory();
        } catch {
          // Symlink hỏng: coi như file.
        }
      }
      let rel: string;
      if (displayPrefix.endsWith("/")) rel = `${displayPrefix}${entry.name}`;
      else if (displayPrefix.includes("/")) {
        const d = dirname(displayPrefix);
        rel = d === "." ? entry.name : join(d, entry.name);
        if (displayPrefix.startsWith("./") && !rel.startsWith("./")) rel = `./${rel}`;
      } else rel = entry.name;
      suggestions.push({
        value: isDir ? `${rel}/` : rel,
        label: entry.name + (isDir ? "/" : ""),
      });
    }
    suggestions.sort((a, b) => {
      const aDir = a.label.endsWith("/");
      const bDir = b.label.endsWith("/");
      if (aDir !== bDir) return aDir ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
    return suggestions;
  } catch {
    return [];
  }
}

/** Tìm token kiểu đường dẫn ngay trước con trỏ. */
function extractPathPrefix(text: string): string | null {
  let lastDelimiter = -1;
  let index = 0;
  for (const ch of text) {
    index += ch.length;
    if (PATH_DELIMITERS.has(ch) || autocompleteSeparatorRegex.test(ch)) lastDelimiter = index - 1;
  }
  return stripWrappers(lastDelimiter === -1 ? text : text.slice(lastDelimiter + 1));
}

function stripWrappers(token: string): string {
  const openers = new Set(["(", "[", "{", "<", "`"]);
  let result = token;
  while (result.length > 0 && openers.has(result[0]!) && !result.includes(")" ) && !result.includes("]") && !result.includes("}") && !result.includes(">") && !result.includes("`", 1)) {
    result = result.slice(1);
  }
  return result;
}

/** Nhà cung cấp gợi ý gộp: slash command và đường dẫn. */
export class CombinedAutocompleteProvider implements AutocompleteProvider {
  private commands: SlashCommand[];
  private basePath: string;

  constructor(commands: SlashCommand[] = [], basePath: string) {
    this.commands = commands;
    this.basePath = basePath;
  }

  async getSuggestions(
    lines: string[],
    cursorLine: number,
    cursorCol: number,
    options: { signal: AbortSignal; force?: boolean },
  ): Promise<AutocompleteSuggestions | null> {
    if (options.signal.aborted) return null;
    const currentLine = lines[cursorLine] ?? "";
    const beforeCursor = currentLine.slice(0, cursorCol);
    const trimmed = beforeCursor.trimStart();

    // Lệnh slash
    if (trimmed.startsWith("/")) {
      const spaceIndex = trimmed.indexOf(" ");
      if (spaceIndex === -1) {
        const prefix = trimmed.slice(1);
        const items: AutocompleteItem[] = this.commands.map((cmd) => ({
          value: cmd.name,
          label: cmd.name,
          description: cmd.description ?? (cmd.argumentHint ?? undefined),
        }));
        const filtered = fuzzyFilter(items, prefix, itemText);
        return filtered.length > 0 ? { items: filtered, prefix: trimmed } : null;
      }
    }

    // Đường dẫn
    const pathPrefix = extractPathPrefix(beforeCursor);
    if (pathPrefix === null) return null;
    const looksPathish =
      options.force === true ||
      pathPrefix.includes("/") ||
      pathPrefix.startsWith(".") ||
      pathPrefix.startsWith("~") ||
      (pathPrefix === "" && beforeCursor.length > 0);
    if (!looksPathish) return null;

    const items = fileSuggestions(this.basePath, pathPrefix);
    return items.length > 0 ? { items, prefix: pathPrefix } : null;
  }

  applyCompletion(
    lines: string[],
    cursorLine: number,
    cursorCol: number,
    item: AutocompleteItem,
    prefix: string,
  ): { lines: string[]; cursorLine: number; cursorCol: number } {
    const currentLine = lines[cursorLine] ?? "";
    const beforePrefix = currentLine.slice(0, cursorCol - prefix.length);
    const afterCursor = currentLine.slice(cursorCol);
    // A slash command is recognised by its own prefix, not by its position: when
    // the command sits mid-line the old code set isSlash=false and inserted the
    // bare command name, silently dropping the "/" the user had typed
    // ("run /he" + help -> "run help ").
    const prefixIsSlash = prefix.trimStart().startsWith("/");
    const value = prefixIsSlash ? `/${item.value}` : item.value;
    const suffix = prefixIsSlash ? " " : item.label.endsWith("/") ? "" : " ";
    const newLine = `${beforePrefix}${value}${suffix}${afterCursor}`;
    const newLines = [...lines];
    newLines[cursorLine] = newLine;
    return {
      lines: newLines,
      cursorLine,
      cursorCol: beforePrefix.length + value.length + suffix.length,
    };
  }
}
