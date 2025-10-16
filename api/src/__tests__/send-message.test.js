import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/graph.js', () => ({
  graph: vi.fn(async () => ({ id: 'mid_1' })),
}));

vi.mock('../utils/crypto.js', () => ({
  decryptToken: vi.fn(() => 'decrypted-token'),
}));

import { graph } from '../lib/graph.js';
import { sendInstagramMessage } from '../services/messages.js';

const account = {
  id: 'acc_1',
  igUserId: 'ig_1',
  accessTokenEnc: 'enc',
};

describe('sendInstagramMessage', () => {
  it('calls graph with correct payload', async () => {
    const response = await sendInstagramMessage({
      account,
      igUserId: 'ig_1',
      peerIgUserId: 'user_1',
      text: 'Hola',
    });
    expect(graph).toHaveBeenCalledWith(
      '/ig_1/messages',
      {
        messaging_type: 'RESPONSE',
        recipient: { id: 'user_1' },
        message: { text: 'Hola' },
      },
      { method: 'POST', accessToken: 'decrypted-token' }
    );
    expect(response).toMatchObject({ id: 'mid_1' });
  });

  it('throws if text missing', async () => {
    await expect(
      sendInstagramMessage({ account, igUserId: 'ig_1', peerIgUserId: 'user_1', text: '' })
    ).rejects.toThrow('Text is required');
  });
});
