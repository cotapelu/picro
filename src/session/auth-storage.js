// SPDX-License-Identifier: Apache-2.0
/**
 * Auth Storage - Quản lý API keys và OAuth credentials
 * Moved from agent/ to session/ because it's session-specific.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
class FileAuthStorageBackend {
    authPath;
    constructor(authPath = join(homedir(), ".pi", "agent", "auth.json")) {
        this.authPath = authPath;
    }
    ensureParentDir() {
        const dir = dirname(this.authPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true, mode: 0o700 });
        }
    }
    ensureFileExists() {
        if (!existsSync(this.authPath)) {
            writeFileSync(this.authPath, "{}", "utf-8");
            chmodSync(this.authPath, 0o600);
        }
    }
    withLock(fn) {
        this.ensureParentDir();
        this.ensureFileExists();
        try {
            const current = existsSync(this.authPath) ? readFileSync(this.authPath, "utf-8") : undefined;
            const { result, next } = fn(current);
            if (next !== undefined) {
                writeFileSync(this.authPath, next, "utf-8");
                chmodSync(this.authPath, 0o600);
            }
            return result;
        }
        catch {
            // Return empty on error
            return fn(undefined).result;
        }
    }
}
class InMemoryAuthStorageBackend {
    value;
    withLock(fn) {
        const { result, next } = fn(this.value);
        if (next !== undefined) {
            this.value = next;
        }
        return result;
    }
}
// ============================================================================
// AuthStorage Class
// ============================================================================
export class AuthStorage {
    storage;
    data = {};
    runtimeOverrides = new Map();
    fallbackResolver;
    loadError = null;
    errors = [];
    constructor(storage) {
        this.storage = storage;
        this.reload();
    }
    static create(authPath) {
        return new AuthStorage(new FileAuthStorageBackend(authPath));
    }
    static fromStorage(storage) {
        return new AuthStorage(storage);
    }
    static inMemory(data = {}) {
        const storage = new InMemoryAuthStorageBackend();
        storage.withLock(() => ({ result: undefined, next: JSON.stringify(data, null, 2) }));
        return AuthStorage.fromStorage(storage);
    }
    setRuntimeApiKey(provider, apiKey) {
        this.runtimeOverrides.set(provider, apiKey);
    }
    removeRuntimeApiKey(provider) {
        this.runtimeOverrides.delete(provider);
    }
    setFallbackResolver(resolver) {
        this.fallbackResolver = resolver;
    }
    recordError(error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        this.errors.push(normalizedError);
    }
    parseStorageData(content) {
        if (!content)
            return {};
        try {
            return JSON.parse(content);
        }
        catch {
            return {};
        }
    }
    reload() {
        this.storage.withLock((current) => {
            this.data = this.parseStorageData(current);
            this.loadError = null;
            return { result: undefined };
        });
    }
    persistProviderChange(provider, credential) {
        if (this.loadError)
            return;
        this.storage.withLock((current) => {
            const currentData = this.parseStorageData(current);
            const merged = { ...currentData };
            if (credential) {
                merged[provider] = credential;
            }
            else {
                delete merged[provider];
            }
            return { result: undefined, next: JSON.stringify(merged, null, 2) };
        });
    }
    get(provider) {
        return this.data[provider];
    }
    set(provider, credential) {
        this.data[provider] = credential;
        this.persistProviderChange(provider, credential);
    }
    remove(provider) {
        delete this.data[provider];
        this.persistProviderChange(provider, undefined);
    }
    list() {
        return Object.keys(this.data);
    }
    has(provider) {
        return provider in this.data;
    }
    hasAuth(provider) {
        if (this.runtimeOverrides.has(provider))
            return true;
        if (this.data[provider])
            return true;
        if (this.getEnvApiKey(provider))
            return true;
        if (this.fallbackResolver?.(provider))
            return true;
        return false;
    }
    getAuthStatus(provider) {
        if (this.data[provider]) {
            return { configured: true, source: "stored" };
        }
        if (this.runtimeOverrides.has(provider)) {
            return { configured: false, source: "runtime", label: "--api-key" };
        }
        const envKey = this.getEnvApiKey(provider);
        if (envKey) {
            return { configured: false, source: "environment", label: envKey };
        }
        if (this.fallbackResolver?.(provider)) {
            return { configured: false, source: "fallback", label: "custom provider config" };
        }
        return { configured: false };
    }
    getAll() {
        return { ...this.data };
    }
    drainErrors() {
        const drained = [...this.errors];
        this.errors = [];
        return drained;
    }
    getApiKey(provider, options) {
        // Runtime override highest priority
        const runtimeKey = this.runtimeOverrides.get(provider);
        if (runtimeKey) {
            return runtimeKey;
        }
        const cred = this.data[provider];
        if (cred?.type === "api_key") {
            return cred.key;
        }
        if (cred?.type === "oauth") {
            // Check if token needs refresh
            if (Date.now() >= cred.expires) {
                // Token expired - in a real implementation, we'd refresh here
                // For now, return undefined so model discovery skips this provider
                return undefined;
            }
            return cred.accessToken;
        }
        // Fall back to environment variable
        const envKey = this.getEnvApiKey(provider);
        if (envKey)
            return envKey;
        // Fall back to custom resolver
        if (options?.includeFallback !== false) {
            return this.fallbackResolver?.(provider);
        }
        return undefined;
    }
    getEnvApiKey(provider) {
        const envVars = {
            anthropic: "ANTHROPIC_API_KEY",
            openai: "OPENAI_API_KEY",
            google: "GEMINI_API_KEY",
            groq: "GROQ_API_KEY",
            cerebras: "CEREBRAS_API_KEY",
            xai: "XAI_API_KEY",
            fireworks: "FIREWORKS_API_KEY",
            openrouter: "OPENROUTER_API_KEY",
            mistral: "MISTRAL_API_KEY",
            minimax: "MINIMAX_API_KEY",
            opencode: "OPENCODE_API_KEY",
            kimi: "KIMI_API_KEY",
            azure: "AZURE_OPENAI_API_KEY",
        };
        const envVar = envVars[provider.toLowerCase()];
        if (envVar && process.env[envVar]) {
            return process.env[envVar];
        }
        // Try generic pattern
        const genericKey = `${provider.toUpperCase()}_API_KEY`;
        if (process.env[genericKey]) {
            return process.env[genericKey];
        }
        return undefined;
    }
}
//# sourceMappingURL=auth-storage.js.map