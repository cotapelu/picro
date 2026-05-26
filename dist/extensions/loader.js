"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Extensions Loader - Load extensions from file system
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadExtensions = loadExtensions;
exports.loadExtension = loadExtension;
exports.loadExtensionFromFactory = loadExtensionFromFactory;
exports.discoverAndLoadExtensions = discoverAndLoadExtensions;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const runner_js_1 = require("./runner.js");
/**
 * Load extensions from paths
 */
async function loadExtensions(paths, cwd, eventBus) {
    const extensions = [];
    const errors = [];
    const runtime = (0, runner_js_1.createExtensionRuntime)();
    for (const path of paths) {
        try {
            const extension = await loadExtension(path, cwd, eventBus, runtime);
            if (extension) {
                extensions.push(extension);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push({ path, error: message });
        }
    }
    // Detect collisions across loaded extensions
    const extensionNames = new Set();
    const toolNames = new Set();
    const commandNames = new Set();
    for (const ext of extensions) {
        // Extension name collision
        if (extensionNames.has(ext.name)) {
            errors.push({ path: ext.path, error: `Duplicate extension name: ${ext.name}` });
        }
        else {
            extensionNames.add(ext.name);
        }
        // Tool name collisions
        for (const [toolName] of ext.tools) {
            if (toolNames.has(toolName)) {
                errors.push({ path: ext.path, error: `Duplicate tool name: ${toolName}` });
            }
            else {
                toolNames.add(toolName);
            }
        }
        // Command name collisions
        for (const [cmdName] of ext.commands) {
            if (commandNames.has(cmdName)) {
                errors.push({ path: ext.path, error: `Duplicate command name: ${cmdName}` });
            }
            else {
                commandNames.add(cmdName);
            }
        }
    }
    return { extensions, errors, runtime };
}
/**
 * Load a single extension
 */
async function loadExtension(path, cwd, eventBus, runtime) {
    const resolvedPath = (0, node_path_1.resolve)(cwd, path);
    if (!(0, node_fs_1.existsSync)(resolvedPath)) {
        throw new Error(`Extension path does not exist: ${resolvedPath}`);
    }
    // Check if it's a directory or file
    const stats = await Promise.resolve().then(() => __importStar(require("node:fs"))).then(fs => fs.statSync(resolvedPath));
    let extensionPath = resolvedPath;
    let extensionDir = resolvedPath;
    if (stats.isDirectory()) {
        // Look for index.js or package.json
        const indexPath = (0, node_path_1.join)(resolvedPath, "index.js");
        if ((0, node_fs_1.existsSync)(indexPath)) {
            extensionPath = indexPath;
        }
    }
    else if (resolvedPath.endsWith(".js")) {
        extensionDir = (0, node_path_1.resolve)(resolvedPath, "..");
    }
    // Load the extension module
    let module;
    try {
        // Try dynamic import
        module = await Promise.resolve(`${extensionPath}`).then(s => __importStar(require(s)));
    }
    catch (error) {
        throw new Error(`Failed to load extension: ${error instanceof Error ? error.message : String(error)}`);
    }
    // Get extension factory or handler
    const factory = module.default || module.extension || module;
    if (!factory) {
        throw new Error("Extension must export a default factory function");
    }
    // Create extension context
    const context = {
        extensionDir,
        cwd,
        api: createExtensionAPI(runtime),
        log: {
            info: (msg) => console.log(`[${path}] ${msg}`),
            warn: (msg) => console.warn(`[${path}] ${msg}`),
            error: (msg) => console.error(`[${path}] ${msg}`),
        },
    };
    // Create extension
    let extension;
    if (typeof factory === "function") {
        extension = await factory(context);
    }
    else {
        extension = factory;
    }
    return extension;
}
/**
 * Load extension from factory
 */
async function loadExtensionFromFactory(factory, cwd, eventBus, runtime, path) {
    const context = {
        extensionDir: path,
        cwd,
        api: createExtensionAPI(runtime),
        log: {
            info: (msg) => console.log(`[${path}] ${msg}`),
            warn: (msg) => console.warn(`[${path}] ${msg}`),
            error: (msg) => console.error(`[${path}] ${msg}`),
        },
    };
    return factory(context);
}
/**
 * Create extension API
 */
function createExtensionAPI(runtime) {
    return {
    // Will be populated at runtime
    };
}
/**
 * Resolve extension entry points from a directory.
 *
 * Checks for:
 * 1. package.json with "pi.extensions" field -> returns declared paths
 * 2. index.ts or index.js -> returns the index file
 *
 * Returns resolved absolute paths or null if no entry points found.
 */
function resolveExtensionEntries(dir) {
    // Check for package.json with pi field first
    const packageJsonPath = (0, node_path_1.join)(dir, "package.json");
    if ((0, node_fs_1.existsSync)(packageJsonPath)) {
        try {
            const content = (0, node_fs_1.readFileSync)(packageJsonPath, "utf-8");
            const pkg = JSON.parse(content);
            if (pkg.pi?.extensions?.length) {
                const entries = [];
                for (const extPath of pkg.pi.extensions) {
                    const resolved = (0, node_path_1.resolve)(dir, extPath);
                    if ((0, node_fs_1.existsSync)(resolved))
                        entries.push(resolved);
                }
                if (entries.length)
                    return entries;
            }
        }
        catch {
            // ignore parse errors
        }
    }
    // Check for index.ts or index.js (prefer .ts for development)
    const indexTs = (0, node_path_1.join)(dir, "index.ts");
    const indexJs = (0, node_path_1.join)(dir, "index.js");
    if ((0, node_fs_1.existsSync)(indexTs))
        return [indexTs];
    if ((0, node_fs_1.existsSync)(indexJs))
        return [indexJs];
    return null;
}
/**
 * Discover and load extensions from standard locations
 */
async function discoverAndLoadExtensions(options) {
    const paths = [];
    // Add default extension paths
    const defaultPaths = [
        (0, node_path_1.join)(options.agentDir, "extensions"),
        (0, node_path_1.join)(options.cwd, ".pi", "extensions"),
    ];
    for (const basePath of defaultPaths) {
        if (!(0, node_fs_1.existsSync)(basePath))
            continue;
        try {
            const entries = (0, node_fs_1.readdirSync)(basePath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = (0, node_path_1.join)(basePath, entry.name);
                if (entry.isDirectory()) {
                    // Resolve extension entry points from directory
                    const extEntries = resolveExtensionEntries(fullPath);
                    if (extEntries) {
                        paths.push(...extEntries);
                    }
                    else {
                        // Fall back: treat directory as extension directly
                        paths.push(fullPath);
                    }
                }
                else if ((entry.isFile() || entry.isSymbolicLink()) &&
                    (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
                    // Direct JS/TS file in extensions directory
                    paths.push(fullPath);
                }
            }
        }
        catch {
            // Ignore errors
        }
    }
    // Add additional paths
    if (options.additionalPaths) {
        for (const additionalPath of options.additionalPaths) {
            const resolvedPath = (0, node_path_1.resolve)(options.cwd, additionalPath);
            if ((0, node_fs_1.existsSync)(resolvedPath)) {
                const stats = (0, node_fs_1.statSync)(resolvedPath);
                if (stats.isDirectory()) {
                    const extEntries = resolveExtensionEntries(resolvedPath);
                    if (extEntries) {
                        paths.push(...extEntries);
                    }
                    else {
                        // Discover individual .js/.ts files in directory
                        try {
                            const files = (0, node_fs_1.readdirSync)(resolvedPath, { withFileTypes: true });
                            for (const file of files) {
                                if ((file.isFile() || file.isSymbolicLink()) &&
                                    (file.name.endsWith('.js') || file.name.endsWith('.ts'))) {
                                    paths.push((0, node_path_1.join)(resolvedPath, file.name));
                                }
                            }
                        }
                        catch {
                            // ignore
                        }
                    }
                }
                else if (stats.isFile() &&
                    (resolvedPath.endsWith('.js') || resolvedPath.endsWith('.ts'))) {
                    paths.push(resolvedPath);
                }
            }
        }
    }
    return loadExtensions(paths, options.cwd, options.eventBus);
}
//# sourceMappingURL=loader.js.map