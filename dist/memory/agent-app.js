/**
 * AgentMemoryApp - High-level wrapper for agents
 */
import { MemoryEngine } from './engine.js';
export class AgentMemoryApp {
    engine;
    initialized = false;
    constructor(store, project, cacheTTL) {
        this.engine = new MemoryEngine({
            store,
            project: project || "default",
            topK: 10,
            maxMemories: 200,
            forgettingDays: 3,
            cacheTTL,
        });
    }
    async init() {
        if (!this.initialized) {
            await this.engine.init();
            this.initialized = true;
        }
    }
    setProject(project) {
        this.engine.setProject(project);
    }
    async rememberFileRead(filePath, summary) {
        return this.engine.add(`Read file: ${filePath}. Content summary: ${summary}`, "read_file", { filePath, summary });
    }
    async rememberFileEdit(filePath, description) {
        return this.engine.add(`Edited file: ${filePath}. Changes: ${description}`, "edit_file", { filePath });
    }
    async rememberCommand(cmd, output) {
        return this.engine.add(`Command: ${cmd}. Output: ${output}`, "execute_command", { summary: cmd });
    }
    async rememberProjectInfo(info) {
        return this.engine.add(info, "project_info", {});
    }
    async rememberTaskInfo(taskId, info) {
        return this.engine.add(info, "task_info", { taskId });
    }
    async remember(action, content, metadata) {
        return this.engine.add(content, action, metadata);
    }
    async recall(query) {
        const result = await this.engine.recall(query);
        return result.memories;
    }
    async recallWithScores(query) {
        return await this.engine.recall(query);
    }
    // Additional methods for MemoryStore compatibility (via adapter)
    async getAll() {
        return this.engine.getAll();
    }
    async count() {
        return this.engine.count();
    }
    invalidateCache() {
        this.engine.invalidateCache();
    }
    getContext() {
        return this.engine.getContext();
    }
    getRecentActions(limit = 10) {
        return this.engine.getRecent(limit);
    }
    async clear() {
        await this.engine.clear();
    }
    async getMemoryCount() {
        return this.engine.count();
    }
    getByAction(action) {
        return this.engine.getByAction(action);
    }
    getByFile(filePath) {
        return this.engine.getByFile(filePath);
    }
    async applyForgetting() {
        return this.engine.applyForgetting();
    }
    async getStats() {
        return this.engine.getStats();
    }
    /**
     * Get extended performance metrics including cache hit rate and avg latency
     */
    async getMetrics() {
        return this.engine.getMetrics();
    }
    /**
     * Get retriever-specific metrics (cache hits/misses, cache size)
     */
    getRetrieverMetrics() {
        return this.engine.getRetrieverMetrics();
    }
    /**
     * Dynamically adjust cache TTL for retrieval (ms)
     */
    setCacheTTL(ttl) {
        this.engine.setCacheTTL(ttl);
    }
    /**
     * Dynamically adjust topK
     */
    setTopK(topK) {
        this.engine.setTopK(topK);
    }
    /** Update a memory's content and/or metadata */
    async updateMemory(id, content, metadata) {
        const store = this.engine.getStorage().getStore();
        const mem = store.getMemory(id);
        if (!mem)
            return false;
        await store.updateMemory(id, content, metadata);
        this.engine.invalidateCache();
        return true;
    }
    /** Delete a memory by id */
    async deleteMemory(id) {
        const store = this.engine.getStorage().getStore();
        const exists = store.getMemory(id);
        if (!exists)
            return false;
        await store.deleteMemory(id);
        this.engine.invalidateCache();
        return true;
    }
}
//# sourceMappingURL=agent-app.js.map