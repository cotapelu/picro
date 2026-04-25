/**
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

/* Export performance monitoring */
export * from './performance/index.js';

/* Export budget management */
export * from './budget/index.js';

/* Export file watching */
export * from './watch/index.js';

/* Export conversation branching */
export * from './branch/index.js';
