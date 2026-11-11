// StateManager - Simple state container for interactive UI
import type { InteractiveState } from './types.js';

export interface StateChange<T> {
  previous: T;
  current: T;
  property: string;
}

export class StateManager {
  private state: InteractiveState;
  private subscribers: Map<string, Set<(change: StateChange<unknown>) => void>> = new Map();

  constructor(initialState: InteractiveState) {
    this.state = initialState;
  }

  /**
   * Get current state
   */
  get(): InteractiveState {
    return { ...this.state };
  }

  /**
   * Get specific property
   */
  getProperty<K extends keyof InteractiveState>(key: K): InteractiveState[K] {
    return this.state[key];
  }

  /**
   * Set entire state (use sparingly)
   */
  set(newState: Partial<InteractiveState>): void {
    const oldState = this.state;
    this.state = { ...this.state, ...newState };

    // Notify subscribers for changed properties
    for (const key of Object.keys(newState) as (keyof InteractiveState)[]) {
      this.notifySubscribers(key, oldState[key], this.state[key]);
    }
  }

  /**
   * Update a specific property
   */
  update<K extends keyof InteractiveState>(
    key: K,
    value: InteractiveState[K] | ((prev: InteractiveState[K]) => InteractiveState[K])
  ): void {
    const oldValue = this.state[key];
    const newValue = typeof value === 'function' ? (value as Function)(oldValue) : value;

    if (oldValue !== newValue) {
      this.state[key] = newValue;
      this.notifySubscribers(key, oldValue, newValue);
    }
  }

  /**
   * Subscribe to changes on a specific property
   */
  subscribe<K extends keyof InteractiveState>(
    key: K,
    callback: (change: StateChange<InteractiveState[K]>) => void
  ): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback as any);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(key)?.delete(callback as any);
    };
  }

  /**
   * Subscribe to any state change
   */
  subscribeAll(callback: (changes: StateChange<string>[]) => void): () => void {
    const allChanges: StateChange<string>[] = [];

    const wrappedCallback = (prop: string, prev: any, curr: any) => {
      allChanges.push({ previous: prev, current: curr, property: prop });
      callback(allChanges);
      allChanges.length = 0;
    };

    // Subscribe to all keys
    const unsubscribes: (() => void)[] = [];
    for (const key of Object.keys(this.state) as (keyof InteractiveState)[]) {
      const handler = (change: any) => wrappedCallback(change.property, change.previous, change.current);
      unsubscribes.push(this.subscribe(key, handler));
    }

    return () => {
      for (const unsub of unsubscribes) {
        unsub();
      }
    };
  }

  private notifySubscribers<K extends keyof InteractiveState>(
    key: K,
    previous: InteractiveState[K],
    current: InteractiveState[K]
  ): void {
    const subs = this.subscribers.get(key);
    if (subs) {
      const change = { previous, current, property: key as string };
      for (const sub of subs) {
        try {
          sub(change as any);
        } catch (err) {
          console.error(`State subscriber error for ${String(key)}:`, err);
        }
      }
    }
  }
}

/**
 * Create initial state
 */
export function createInitialState(): InteractiveState {
  return {
    toasts: [],
    modal: { type: 'none' },
    input: {
      value: '',
      placeholder: 'Enter your message...',
      history: [],
      historyIndex: -1,
      disabled: false,
    },
    messages: [],
    statusBar: {
      left: 'Ready',
      right: 'picro',
    },
    isProcessing: false,
    cwd: process.cwd(),
  };
}
