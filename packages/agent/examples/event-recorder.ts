// Event Recorder Example
//
// Demonstrates how to record agent events and replay them for debugging.

import { EventRecorder } from '@picro/agent';
import type { AgentEvent } from '@picro/agent';

// Create a recorder with a max of 500 events
const recorder = new EventRecorder({ maxEvents: 500 });

// Record some dummy events
recorder.record({ type: 'agent:start', timestamp: Date.now(), round: 1, initialPrompt: 'test' });
recorder.record({ type: 'turn:start', timestamp: Date.now(), round: 1, promptLength: 10 });
recorder.record({ type: 'agent:end', timestamp: Date.now(), messages: [], success: true });

console.log('Recorded', recorder.count, 'events');

// Replay events to a mock emitter
const mockEmitter = {
  async emit(e: AgentEvent) {
    console.log('Replayed event:', e.type);
  },
};

await recorder.replay(mockEmitter);

// Save to file and load back
recorder.save('./events.json');
const loaded = EventRecorder.load('./events.json');
console.log('Loaded', loaded.count, 'events from file');
