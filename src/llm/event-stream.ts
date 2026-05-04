/**
 * Simple event stream implementation
 */

import type { AssistantMessageEvent, AssistantMessage } from './types';

export class AssistantMessageEventStream implements AsyncIterable<AssistantMessageEvent> {
  private queue: AssistantMessageEvent[] = [];
  private waiting: ((value: IteratorResult<AssistantMessageEvent>) => void)[] = [];
  private done = false;
  private resolveFinal!: (result: AssistantMessage) => void;
  private readonly resultPromise: Promise<AssistantMessage>;

  constructor() {
    this.resultPromise = new Promise<AssistantMessage>((resolve) => {
      this.resolveFinal = resolve;
    });
  }

  push(event: AssistantMessageEvent): void {
    if (this.done) return;

    if (event.type === 'done' || event.type === 'error') {
      this.done = true;
      const result = event.type === 'done' ? (event as any).message! : (event as any).error!;
      this.resolveFinal(result);
    }

    const waiter = this.waiting.shift();
    if (waiter) {
      waiter({ value: event, done: false });
    } else {
      this.queue.push(event);
    }
  }

  end(result?: AssistantMessage): void {
    this.done = true;
    if (result !== undefined) {
      this.resolveFinal(result);
    }
    while (this.waiting.length > 0) {
      const waiter = this.waiting.shift()!;
      waiter({ value: undefined as any, done: true });
    }
  }

  result(): Promise<AssistantMessage> {
    return this.resultPromise;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<AssistantMessageEvent> {
    while (true) {
      if (this.queue.length > 0) {
        yield this.queue.shift()!;
      } else if (this.done) {
        return;
      } else {
        const result = await new Promise<IteratorResult<AssistantMessageEvent>>((resolve) => {
          this.waiting.push(resolve);
        });
        if (result.done) return;
        yield result.value;
      }
    }
  }
}
