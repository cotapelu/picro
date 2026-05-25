// SPDX-License-Identifier: Apache-2.0
/**
 * Prompt Templates - Load and expand prompt templates from markdown files
 * 
 * Học từ legacy mà KHÔNG copy code:
 * - Template argument substitution ($1, $2, $@, $ARGUMENTS)
 * - Frontmatter parsing
 * - Directory scanning
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { homedir } from "node:os";

import { createSyntheticSourceInfo, type SourceInfo } from "./source-info.js";

// ============================================================================
// Constants
// ============================================================================

const CONFIG_DIR_NAME = ".pi";

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a prompt template loaded from a markdown file
 */
export interface PromptTemplate {
  /** Template name (filename without .md) */
  name: string;
  /** Description from frontmatter or first line */
  description: string;
  /** Argument hint for CLI */
  argumentHint?: string;
  /** Template content */
  content: string;
  /** Source info */
  sourceInfo: SourceInfo;
  /** Absolute path to the template file */
  filePath: string;
}

/**
 * Options for loading prompt templates
 */
export interface LoadPromptTemplatesOptions {
  /** Working directory for project-local templates */
  cwd: string;
  /** Agent config directory for global templates */
  agentDir: string;
  /** Explicit prompt template paths (files or directories) */
  promptPaths: string[];
  /** Include default prompt directories */
  includeDefaults: boolean;
}

// ============================================================================
// Frontmatter Parsing
// ============================================================================

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter<T>(content: string): { frontmatter: T; content: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {} as T, content };
  }

  const frontmatterBlock = match[1];
  const body = match[2];
  const frontmatter: Record<string, string> = {};

  for (const line of frontmatterBlock.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    frontmatter[key] = value;
  }

  return { frontmatter: frontmatter as T, content: body };
}

// ============================================================================
// Argument Parsing
// ============================================================================

/**
 * Parse command arguments respecting quoted strings (bash-style)
 * Returns array of arguments
 */
export function parseCommandArgs(argsString: string): string[] {
  const args: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i];

    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === " " || char === "\t") {
      if (current) {
        args.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    args.push(current);
  }

  return args;
}

// ============================================================================
// Argument Substitution
// ============================================================================

/**
 * Substitute argument placeholders in template content
 * Supports:
 * - $1, $2, ... for positional args
 * - $@ and $ARGUMENTS for all args
 * - ${@:N} for args from Nth onwards (bash-style slicing)
 * - ${@:N:L} for L args starting from Nth
 */
export function substituteArgs(content: string, args: string[]): string {
  let result = content;

  // Replace $1, $2, etc. with positional args FIRST (before wildcards)
  result = result.replace(/\$(\d+)/g, (_, num) => {
    const index = parseInt(num, 10) - 1;
    return args[index] ?? "";
  });

  // Replace ${@:start} or ${@:start:length} with sliced args (bash-style)
  result = result.replace(/\$\{@:(\d+)(?::(\d+))?\}/g, (_, startStr, lengthStr) => {
    let start = parseInt(startStr, 10) - 1;
    if (start < 0) start = 0;

    if (lengthStr) {
      const length = parseInt(lengthStr, 10);
      return args.slice(start, start + length).join(" ");
    }
    return args.slice(start).join(" ");
  });

  const allArgs = args.join(" ");

  // Replace $ARGUMENTS with all args joined
  result = result.replace(/\$ARGUMENTS/g, allArgs);

  // Replace $@ with all args joined
  result = result.replace(/\$@/g, allArgs);

  return result;
}

// ============================================================================
// Template Loading
// ============================================================================

/**
 * Load a single template from file
 */
function loadTemplateFromFile(
  filePath: string,
  getSourceInfo: (filePath: string) => SourceInfo
): PromptTemplate | null {
  try {
    const rawContent = readFileSync(filePath, "utf-8");
    const { frontmatter, content: body } = parseFrontmatter<
      Record<string, string>
    >(rawContent);

    const name = basename(filePath).replace(/\.md$/, "");

    // Get description from frontmatter or first non-empty line
    let description = frontmatter.description || "";
    if (!description) {
      const firstLine = body.split("\n").find((line) => line.trim());
      if (firstLine) {
        description = firstLine.slice(0, 60);
        if (firstLine.length > 60) description += "...";
      }
    }

    return {
      name,
      description,
      ...(frontmatter["argument-hint"] && {
        argumentHint: frontmatter["argument-hint"],
      }),
      content: body,
      sourceInfo: getSourceInfo(filePath),
      filePath,
    };
  } catch {
    return null;
  }
}

/**
 * Scan a directory for .md files (non-recursive) and load them as prompt templates
 */
