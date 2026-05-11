// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for ObjectPool atom
 */

import { describe, it, expect } from 'vitest';
import { ObjectPool } from './object-pool';

describe('ObjectPool', () => {
  it('should create with factory', () => {
    const pool = new ObjectPool(() => ({ x: 1 }));
    expect(pool.size).toBe(0);
  });

  it('acquire should create new instance when pool empty', () => {
    const pool = new ObjectPool(() => ({ x: 1 }));
    const obj = pool.acquire();
    expect(obj).toEqual({ x: 1 });
    expect(pool.size).toBe(0);
  });

  it('release should return instance to pool', () => {
    const pool = new ObjectPool(() => ({ x: 1 }));
    const obj = pool.acquire();
    pool.release(obj);
    expect(pool.size).toBe(1);
  });

  it('acquire should reuse released instance', () => {
    const pool = new ObjectPool(() => ({ x: 1 }));
    const obj1 = pool.acquire();
    pool.release(obj1);
    const obj2 = pool.acquire();
    expect(obj2).toBe(obj1); // same reference
  });

  it('clear should empty pool', () => {
    const pool = new ObjectPool(() => ({ x: 1 }));
    const obj = pool.acquire();
    pool.release(obj);
    pool.clear();
    expect(pool.size).toBe(0);
  });
});