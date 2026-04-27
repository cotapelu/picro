// SPDX-License-Identifier: Apache-2.0
/**
 * Extensions Loader - Load extensions from file system
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
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
  
  for (const path of defaultPaths) {
    if (existsSync(path)) {
      try {
        const entries = readdirSync(path, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            paths.push(join(path, entry.name));
          }
        }
      } catch {
        // Ignore errors
      }
    }
  }
  
  // Add additional paths
  if (options.additionalPaths) {
    paths.push(...options.additionalPaths);
  }
  
  return loadExtensions(paths, options.cwd, options.eventBus);
}