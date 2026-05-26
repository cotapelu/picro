"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Resource Loader - Load extensions, skills, prompts, themes, context files
 *
 * This is a stub implementation - full implementation coming in Phase B
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultResourceLoader = void 0;
exports.loadProjectContextFiles = loadProjectContextFiles;
const skills_js_1 = require("./skills.js");
const prompt_templates_js_1 = require("./prompt-templates.js");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const loader_js_1 = require("../extensions/loader.js");
const runner_js_1 = require("../extensions/runner.js");
const runner_js_2 = require("../extensions/runner.js");
/**
 * Default resource loader implementation
 */
class DefaultResourceLoader {
    _cwd;
    _agentDir;
    _skillsCache;
    _promptsCache; // PromptTemplate[]
    _themesCache;
    _agentsFilesCache;
    _extensionsResult;
    _extensionRunner;
    _systemPrompt;
    _appendSystemPrompt = [];
    constructor(options) {
        this._cwd = options.cwd;
        this._agentDir = options.agentDir;
        // Store options for reload
        this._options = options;
    }
    _options;
    _initialized = false;
    async reload() {
        // Load extensions
        let extensionsResult;
        if (this._options.noExtensions) {
            extensionsResult = { extensions: [], errors: [], runtime: (0, runner_js_1.createExtensionRuntime)() };
        }
        else {
            try {
                extensionsResult = await (0, loader_js_1.discoverAndLoadExtensions)({
                    cwd: this._cwd,
                    agentDir: this._agentDir,
                    additionalPaths: this._options.additionalExtensionPaths,
                });
            }
            catch (error) {
                extensionsResult = { extensions: [], errors: [{
                            path: 'discoverAndLoadExtensions',
                            error: error instanceof Error ? error.message : String(error)
                        }], runtime: (0, runner_js_1.createExtensionRuntime)() };
            }
        }
        // Apply override if provided
        if (this._options.extensionsOverride) {
            extensionsResult = this._options.extensionsOverride(extensionsResult);
        }
        this._extensionsResult = extensionsResult;
        this._extensionRunner = new runner_js_2.ExtensionRunner(extensionsResult.runtime);
        this._extensionRunner.loadExtensions(extensionsResult);
        // Load skills
        if (this._options.noSkills) {
            this._skillsCache = [];
        }
        else {
            let skills = (0, skills_js_1.loadSkills)({
                cwd: this._cwd,
                agentDir: this._agentDir,
                skillPaths: this._options.additionalSkillPaths ?? [],
                includeDefaults: true,
            });
            if (this._options.skillsOverride) {
                const result = this._options.skillsOverride({ skills, diagnostics: [] });
                skills = result.skills;
            }
            this._skillsCache = skills;
        }
        // Load prompt templates
        if (this._options.noPromptTemplates) {
            this._promptsCache = [];
        }
        else {
            let prompts = (0, prompt_templates_js_1.loadPromptTemplates)({
                cwd: this._cwd,
                agentDir: this._agentDir,
                promptPaths: this._options.additionalPromptTemplatePaths ?? [],
                includeDefaults: true,
            });
            if (this._options.promptsOverride) {
                const result = this._options.promptsOverride({ prompts, diagnostics: [] });
                prompts = result.prompts;
            }
            this._promptsCache = prompts;
        }
        // Load themes
        if (this._options.noThemes) {
            this._themesCache = [];
        }
        else {
            let themesResult = loadThemes({
                cwd: this._cwd,
                agentDir: this._agentDir,
                themePaths: this._options.additionalThemePaths ?? [],
                includeDefaults: true,
            });
            if (this._options.themesOverride) {
                themesResult = this._options.themesOverride(themesResult);
            }
            this._themesCache = themesResult.themes;
        }
        // Load context files (AGENTS.md, CLAUDE.md)
        if (this._options.noContextFiles) {
            this._agentsFilesCache = [];
        }
        else {
            let agentsFiles = loadProjectContextFiles({ cwd: this._cwd, agentDir: this._agentDir });
            if (this._options.agentsFilesOverride) {
                agentsFiles = this._options.agentsFilesOverride(agentsFiles);
            }
            this._agentsFilesCache = agentsFiles;
        }
        // System prompt
        this._systemPrompt = this._options.systemPrompt;
        this._appendSystemPrompt = this._options.appendSystemPrompt ?? [];
        // Apply overrides
        if (this._options.systemPromptOverride) {
            this._systemPrompt = this._options.systemPromptOverride(this._systemPrompt);
        }
        if (this._options.appendSystemPromptOverride) {
            this._appendSystemPrompt = this._options.appendSystemPromptOverride(this._appendSystemPrompt);
        }
        this._initialized = true;
    }
    getExtensions() {
        if (!this._initialized) {
            // Should have been reloaded by constructor
            return { extensions: [], errors: [], runtime: { flagValues: new Map(), pendingProviderRegistrations: [] } };
        }
        return this._extensionsResult;
    }
    getSkills() {
        if (!this._initialized) {
            return { skills: [], diagnostics: [] };
        }
        return { skills: this._skillsCache ?? [], diagnostics: [] };
    }
    getPrompts() {
        if (!this._initialized) {
            return { prompts: [], diagnostics: [] };
        }
        return { prompts: this._promptsCache ?? [], diagnostics: [] };
    }
    getThemes() {
        if (!this._initialized) {
            return { themes: [], diagnostics: [] };
        }
        return { themes: this._themesCache ?? [], diagnostics: [] };
    }
    getAgentsFiles() {
        if (!this._initialized) {
            return { agentsFiles: [] };
        }
        return { agentsFiles: this._agentsFilesCache ?? [] };
    }
    getSystemPrompt() {
        return this._systemPrompt;
    }
    getAppendSystemPrompt() {
        return this._appendSystemPrompt;
    }
}
exports.DefaultResourceLoader = DefaultResourceLoader;
/**
 * Load project context files (AGENTS.md, CLAUDE.md)
 */
function loadProjectContextFiles(options) {
    const files = [];
    const pathsToCheck = [
        (0, node_path_1.join)(options.agentDir, "AGENTS.md"),
        (0, node_path_1.join)(options.agentDir, "CLAUDE.md"),
        (0, node_path_1.join)(options.cwd, ".pi", "AGENTS.md"),
        (0, node_path_1.join)(options.cwd, ".pi", "CLAUDE.md"),
    ];
    for (const path of pathsToCheck) {
        if ((0, node_fs_1.existsSync)(path)) {
            try {
                const content = (0, node_fs_1.readFileSync)(path, "utf8");
                files.push({ path, content });
            }
            catch {
                // ignore read errors
            }
        }
    }
    return files;
}
/**
 * Load themes from paths
 */
function loadThemes(options) {
    // Stub: no built-in themes yet
    return { themes: [], diagnostics: [] };
}
//# sourceMappingURL=resource-loader.js.map