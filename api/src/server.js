import { createApp } from './app.js';
import { CONFIG } from './config.js';
import { registerWorkers } from './queues/index.js';
import { handleIncomingWebhook } from './services/webhook.js';
import { prisma } from './lib/prisma.js';
import { sendInstagramMessage, persistMessage } from './services/messages.js';
import { refreshLongLivedToken } from './services/tokens.js';

const rateLimitState = new Map();
const MIN_INTERVAL_MS = 1000;

function getRateLimitKey(accountId, peerIgUserId) {
  return `${accountId}:${peerIgUserId}`;
}

async function enforceRateLimit(accountId, peerIgUserId) {
  const key = getRateLimitKey(accountId, peerIgUserId);
  const now = Date.now();
  const last = rateLimitState.get(key) || 0;
  const diff = now - last;
  if (diff < MIN_INTERVAL_MS) {
    const wait = MIN_INTERVAL_MS - diff;
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  rateLimitState.set(key, Date.now());
}

registerWorkers({
  handleWebhook: async (payload) => {
    await handleIncomingWebhook(payload);
  },
  handleSendMessage: async ({ accountId, igUserId, peerIgUserId, text }) => {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      throw new Error('Cuenta no encontrada');
    }
    await enforceRateLimit(accountId, peerIgUserId);
    const response = await sendInstagramMessage({ account, igUserId, peerIgUserId, text });
    const igMessageId = response.id || response.message_id || `out_${Date.now()}`;
    await persistMessage({
      account,
      peerIgUserId,
      direction: 'out',
      igMessageId,
      text,
      senderIgUserId: account.igUserId,
      timestamp: Date.now(),
      markAsRead: true,
    });
  },
  handleTokenRefresh: async ({ tokenId }) => {
    await refreshLongLivedToken(tokenId);
  },
});

const app = createApp();

app.listen(CONFIG.port, () => {
  console.log(`API listening on http://localhost:${CONFIG.port}`);
});
