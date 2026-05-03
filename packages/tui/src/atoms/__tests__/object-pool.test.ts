import { describe, it, expect } from 'vitest';
import { ObjectPool } from '../object-pool.js';

describe('ObjectPool', () => {
  it('should create new object when empty', () => {
    const pool = new ObjectPool(() => ({ value: 0 }));
    const obj = pool.acquire();
    expect(obj.value).toBe(0);
  });

  it('should release and reuse objects', () => {
    const pool = new ObjectPool(() => ({ value: 0 }));
    const obj1 = pool.acquire();
    obj1.value = 5;
    pool.release(obj1);
    const obj2 = pool.acquire();
    // Reused object retains value unless reset by factory
    expect(obj2.value).toBe(5);
  });

  it('should clear pool', () => {
    const pool = new ObjectPool(() => ({}));
    pool.acquire();
    pool.clear();
    // After clear, next acquire should create new object
    const obj = pool.acquire();
    expect(obj).toBeDefined();
  });
});
