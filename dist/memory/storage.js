/**
 * Storage Layer
 * Memory persistence with JSON file storage
 */
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
export class MemoryStore {
    data = [];
    dbPath;
    constructor(dbPath = "memory.json") {
        this.dbPath = dbPath;
        // Don't load in constructor - use init() for async loading
        this.data = [];
    }
    async init() {
        await this.load();
    }
    async load() {
        try {
            const fileBuffer = await fs.readFile(this.dbPath);
            const isGzipped = fileBuffer.length >= 2 && fileBuffer[0] === 0x1f && fileBuffer[1] === 0x8b;
            let jsonStr;
            if (isGzipped) {
                jsonStr = zlib.gunzipSync(fileBuffer).toString('utf-8');
            }
            else {
                jsonStr = fileBuffer.toString('utf-8');
            }
            this.data = JSON.parse(jsonStr);
            if (!isGzipped && this.data.length > 0) {
                await this.save();
            }
        }
        catch (e) {
            if (e.code !== 'ENOENT') {
                console.warn('Failed to load memory store:', e.message);
            }
            this.data = [];
        }
    }
    async save() {
        const json = JSON.stringify(this.data, null, 2);
        const compressed = zlib.gzipSync(json);
        await fs.writeFile(this.dbPath, compressed);
    }
    async clear() {
        this.data = [];
        await this.save();
    }
    async addMemory(id, content, embedding, metadata) {
        const now = new Date().toISOString();
        const mem = {
            id,
            content,
            metadata: metadata || {},
            created_at: now,
            updated_at: now,
            access_count: 0,
        };
        const idx = this.data.findIndex(m => m.id === id);
        if (idx >= 0) {
            this.data[idx] = mem;
        }
        else {
            this.data.push(mem);
        }
        await this.save();
    }
    async updateMemory(id, content, metadata) {
        const idx = this.data.findIndex(m => m.id === id);
        if (idx === -1)
            return;
        if (content !== undefined)
            this.data[idx].content = content;
        if (metadata !== undefined)
            this.data[idx].metadata = { ...this.data[idx].metadata, ...metadata };
        this.data[idx].updated_at = new Date().toISOString();
        this.data[idx].access_count++;
        await this.save();
    }
    async deleteMemory(id) {
        this.data = this.data.filter(m => m.id !== id);
        await this.save();
    }
    getAllMemories() {
        return this.data;
    }
    getMemoryCount() {
        return this.data.length;
    }
    getMemory(id) {
        return this.data.find(m => m.id === id);
    }
    getMemoryByHash(hash) {
        return this.data.find(m => m.metadata?.hash === hash);
    }
}
// ---------------------------------------------------------------------------
// Crypto
// ---------------------------------------------------------------------------
export function memoryHash(content, metadata = {}) {
    return crypto.createHash('sha256')
        .update(content + JSON.stringify(metadata))
        .digest('hex').slice(0, 12);
}
export function generateId() {
    return crypto.randomBytes(4).toString('hex');
}
export class MemoryStorage {
    _store;
    maxMemories;
    constructor(config) {
        this._store = config.store;
        this.maxMemories = config.maxMemories || 100;
    }
    getStore() {
        return this._store;
    }
    async add(content, action, project, metadata) {
        const fullMetadata = {
            action,
            project,
            ...metadata,
        };
        const hash = memoryHash(content, fullMetadata);
        const fullContent = `[${action.toUpperCase()}] ${content}`;
        // Check for duplicate (same content + metadata) using hash
        const existing = this._store.getMemoryByHash(hash);
        if (existing) {
            // Update access count and timestamp to keep memory fresh
            await this._store.updateMemory(existing.id, undefined, undefined);
            return existing.id;
        }
        // Create new memory
        const memId = crypto.randomBytes(4).toString('hex');
        await this._store.addMemory(memId, fullContent, undefined, {
            hash,
            version: 1,
            ...fullMetadata,
            _action: action,
            _project: project,
        });
        if (this._store.getMemoryCount() > this.maxMemories) {
            // Smart eviction: remove least accessed; if tied, remove oldest
            const all = this._store.getAllMemories();
            all.sort((a, b) => {
                const countDiff = (a.access_count || 0) - (b.access_count || 0);
                if (countDiff !== 0)
                    return countDiff;
                // Tie: evict older (earlier created)
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });
            if (all[0])
                await this._store.deleteMemory(all[0].id);
        }
        return memId;
    }
    getAll() {
        return this._store.getAllMemories();
    }
    get(id) {
        return this._store.getMemory(id);
    }
    async delete(id) {
        await this._store.deleteMemory(id);
    }
    async update(id, content, metadata) {
        const mem = this._store.getMemory(id);
        if (!mem)
            return;
        const newContent = content || mem.content;
        const newMetadata = { ...mem.metadata, ...metadata, version: (mem.metadata?.version || 0) + 1 };
        const newHash = memoryHash(newContent, newMetadata);
        await this._store.updateMemory(id, newContent, { ...newMetadata, hash: newHash });
    }
    count() {
        return this._store.getMemoryCount();
    }
    async clear() {
        await this._store.clear();
    }
    getBy(predicate) {
        return this._store.getAllMemories().filter(predicate);
    }
    getRecent(limit = 10) {
        return this._store.getAllMemories().slice(-limit);
    }
}
//# sourceMappingURL=storage.js.map