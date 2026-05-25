/**
 * Storage Layer
 * Memory persistence with JSON file storage
 */
import type { AgentAction, AgentMemoryMetadata } from './types.js';
export interface Memory {
    id: string;
    content: string;
    embedding?: Buffer;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
    access_count: number;
    last_accessed?: string;
}
export declare class MemoryStore {
    private data;
    private dbPath;
    constructor(dbPath?: string);
    init(): Promise<void>;
    private load;
    private save;
    clear(): Promise<void>;
    addMemory(id: string, content: string, embedding?: Buffer, metadata?: Record<string, any>): Promise<void>;
    updateMemory(id: string, content?: string, metadata?: Record<string, any>): Promise<void>;
    deleteMemory(id: string): Promise<void>;
    getAllMemories(): Memory[];
    getMemoryCount(): number;
    getMemory(id: string): Memory | undefined;
    getMemoryByHash(hash: string): Memory | undefined;
}
export declare function memoryHash(content: string, metadata?: Record<string, any>): string;
export declare function generateId(): string;
export interface StorageConfig {
    store: MemoryStore;
    maxMemories?: number;
}
export declare class MemoryStorage {
    private _store;
    private maxMemories;
    constructor(config: StorageConfig);
    getStore(): MemoryStore;
    add(content: string, action: AgentAction, project: string, metadata?: Partial<AgentMemoryMetadata>): Promise<string>;
    getAll(): any[];
    get(id: string): any | undefined;
    delete(id: string): Promise<void>;
    update(id: string, content?: string, metadata?: Record<string, any>): Promise<void>;
    count(): number;
    clear(): Promise<void>;
    getBy(predicate: (mem: any) => boolean): any[];
    getRecent(limit?: number): any[];
}
//# sourceMappingURL=storage.d.ts.map