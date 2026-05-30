// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi } from 'vitest';
import { Telemetry } from './telemetry.js';

describe('Telemetry', () => {
  let telemetry: Telemetry;

  beforeEach(() => {
    telemetry = new Telemetry();
  });

  it('default disabled', () => {
    expect(telemetry.isEnabled()).toBe(false);
  });

  it('setEnabled toggles', () => {
    telemetry.setEnabled(true);
    expect(telemetry.isEnabled()).toBe(true);
    telemetry.setEnabled(false);
    expect(telemetry.isEnabled()).toBe(false);
  });

  it('track does nothing when disabled', () => {
    telemetry.track('agent.start');
    expect(telemetry['queue']).toHaveLength(0);
  });

  it('track enqueues when rate limited', () => {
    telemetry.setEnabled(true);
    telemetry['lastSent'] = Date.now(); // now, rate limited
    telemetry.track('event');
    expect(telemetry['queue']).toHaveLength(1);
  });

  it('can subscribe and receive events', () => {
    telemetry = new Telemetry({ enabled: true });
    const listener = vi.fn();
    telemetry.on(listener);

    telemetry.track('session.created');

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'session.created' })
    );
  });

  it('unsubscribe works', () => {
    telemetry = new Telemetry({ enabled: true });
    const listener = vi.fn();
    const off = telemetry.on(listener);
    off();
    telemetry.track('agent.start');
    expect(listener).not.toHaveBeenCalled();
  });
});