function loadTemplatesFromDir(
  dir: string,
  getSourceInfo: (filePath: string) => SourceInfo
): PromptTemplate[] {
  const templates: PromptTemplate[] = [];

  if (!existsSync(dir)) {
    return templates;
  }

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // For symlinks, check if they point to a file
      let isFile = entry.isFile();
      if (entry.isSymbolicLink()) {
        try {
          const stats = statSync(fullPath);
          isFile = stats.isFile();
        } catch {
          // Broken symlink, skip it
          continue;
        }
      }

      if (isFile && entry.name.endsWith(".md")) {
        const template = loadTemplateFromFile(fullPath, getSourceInfo);
        if (template) {
          templates.push(template);
        }
      }
    }
  } catch {
    // Ignore directory read errors
  }

  return templates;
}

// ============================================================================
// Path Utilities
// ============================================================================

function normalizePath(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "~") return homedir();
  if (trimmed.startsWith("~/")) return join(homedir(), trimmed.slice(2));
  if (trimmed.startsWith("~")) return join(homedir(), trimmed.slice(1));
  return trimmed;
}

function resolvePromptPath(p: string, cwd: string): string {
  const normalized = normalizePath(p);
  return isAbsolute(normalized) ? normalized : resolve(cwd, normalized);
}

function isUnderPath(target: string, root: string): boolean {
  const normalizedRoot = resolve(root);
  if (target === normalizedRoot) {
    return true;
  }
  const prefix = normalizedRoot.endsWith(sep)
    ? normalizedRoot
    : `${normalizedRoot}${sep}`;
  return target.startsWith(prefix);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Load all prompt templates from:
 * 1. Global: agentDir/prompts/
 * 2. Project: cwd/{CONFIG_DIR_NAME}/prompts/
 * 3. Explicit prompt paths
 */
export function loadPromptTemplates(
  options: LoadPromptTemplatesOptions
): PromptTemplate[] {
  const resolvedCwd = options.cwd;
  const resolvedAgentDir = options.agentDir;
  const promptPaths = options.promptPaths;
  const includeDefaults = options.includeDefaults;

  const templates: PromptTemplate[] = [];

  const globalPromptsDir = join(resolvedAgentDir, "prompts");
  const projectPromptsDir = resolve(resolvedCwd, CONFIG_DIR_NAME, "prompts");

  const getSourceInfo = (resolvedPath: string): SourceInfo => {
    if (isUnderPath(resolvedPath, globalPromptsDir)) {
      return createSyntheticSourceInfo("file", resolvedPath, {
        metadata: { source: "local", scope: "user", baseDir: globalPromptsDir },
      });
    }
    if (isUnderPath(resolvedPath, projectPromptsDir)) {
      return createSyntheticSourceInfo("file", resolvedPath, {
        metadata: {
          source: "local",
          scope: "project",
          baseDir: projectPromptsDir,
        },
      });
    }
    return createSyntheticSourceInfo("file", resolvedPath, {
      metadata: {
        baseDir: statSync(resolvedPath).isDirectory()
          ? resolvedPath
          : dirname(resolvedPath),
      },
    });
  };

  if (includeDefaults) {
    templates.push(...loadTemplatesFromDir(globalPromptsDir, getSourceInfo));
    templates.push(...loadTemplatesFromDir(projectPromptsDir, getSourceInfo));
  }

  // Load explicit prompt paths
  for (const rawPath of promptPaths) {
    const resolvedPath = resolvePromptPath(rawPath, resolvedCwd);
    if (!existsSync(resolvedPath)) {
      continue;
    }

    try {
      const stats = statSync(resolvedPath);
      if (stats.isDirectory()) {
        templates.push(...loadTemplatesFromDir(resolvedPath, getSourceInfo));
      } else if (stats.isFile() && resolvedPath.endsWith(".md")) {
        const template = loadTemplateFromFile(resolvedPath, getSourceInfo);
        if (template) {
          templates.push(template);
        }
      }
    } catch {
      // Ignore read failures
    }
  }

  return templates;
}

/**
 * Expand a prompt template if it matches a template name.
 * Returns the expanded content or the original text if not a template.
 */
export function expandPromptTemplate(
  text: string,
  templates: PromptTemplate[]
): string {
  if (!text.startsWith("/")) return text;

  const spaceIndex = text.indexOf(" ");
  const templateName = spaceIndex === -1 ? text.slice(1) : text.slice(1, spaceIndex);
  const argsString = spaceIndex === -1 ? "" : text.slice(spaceIndex + 1);

  const template = templates.find((t) => t.name === templateName);
  if (template) {
    const args = parseCommandArgs(argsString);
    return substituteArgs(template.content, args);
  }

  return text;
}