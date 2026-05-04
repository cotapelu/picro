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
export function simpleHash(content: string): string {
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
export async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate cache key from multiple components
 */
export function cacheKey(...parts: (string | number | boolean | undefined | null)[]): string {
  const normalized = parts.map(p => String(p ?? '')).join(':');
  return simpleHash(normalized);
}

/**
 * Hash messages array for deduplication
 * Groups consecutive messages by role into canonical string
 */
export function hashMessages(messages: any[]): string {
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
export function requestFingerprint(
  modelId: string,
  messages: any[],
  options?: Record<string, any>
): string {
  const msgsHash = hashMessages(messages);
  const opts = options ? JSON.stringify(Object.keys(options).sort()) : '';
  return simpleHash(`${modelId}:${msgsHash}:${opts}`);
}
