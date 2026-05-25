/**
 * Auth Storage - Quản lý API keys và OAuth credentials
 * Moved from agent/ to session/ because it's session-specific.
 */
export interface OAuthCredentials {
    accessToken: string;
    refreshToken: string;
    expires: number;
    expiresAt?: number;
}
export type ApiKeyCredential = {
    type: "api_key";
    key: string;
};
export type OAuthCredential = {
    type: "oauth";
} & OAuthCredentials;
export type AuthCredential = ApiKeyCredential | OAuthCredential;
export type AuthStorageData = Record<string, AuthCredential>;
export type AuthStatus = {
    configured: boolean;
    source?: "stored" | "runtime" | "environment" | "fallback";
    label?: string;
};
export interface AuthStorageBackend {
    withLock<T>(fn: (current: string | undefined) => {
        result: T;
        next?: string;
    }): T;
}
export declare class AuthStorage {
    private storage;
    private data;
    private runtimeOverrides;
    private fallbackResolver?;
    private loadError;
    private errors;
    private constructor();
    static create(authPath?: string): AuthStorage;
    static fromStorage(storage: AuthStorageBackend): AuthStorage;
    static inMemory(data?: AuthStorageData): AuthStorage;
    setRuntimeApiKey(provider: string, apiKey: string): void;
    removeRuntimeApiKey(provider: string): void;
    setFallbackResolver(resolver: (provider: string) => string | undefined): void;
    private recordError;
    private parseStorageData;
    reload(): void;
    private persistProviderChange;
    get(provider: string): AuthCredential | undefined;
    set(provider: string, credential: AuthCredential): void;
    remove(provider: string): void;
    list(): string[];
    has(provider: string): boolean;
    hasAuth(provider: string): boolean;
    getAuthStatus(provider: string): AuthStatus;
    getAll(): AuthStorageData;
    drainErrors(): Error[];
    getApiKey(provider: string, options?: {
        includeFallback?: boolean;
    }): string | undefined;
    private getEnvApiKey;
}
//# sourceMappingURL=auth-storage.d.ts.map