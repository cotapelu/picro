"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Prompt Templates - Load and expand prompt templates from markdown files
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Template argument substitution ($1, $2, $@, $ARGUMENTS)
 * - Frontmatter parsing
 * - Directory scanning
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCommandArgs = parseCommandArgs;
exports.substituteArgs = substituteArgs;
exports.loadPromptTemplates = loadPromptTemplates;
exports.expandPromptTemplate = expandPromptTemplate;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const source_info_js_1 = require("./source-info.js");
// ============================================================================
// Constants
// ============================================================================
const CONFIG_DIR_NAME = ".pi";
// ============================================================================
// Frontmatter Parsing
// ============================================================================
/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
        return { frontmatter: {}, content };
    }
    const frontmatterBlock = match[1];
    const body = match[2];
    const frontmatter = {};
    for (const line of frontmatterBlock.split("\n")) {
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1)
            continue;
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        frontmatter[key] = value;
    }
    return { frontmatter: frontmatter, content: body };
}
// ============================================================================
// Argument Parsing
// ============================================================================
/**
 * Parse command arguments respecting quoted strings (bash-style)
 * Returns array of arguments
 */
function parseCommandArgs(argsString) {
    const args = [];
    let current = "";
    let inQuote = null;
    for (let i = 0; i < argsString.length; i++) {
        const char = argsString[i];
        if (inQuote) {
            if (char === inQuote) {
                inQuote = null;
            }
            else {
                current += char;
            }
        }
        else if (char === '"' || char === "'") {
            inQuote = char;
        }
        else if (char === " " || char === "\t") {
            if (current) {
                args.push(current);
                current = "";
            }
        }
        else {
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
function substituteArgs(content, args) {
    let result = content;
    // Replace $1, $2, etc. with positional args FIRST (before wildcards)
    result = result.replace(/\$(\d+)/g, (_, num) => {
        const index = parseInt(num, 10) - 1;
        return args[index] ?? "";
    });
    // Replace ${@:start} or ${@:start:length} with sliced args (bash-style)
    result = result.replace(/\$\{@:(\d+)(?::(\d+))?\}/g, (_, startStr, lengthStr) => {
        let start = parseInt(startStr, 10) - 1;
        if (start < 0)
            start = 0;
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
function loadTemplateFromFile(filePath, getSourceInfo) {
    try {
        const rawContent = (0, node_fs_1.readFileSync)(filePath, "utf-8");
        const { frontmatter, content: body } = parseFrontmatter(rawContent);
        const name = (0, node_path_1.basename)(filePath).replace(/\.md$/, "");
        // Get description from frontmatter or first non-empty line
        let description = frontmatter.description || "";
        if (!description) {
            const firstLine = body.split("\n").find((line) => line.trim());
            if (firstLine) {
                description = firstLine.slice(0, 60);
                if (firstLine.length > 60)
                    description += "...";
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
    }
    catch {
        return null;
    }
}
/**
 * Scan a directory for .md files (non-recursive) and load them as prompt templates
 */
function loadTemplatesFromDir(dir, getSourceInfo) {
    const templates = [];
    if (!(0, node_fs_1.existsSync)(dir)) {
        return templates;
    }
    try {
        const entries = (0, node_fs_1.readdirSync)(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = (0, node_path_1.join)(dir, entry.name);
            // For symlinks, check if they point to a file
            let isFile = entry.isFile();
            if (entry.isSymbolicLink()) {
                try {
                    const stats = (0, node_fs_1.statSync)(fullPath);
                    isFile = stats.isFile();
                }
                catch {
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
    }
    catch {
        // Ignore directory read errors
    }
    return templates;
}
// ============================================================================
// Path Utilities
// ============================================================================
function normalizePath(input) {
    const trimmed = input.trim();
    if (trimmed === "~")
        return (0, node_os_1.homedir)();
    if (trimmed.startsWith("~/"))
        return (0, node_path_1.join)((0, node_os_1.homedir)(), trimmed.slice(2));
    if (trimmed.startsWith("~"))
        return (0, node_path_1.join)((0, node_os_1.homedir)(), trimmed.slice(1));
    return trimmed;
}
function resolvePromptPath(p, cwd) {
    const normalized = normalizePath(p);
    return (0, node_path_1.isAbsolute)(normalized) ? normalized : (0, node_path_1.resolve)(cwd, normalized);
}
function isUnderPath(target, root) {
    const normalizedRoot = (0, node_path_1.resolve)(root);
    if (target === normalizedRoot) {
        return true;
    }
    const prefix = normalizedRoot.endsWith(node_path_1.sep)
        ? normalizedRoot
        : `${normalizedRoot}${node_path_1.sep}`;
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
function loadPromptTemplates(options) {
    const resolvedCwd = options.cwd;
    const resolvedAgentDir = options.agentDir;
    const promptPaths = options.promptPaths;
    const includeDefaults = options.includeDefaults;
    const templates = [];
    const globalPromptsDir = (0, node_path_1.join)(resolvedAgentDir, "prompts");
    const projectPromptsDir = (0, node_path_1.resolve)(resolvedCwd, CONFIG_DIR_NAME, "prompts");
    const getSourceInfo = (resolvedPath) => {
        if (isUnderPath(resolvedPath, globalPromptsDir)) {
            return (0, source_info_js_1.createSyntheticSourceInfo)("file", resolvedPath, {
                metadata: { source: "local", scope: "user", baseDir: globalPromptsDir },
            });
        }
        if (isUnderPath(resolvedPath, projectPromptsDir)) {
            return (0, source_info_js_1.createSyntheticSourceInfo)("file", resolvedPath, {
                metadata: {
                    source: "local",
                    scope: "project",
                    baseDir: projectPromptsDir,
                },
            });
        }
        return (0, source_info_js_1.createSyntheticSourceInfo)("file", resolvedPath, {
            metadata: {
                baseDir: (0, node_fs_1.statSync)(resolvedPath).isDirectory()
                    ? resolvedPath
                    : (0, node_path_1.dirname)(resolvedPath),
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
        if (!(0, node_fs_1.existsSync)(resolvedPath)) {
            continue;
        }
        try {
            const stats = (0, node_fs_1.statSync)(resolvedPath);
            if (stats.isDirectory()) {
                templates.push(...loadTemplatesFromDir(resolvedPath, getSourceInfo));
            }
            else if (stats.isFile() && resolvedPath.endsWith(".md")) {
                const template = loadTemplateFromFile(resolvedPath, getSourceInfo);
                if (template) {
                    templates.push(template);
                }
            }
        }
        catch {
            // Ignore read failures
        }
    }
    return templates;
}
/**
 * Expand a prompt template if it matches a template name.
 * Returns the expanded content or the original text if not a template.
 */
function expandPromptTemplate(text, templates) {
    if (!text.startsWith("/"))
        return text;
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
//# sourceMappingURL=prompt-templates.js.map