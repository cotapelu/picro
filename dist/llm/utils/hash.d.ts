/**
 * Content Hashing for Caching & Deduplication
 *
 * Provides fast, deterministic hashes for:
 * - Cache key generation
 * - Request deduplication
 * - Content-based identification
 */
/**
 * Simple string hash (djb2 variant)
 * Fast, good enough for caching
 */
export declare function simpleHash(content: string): string;
/**
 * SHA-256 hash (async, uses Web Crypto API)
 * More robust for distributed caching
 */
export declare function sha256(content: string): Promise<string>;
/**
 * Generate cache key from multiple components
 */
export declare function cacheKey(...parts: (string | number | boolean | undefined | null)[]): string;
/**
 * Hash messages array for deduplication
 * Groups consecutive messages by role into canonical string
 */
export declare function hashMessages(messages: any[]): string;
/**
 * Generate request fingerprint (model + messages + options)
 */
export declare function requestFingerprint(modelId: string, messages: any[], options?: Record<string, any>): string;
//# sourceMappingURL=hash.d.ts.map