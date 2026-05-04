/**
 * AgentMemoryApp - High-level wrapper for agents
 */

import { MemoryStore, MemoryStorage, memoryHash, generateId } from './storage';
import type { AgentAction, AgentMemoryMetadata, RetrievalResult } from './types';
import { MemoryEngine } from './engine';
import { MemoryRetriever } from './retrieval';
import { MemoryEventLog } from './events';

export class AgentMemoryApp {
  private engine: MemoryEngine;
  private initialized = false;

  constructor(store: MemoryStore, project?: string, cacheTTL?: number) {
    this.engine = new MemoryEngine({
      store,
      project: project || "default",
      topK: 10,
      maxMemories: 200,
      forgettingDays: 3,
      cacheTTL,
    });
  }

  async init(): Promise<void> {
    if (!this.initialized) {
      await this.engine.init();
      this.initialized = true;
    }
  }

  setProject(project: string): void {
    this.engine.setProject(project);
  }

  async rememberFileRead(filePath: string, summary: string): Promise<string> {
    return this.engine.add(
      `Read file: ${filePath}. Content summary: ${summary}`,
      "read_file",
      { filePath, summary }
    );
  }

  async rememberFileEdit(filePath: string, description: string): Promise<string> {
    return this.engine.add(
      `Edited file: ${filePath}. Changes: ${description}`,
      "edit_file",
      { filePath }
    );
  }

  async rememberCommand(cmd: string, output: string): Promise<string> {
    return this.engine.add(
      `Command: ${cmd}. Output: ${output}`,
      "execute_command",
      { summary: cmd }
    );
  }

  async rememberProjectInfo(info: string): Promise<string> {
    return this.engine.add(info, "project_info", {});
  }

  async rememberTaskInfo(taskId: string, info: string): Promise<string> {
    return this.engine.add(info, "task_info", { taskId });
  }

  async remember(action: AgentAction, content: string, metadata?: Partial<AgentMemoryMetadata>): Promise<string> {
    return this.engine.add(content, action, metadata);
  }

  async recall(query: string): Promise<any[]> {
    const result = await this.engine.recall(query);
    return result.memories;
  }

  async recallWithScores(query: string): Promise<RetrievalResult> {
    return await this.engine.recall(query);
  }

  // Additional methods for MemoryStore compatibility (via adapter)
  async getAll(): Promise<any[]> {
    return this.engine.getAll();
  }

  async count(): Promise<number> {
    return this.engine.count();
  }

  invalidateCache(): void {
    this.engine.invalidateCache();
  }

  getContext(): string {
    return this.engine.getContext();
  }

  getRecentActions(limit: number = 10): any[] {
    return this.engine.getRecent(limit);
  }

  async clear(): Promise<void> {
    await this.engine.clear();
  }

  async getMemoryCount(): Promise<number> {
    return this.engine.count();
  }

  getByAction(action: AgentAction): any[] {
    return this.engine.getByAction(action);
  }

  getByFile(filePath: string): any[] {
    return this.engine.getByFile(filePath);
  }

  async applyForgetting(): Promise<number> {
    return this.engine.applyForgetting();
  }

  async getStats(): Promise<Record<string, number>> {
    return this.engine.getStats();
  }

  /**
   * Get extended performance metrics including cache hit rate and avg latency
   */
  async getMetrics(): Promise<Record<string, number>> {
    return this.engine.getMetrics();
  }

  /**
   * Get retriever-specific metrics (cache hits/misses, cache size)
   */
  getRetrieverMetrics(): Record<string, number> {
    return this.engine.getRetrieverMetrics();
  }

  /**
   * Dynamically adjust cache TTL for retrieval (ms)
   */
  setCacheTTL(ttl: number): void {
    this.engine.setCacheTTL(ttl);
  }

  /**
   * Dynamically adjust topK
   */
  setTopK(topK: number): void {
    this.engine.setTopK(topK);
  }

  /** Update a memory's content and/or metadata */
  async updateMemory(id: string, content?: string, metadata?: Record<string, any>): Promise<boolean> {
    const store = this.engine.getStorage().getStore();
    const mem = store.getMemory(id);
    if (!mem) return false;
    await store.updateMemory(id, content, metadata);
    this.engine.invalidateCache();
    return true;
  }

  /** Delete a memory by id */
  async deleteMemory(id: string): Promise<boolean> {
    const store = this.engine.getStorage().getStore();
    const exists = store.getMemory(id);
    if (!exists) return false;
    await store.deleteMemory(id);
    this.engine.invalidateCache();
    return true;
  }
}

