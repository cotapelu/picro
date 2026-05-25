/**
 * Extensions Loader - Load extensions from file system
 */
import type { Extension, ExtensionFactory, ExtensionRuntime } from "./types.js";
import type { LoadExtensionsResult } from "./types.js";
/**
 * Load extensions from paths
 */
export declare function loadExtensions(paths: string[], cwd: string, eventBus?: any): Promise<LoadExtensionsResult>;
/**
 * Load a single extension
 */
export declare function loadExtension(path: string, cwd: string, eventBus: any, runtime: ExtensionRuntime): Promise<Extension | null>;
/**
 * Load extension from factory
 */
export declare function loadExtensionFromFactory(factory: ExtensionFactory, cwd: string, eventBus: any, runtime: ExtensionRuntime, path: string): Promise<Extension>;
/**
 * Discover and load extensions from standard locations
 */
export declare function discoverAndLoadExtensions(options: {
    cwd: string;
    agentDir: string;
    additionalPaths?: string[];
    eventBus?: any;
}): Promise<LoadExtensionsResult>;
//# sourceMappingURL=loader.d.ts.map