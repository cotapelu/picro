// SPDX-License-Identifier: Apache-2.0
/**
 * Extensions Loader - Load extensions from file system
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Extension, ExtensionFactory, ExtensionContext, ExtensionRuntime } from "./types.js";
import type { LoadExtensionsResult } from "./types.js";
import { createExtensionRuntime } from "./runner.js";

/**
 * Load extensions from paths
 */
export async function loadExtensions(
  paths: string[],
  cwd: string,
  eventBus?: any
): Promise<LoadExtensionsResult> {
  const extensions: Extension[] = [];
  const errors: Array<{ path: string; error: string }> = [];
  const runtime = createExtensionRuntime();
  
  for (const path of paths) {
    try {
      const extension = await loadExtension(path, cwd, eventBus, runtime);
      if (extension) {
        extensions.push(extension);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ path, error: message });
    }
  }

  // Detect collisions across loaded extensions
  const extensionNames = new Set<string>();
  const toolNames = new Set<string>();
  const commandNames = new Set<string>();

  for (const ext of extensions) {
    // Extension name collision
    if (extensionNames.has(ext.name)) {
      errors.push({ path: ext.path, error: `Duplicate extension name: ${ext.name}` });
    } else {
      extensionNames.add(ext.name);
    }

    // Tool name collisions
    for (const [toolName] of ext.tools) {
      if (toolNames.has(toolName)) {
        errors.push({ path: ext.path, error: `Duplicate tool name: ${toolName}` });
      } else {
        toolNames.add(toolName);
      }
    }

    // Command name collisions
    for (const [cmdName] of ext.commands) {
      if (commandNames.has(cmdName)) {
        errors.push({ path: ext.path, error: `Duplicate command name: ${cmdName}` });
      } else {
        commandNames.add(cmdName);
      }
    }
  }

  return { extensions, errors, runtime };
}

/**
 * Load a single extension
 */
export async function loadExtension(
  path: string,
  cwd: string,
  eventBus: any,
  runtime: ExtensionRuntime
): Promise<Extension | null> {
  const resolvedPath = resolve(cwd, path);
  
  if (!existsSync(resolvedPath)) {
    throw new Error(`Extension path does not exist: ${resolvedPath}`);
  }
  
  // Check if it's a directory or file
  const stats = await import("node:fs").then(fs => fs.statSync(resolvedPath));
  
  let extensionPath = resolvedPath;
  let extensionDir = resolvedPath;
  
  if (stats.isDirectory()) {
    // Look for index.js or package.json
    const indexPath = join(resolvedPath, "index.js");
    if (existsSync(indexPath)) {
      extensionPath = indexPath;
    }
  } else if (resolvedPath.endsWith(".js")) {
    extensionDir = resolve(resolvedPath, "..");
  }
  
  // Load the extension module
  let module: any;
  try {
    // Try dynamic import
    module = await import(extensionPath);
  } catch (error) {
    throw new Error(`Failed to load extension: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Get extension factory or handler
  const factory = module.default || module.extension || module;
  
  if (!factory) {
    throw new Error("Extension must export a default factory function");
  }
  
  // Create extension context
  const context: ExtensionContext = {
    extensionDir,
    cwd,
    api: createExtensionAPI(runtime),
    log: {
      info: (msg: string) => console.log(`[${path}] ${msg}`),
      warn: (msg: string) => console.warn(`[${path}] ${msg}`),
      error: (msg: string) => console.error(`[${path}] ${msg}`),
    },
  };
  
  // Create extension
  let extension: Extension;
  if (typeof factory === "function") {
    extension = await factory(context);
  } else {
    extension = factory;
  }
  
  return extension;
}

/**
 * Load extension from factory
 */
export async function loadExtensionFromFactory(
  factory: ExtensionFactory,
  cwd: string,
  eventBus: any,
  runtime: ExtensionRuntime,
  path: string
): Promise<Extension> {
  const context: ExtensionContext = {
    extensionDir: path,
    cwd,
    api: createExtensionAPI(runtime),
    log: {
      info: (msg: string) => console.log(`[${path}] ${msg}`),
      warn: (msg: string) => console.warn(`[${path}] ${msg}`),
      error: (msg: string) => console.error(`[${path}] ${msg}`),
    },
  };
  
  return factory(context);
}

/**
 * Create extension API
 */
function createExtensionAPI(runtime: ExtensionRuntime): any {
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
function resolveExtensionEntries(dir: string): string[] | null {
  // Check for package.json with pi field first
  const packageJsonPath = join(dir, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const content = readFileSync(packageJsonPath, "utf-8");
      const pkg = JSON.parse(content);
      if (pkg.pi?.extensions?.length) {
        const entries: string[] = [];
        for (const extPath of pkg.pi.extensions) {
          const resolved = resolve(dir, extPath);
          if (existsSync(resolved)) entries.push(resolved);
        }
        if (entries.length) return entries;
      }
    } catch {
      // ignore parse errors
    }
  }

  // Check for index.ts or index.js (prefer .ts for development)
  const indexTs = join(dir, "index.ts");
  const indexJs = join(dir, "index.js");
  if (existsSync(indexTs)) return [indexTs];
  if (existsSync(indexJs)) return [indexJs];
  return null;
}

/**
 * Discover and load extensions from standard locations
 */
export async function discoverAndLoadExtensions(options: {
  cwd: string;
  agentDir: string;
  additionalPaths?: string[];
  eventBus?: any;
}): Promise<LoadExtensionsResult> {
  const paths: string[] = [];
  
  // Add default extension paths
  const defaultPaths = [
    join(options.agentDir, "extensions"),
    join(options.cwd, ".pi", "extensions"),
  ];
  
  for (const basePath of defaultPaths) {
    if (!existsSync(basePath)) continue;
    try {
      const entries = readdirSync(basePath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(basePath, entry.name);
        if (entry.isDirectory()) {
          // Resolve extension entry points from directory
          const extEntries = resolveExtensionEntries(fullPath);
          if (extEntries) {
            paths.push(...extEntries);
          } else {
            // Fall back: treat directory as extension directly
            paths.push(fullPath);
          }
        } else if ((entry.isFile() || entry.isSymbolicLink()) && 
                   (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
          // Direct JS/TS file in extensions directory
          paths.push(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }
  }
  
  // Add additional paths
  if (options.additionalPaths) {
    for (const additionalPath of options.additionalPaths) {
      const resolvedPath = resolve(options.cwd, additionalPath);
      if (existsSync(resolvedPath)) {
        const stats = statSync(resolvedPath);
        if (stats.isDirectory()) {
          const extEntries = resolveExtensionEntries(resolvedPath);
          if (extEntries) {
            paths.push(...extEntries);
          } else {
            // Discover individual .js/.ts files in directory
            try {
              const files = readdirSync(resolvedPath, { withFileTypes: true });
              for (const file of files) {
                if ((file.isFile() || file.isSymbolicLink()) && 
                    (file.name.endsWith('.js') || file.name.endsWith('.ts'))) {
                  paths.push(join(resolvedPath, file.name));
                }
              }
            } catch {
              // ignore
            }
          }
        } else if (stats.isFile() && 
                   (resolvedPath.endsWith('.js') || resolvedPath.endsWith('.ts'))) {
          paths.push(resolvedPath);
        }
      }
    }
  }
  
  return loadExtensions(paths, options.cwd, options.eventBus);
}