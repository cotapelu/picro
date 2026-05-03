/**
 * Generic Object Pool
 * Reuses objects to reduce GC pressure in high-frequency rendering scenarios.
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private readonly factory: () => T;

  constructor(factory: () => T) {
    this.factory = factory;
  }

  /** Acquire an instance from the pool or create a new one. */
  acquire(): T {
    return this.pool.pop() ?? this.factory();
  }

  /** Release an instance back to the pool for reuse. */
  release(obj: T): void {
    this.pool.push(obj);
  }

  /** Clear all pooled instances. */
  clear(): void {
    this.pool = [];
  }

  /** Number of idle objects in the pool. */
  get size(): number {
    return this.pool.length;
  }
}
