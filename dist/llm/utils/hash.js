"use strict";
/**
 * Content Hashing for Caching & Deduplication
 *
 * Provides fast, deterministic hashes for:
 * - Cache key generation
 * - Request deduplication
 * - Content-based identification
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleHash = simpleHash;
exports.sha256 = sha256;
exports.cacheKey = cacheKey;
exports.hashMessages = hashMessages;
exports.requestFingerprint = requestFingerprint;
/**
 * Simple string hash (djb2 variant)
 * Fast, good enough for caching
 */
function simpleHash(content) {
    let hash = 5381;
    for (let i = 0; i < content.length; i++) {
        hash = ((hash << 5) + hash) + content.charCodeAt(i); // hash * 33 + c
    }
    return (hash >>> 0).toString(16).padStart(8, '0'); // Unsigned 32-bit hex
}
/**
 * SHA-256 hash (async, uses Web Crypto API)
 * More robust for distributed caching
 */
async function sha256(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
/**
 * Generate cache key from multiple components
 */
function cacheKey(...parts) {
    const normalized = parts.map(p => String(p ?? '')).join(':');
    return simpleHash(normalized);
}
/**
 * Hash messages array for deduplication
 * Groups consecutive messages by role into canonical string
 */
function hashMessages(messages) {
    const canonical = messages.map(msg => {
        const role = msg.role;
        const content = typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content);
        return `${role}:${content}`;
    }).join('|');
    return simpleHash(canonical);
}
/**
 * Generate request fingerprint (model + messages + options)
 */
function requestFingerprint(modelId, messages, options) {
    const msgsHash = hashMessages(messages);
    const opts = options ? JSON.stringify(Object.keys(options).sort()) : '';
    return simpleHash(`${modelId}:${msgsHash}:${opts}`);
}
//# sourceMappingURL=hash.js.map