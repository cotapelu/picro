/*
 * Coding Agent - Index
 * Main exports
 */

/* Export configs */
export { ConfigManager } from './config/config.js';
export type { ProviderConfig } from './config/provider-config.js';

/* Export memory adapter */
export { createMemoryStoreAdapter } from './memory-store-adapter.js';

/* Export plugin system */
export * from './plugins/index.js';