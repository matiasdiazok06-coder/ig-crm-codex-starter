import { describe, it, expect } from 'vitest';
import { extractInstagramEvents } from '../services/webhook.js';

describe('extractInstagramEvents', () => {
  it('normalizes messaging payloads', () => {
    const payload = {
      object: 'instagram',
      entry: [
        {
          id: 'page',
          messaging: [
            {
              sender: { id: 'user_1' },
              recipient: { id: 'ig_1' },
              timestamp: 1710000000000,
              message: { mid: 'm1', text: 'hola' },
            },
          ],
        },
      ],
    };
    const events = extractInstagramEvents(payload);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      igUserId: 'ig_1',
      peerIgUserId: 'user_1',
      messageId: 'm1',
      text: 'hola',
    });
  });

  it('extracts messages from changes array', () => {
    const payload = {
      object: 'instagram',
      entry: [
        {
          time: 1710000001000,
          changes: [
            {
              field: 'messages',
              value: {
                from: { id: 'user_2' },
                recipient: { id: 'ig_2' },
                messages: [
                  { id: 'm2', text: 'hi', timestamp: 1710000001000 },
                  { id: 'm3', message: 'hola!', timestamp: 1710000002000 },
                ],
              },
            },
          ],
        },
      ],
    };
    const events = extractInstagramEvents(payload);
    expect(events).toHaveLength(2);
    expect(events[0].messageId).toBe('m2');
    expect(events[1].text).toBe('hola!');
  });

  it('ignores non-instagram payloads', () => {
    const events = extractInstagramEvents({ object: 'page' });
    expect(events).toEqual([]);
  });
});
