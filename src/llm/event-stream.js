/**
 * Simple event stream implementation
 */
export class AssistantMessageEventStream {
    queue = [];
    waiting = [];
    done = false;
    resolveFinal;
    resultPromise;
    constructor() {
        this.resultPromise = new Promise((resolve) => {
            this.resolveFinal = resolve;
        });
    }
    push(event) {
        if (this.done)
            return;
        if (event.type === 'done' || event.type === 'error') {
            this.done = true;
            const result = event.type === 'done' ? event.message : event.error;
            this.resolveFinal(result);
        }
        const waiter = this.waiting.shift();
        if (waiter) {
            waiter({ value: event, done: false });
        }
        else {
            this.queue.push(event);
        }
    }
    end(result) {
        this.done = true;
        if (result !== undefined) {
            this.resolveFinal(result);
        }
        while (this.waiting.length > 0) {
            const waiter = this.waiting.shift();
            waiter({ value: undefined, done: true });
        }
    }
    result() {
        return this.resultPromise;
    }
    async *[Symbol.asyncIterator]() {
        while (true) {
            if (this.queue.length > 0) {
                yield this.queue.shift();
            }
            else if (this.done) {
                return;
            }
            else {
                const result = await new Promise((resolve) => {
                    this.waiting.push(resolve);
                });
                if (result.done)
                    return;
                yield result.value;
            }
        }
    }
}
